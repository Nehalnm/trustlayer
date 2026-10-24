-- Additive: no existing payment, assignment, or dispute is changed.
alter table public.projects add column freelancer_id uuid references auth.users(id);
alter table public.projects add constraint project_distinct_participants check (freelancer_id is null or (created_by is not null and freelancer_id <> created_by));
create index projects_freelancer_id_idx on public.projects(freelancer_id) where freelancer_id is not null;
alter table public.disputes add column operation_lock_at timestamptz;
alter table public.disputes add column proposed_by uuid references auth.users(id);
alter table public.disputes add column proposed_resolution text;
alter table public.disputes add column accepted_by uuid references auth.users(id);

-- Owner policies remain. Browser write grants stay revoked.
create policy freelancer_projects on public.projects for select to authenticated using (freelancer_id = (select auth.uid()));
create policy freelancer_milestones on public.milestones for select to authenticated using (exists(select 1 from public.projects p where p.id=milestones.project_id and p.freelancer_id=(select auth.uid())));
create policy freelancer_submissions on public.submissions for select to authenticated using (exists(select 1 from public.milestones m join public.projects p on p.id=m.project_id where m.id=submissions.milestone_id and p.freelancer_id=(select auth.uid())));
create policy freelancer_evaluations on public.ai_evaluations for select to authenticated using (exists(select 1 from public.submissions s join public.milestones m on m.id=s.milestone_id join public.projects p on p.id=m.project_id where s.id=ai_evaluations.submission_id and p.freelancer_id=(select auth.uid())));
create policy freelancer_disputes on public.disputes for select to authenticated using (exists(select 1 from public.projects p where p.id=disputes.project_id and p.freelancer_id=(select auth.uid())));
create policy freelancer_activity on public.activity_events for select to authenticated using (exists(select 1 from public.projects p where p.id=activity_events.project_id and p.freelancer_id=(select auth.uid())));

-- Invoker functions callable only by the server service_role. API handlers
-- authenticate with getUser() and provide the actor, never from request JSON.
create function public.assign_project_freelancer(p_project uuid, p_actor uuid, p_freelancer uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.projects%rowtype; target_id uuid:=p_freelancer;
begin
  select * into p from public.projects where id=p_project for update;
  if not found or p_actor is null or p.created_by is distinct from p_actor then raise exception 'Only the project client can assign a freelancer.' using errcode='42501'; end if;
  if p.freelancer_id is not null or p.status in ('COMPLETED','CANCELLED') then raise exception 'This project cannot accept a new assignment.' using errcode='P0001'; end if;
  if target_id is null or target_id=p_actor then raise exception 'Choose a different, confirmed TrustLayer account.' using errcode='P0001'; end if;
  perform id from public.milestones where project_id=p_project order by id for update;
  if exists(select 1 from public.milestones where project_id=p_project and (payment_release_locked_at is not null or status in ('SUBMITTED','UNDER_REVIEW','DISPUTED'))) then raise exception 'Finish or reconcile active milestone operations before assigning a freelancer.' using errcode='P0001'; end if;
  update public.projects set freelancer_id=target_id where id=p_project;
  insert into public.activity_events(project_id,event_type,message,metadata) values(p_project,'FREELANCER_ASSIGNED','The client assigned a freelancer to this project.',jsonb_build_object('assignedBy',p_actor,'freelancerId',target_id));
  return jsonb_build_object('success',true);
end;
$$;

create function public.milestone_dispute_action(p_milestone uuid,p_actor uuid,p_action text,p_reason text default '')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.milestones%rowtype; p public.projects%rowtype; d public.disputes%rowtype; lock_at timestamptz:=clock_timestamp(); actor_role text;
begin
  -- Match assignment's project -> milestone lock ordering.
  select p0.* into p from public.projects p0 join public.milestones m0 on m0.project_id=p0.id where m0.id=p_milestone for update of p0;
  if not found or p_actor is null or (p.created_by is distinct from p_actor and p.freelancer_id is distinct from p_actor) then raise exception 'You are not a participant in this project.' using errcode='42501'; end if;
  select * into m from public.milestones where id=p_milestone for update;
  actor_role:=case when p.created_by=p_actor then 'CLIENT' else 'FREELANCER' end;
  if m.status='PAID' or m.paypal_capture_id is not null then raise exception 'Captured milestones cannot use this dispute flow.' using errcode='P0001'; end if;
  if p_action='open' then
    if length(trim(p_reason))<10 or length(p_reason)>4000 then raise exception 'Provide a reason between 10 and 4000 characters.' using errcode='22023'; end if;
    if m.payment_release_locked_at is not null then raise exception 'A protected operation requires reconciliation.' using errcode='P0001'; end if;
    if exists(select 1 from public.disputes where milestone_id=m.id and status<>'RESOLVED') then raise exception 'An unresolved dispute already exists.' using errcode='P0001'; end if;
    insert into public.disputes(project_id,milestone_id,raised_by,reason,status,operation_lock_at) values(p.id,m.id,actor_role,trim(p_reason),'OPEN',lock_at) returning * into d;
    update public.milestones set status='DISPUTED',payment_release_locked_at=lock_at where id=m.id;
    insert into public.activity_events(project_id,milestone_id,event_type,message,metadata) values(p.id,m.id,'DISPUTE_OPENED','A participant opened a dispute. Payment release is blocked.',jsonb_build_object('disputeId',d.id,'actorId',p_actor,'role',actor_role));
  else
    select * into d from public.disputes where milestone_id=m.id and status<>'RESOLVED' order by created_at desc limit 1 for update;
    if not found then raise exception 'No unresolved dispute was found.' using errcode='P0001'; end if;
    -- Never clear legacy, unrelated, or uncertain operation locks.
    if m.status<>'DISPUTED' or d.operation_lock_at is null or m.payment_release_locked_at is distinct from d.operation_lock_at then raise exception 'The dispute lock requires manual reconciliation.' using errcode='P0001'; end if;
    if p.freelancer_id is null then raise exception 'Both client and freelancer must be assigned before agreement.' using errcode='P0001'; end if;
    if p_action='propose_revision' then
      if d.proposed_by is not null then raise exception 'A resolution proposal already exists.' using errcode='P0001'; end if;
      if length(trim(p_reason))<10 or length(p_reason)>4000 then raise exception 'Describe the agreed revision in 10 to 4000 characters.' using errcode='22023'; end if;
      update public.disputes set proposed_by=p_actor,proposed_resolution=trim(p_reason),status='AWAITING_HUMAN' where id=d.id;
      insert into public.activity_events(project_id,milestone_id,event_type,message,metadata) values(p.id,m.id,'DISPUTE_RESOLUTION_PROPOSED','Return to revision proposed; the other participant must accept.',jsonb_build_object('disputeId',d.id,'actorId',p_actor));
    elsif p_action='accept_revision' then
      if d.proposed_by is null or d.proposed_by=p_actor or d.proposed_resolution is null then raise exception 'Only the other participant can accept an existing proposal.' using errcode='P0001'; end if;
      update public.disputes set status='RESOLVED',resolution='RETURN_TO_REVISION: '||d.proposed_resolution,accepted_by=p_actor,resolved_at=now() where id=d.id;
      update public.submissions set status='REVISION_REQUIRED' where id=(select id from public.submissions where milestone_id=m.id order by version desc limit 1);
      update public.milestones set status=case when paypal_authorization_id is null then 'PENDING' else 'REVISION_REQUIRED' end,payment_release_locked_at=null where id=m.id;
      insert into public.activity_events(project_id,milestone_id,event_type,message,metadata) values(p.id,m.id,'DISPUTE_RESOLVED','Both participants agreed to return to revision. Fresh submission and verification are required.',jsonb_build_object('disputeId',d.id,'actorId',p_actor,'proposedBy',d.proposed_by));
    else raise exception 'Unknown dispute action.' using errcode='22023'; end if;
  end if;
  return jsonb_build_object('success',true,'disputeId',d.id);
end;
$$;
revoke all on function public.assign_project_freelancer(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.milestone_dispute_action(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.assign_project_freelancer(uuid,uuid,uuid) to service_role;
grant execute on function public.milestone_dispute_action(uuid,uuid,text,text) to service_role;

create function public.submit_project_work(p_milestone uuid,p_actor uuid,p_content text,p_url text,p_notes text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.projects%rowtype; m public.milestones%rowtype; submission_id uuid; next_version integer;
begin
  select p0.* into p from public.projects p0 join public.milestones m0 on m0.project_id=p0.id where m0.id=p_milestone for update of p0;
  if not found or p_actor is null or coalesce(p.freelancer_id,p.created_by) is distinct from p_actor then raise exception 'Only the assigned freelancer can submit work.' using errcode='42501'; end if;
  select * into m from public.milestones where id=p_milestone for update;
  if m.status not in ('FUNDED','REVISION_REQUIRED') or m.payment_release_locked_at is not null or m.paypal_capture_id is not null then raise exception 'This milestone is not accepting submissions or requires reconciliation.' using errcode='P0001'; end if;
  if exists(select 1 from public.disputes where milestone_id=m.id and status<>'RESOLVED') then raise exception 'Resolve the dispute before submitting work.' using errcode='P0001'; end if;
  if length(trim(p_content))<20 or length(p_content)>1000000 or length(p_url)>2048 or length(p_notes)>10000 then raise exception 'Invalid deliverable content, URL, or notes.' using errcode='22023'; end if;
  select coalesce(max(version),0)+1 into next_version from public.submissions where milestone_id=m.id;
  insert into public.submissions(milestone_id,version,submission_content,submission_url,notes,status) values(m.id,next_version,trim(p_content),nullif(trim(p_url),''),trim(p_notes),'SUBMITTED') returning id into submission_id;
  update public.milestones set status='SUBMITTED' where id=m.id;
  insert into public.activity_events(project_id,milestone_id,event_type,message,metadata) values(p.id,m.id,'WORK_SUBMITTED','Work submitted for verification.',jsonb_build_object('submissionId',submission_id,'version',next_version,'submittedBy',p_actor));
  return jsonb_build_object('success',true,'submissionId',submission_id,'version',next_version);
end;
$$;
revoke all on function public.submit_project_work(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_project_work(uuid,uuid,text,text,text) to service_role;
