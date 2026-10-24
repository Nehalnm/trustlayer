-- Integration assertions against the actual Postgres functions and RLS.
-- All fixture accounts/data are rolled back. No external services are called.
begin;
do $$
#variable_conflict use_variable
declare
  client_id uuid:=gen_random_uuid(); freelancer_id uuid:=gen_random_uuid(); stranger_id uuid:=gen_random_uuid();
  project_id uuid:=gen_random_uuid(); milestone_id uuid:=gen_random_uuid();
  result jsonb; observed integer; blocked boolean;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (client_id,client_id::text||'@example.invalid',now()),
    (freelancer_id,freelancer_id::text||'@example.invalid',now()),
    (stranger_id,stranger_id::text||'@example.invalid',now());
  insert into public.projects(id,title,description,total_amount,created_by) values(project_id,'Rollback collaboration test','Test fixture only',10,client_id);
  insert into public.milestones(id,project_id,title,amount,deadline_day,status,paypal_authorization_id) values(milestone_id,project_id,'Test milestone',10,1,'FUNDED','fixture-not-a-real-authorization');
  set local role service_role;
  perform public.assign_project_freelancer(project_id,client_id,freelancer_id);
  blocked:=false;
  begin perform public.assign_project_freelancer(project_id,stranger_id,client_id); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Outsider assignment allowed'; end if;
  blocked:=false;
  begin perform public.submit_project_work(milestone_id,client_id,'<footer>Complete source</footer>','',''); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Client submitted after assignment'; end if;
  perform public.submit_project_work(milestone_id,freelancer_id,'<footer>Complete source</footer>','','');
  if (select count(*) from public.submissions s where s.milestone_id=milestone_id)<>1 then raise exception 'Submission not saved'; end if;
  update public.milestones set status='APPROVED' where id=milestone_id;
  update public.submissions set status='APPROVED' where submissions.milestone_id=milestone_id;
  perform public.milestone_dispute_action(milestone_id,freelancer_id,'open','The agreed scope needs a revision.');
  if (select status from public.milestones where id=milestone_id)<>'DISPUTED' then raise exception 'Dispute did not block release'; end if;
  blocked:=false;
  begin perform public.milestone_dispute_action(milestone_id,stranger_id,'accept_revision',''); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Outsider resolution allowed'; end if;
  blocked:=false;
  begin perform public.submit_project_work(milestone_id,freelancer_id,'<footer>Complete source</footer>','',''); exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Submission during dispute allowed'; end if;
  perform public.milestone_dispute_action(milestone_id,client_id,'propose_revision','Add the missing footer link and resubmit.');
  blocked:=false;
  begin perform public.milestone_dispute_action(milestone_id,client_id,'accept_revision',''); exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Unilateral resolution allowed'; end if;
  -- An unrelated operation lock cannot be cleared even with both votes.
  update public.milestones set payment_release_locked_at=payment_release_locked_at+interval '1 second' where id=milestone_id;
  blocked:=false;
  begin perform public.milestone_dispute_action(milestone_id,freelancer_id,'accept_revision',''); exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Unrelated operation lock cleared'; end if;
  update public.milestones set payment_release_locked_at=(select operation_lock_at from public.disputes d where d.milestone_id=milestone_id) where id=milestone_id;
  perform public.milestone_dispute_action(milestone_id,freelancer_id,'accept_revision','');
  if (select status from public.milestones where id=milestone_id)<>'REVISION_REQUIRED' then raise exception 'Fresh revision not required'; end if;
  if (select status from public.submissions s where s.milestone_id=milestone_id)<>'REVISION_REQUIRED' then raise exception 'Old approval remains eligible'; end if;
  if (select payment_release_locked_at from public.milestones where id=milestone_id) is not null then raise exception 'Own dispute lock retained'; end if;
  blocked:=false;
  begin perform public.milestone_dispute_action(milestone_id,freelancer_id,'accept_revision',''); exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Resolution replay allowed'; end if;
  perform public.submit_project_work(milestone_id,freelancer_id,'<footer>Revised source with a link</footer>','','');
  if (select max(version) from public.submissions s where s.milestone_id=milestone_id)<>2 then raise exception 'Submission version allocation failed'; end if;

  -- Test RLS as the actual authenticated role, including nested policies.
  perform set_config('request.jwt.claim.sub',freelancer_id::text,true);
  set local role authenticated;
  select count(*) into observed from public.projects where id=project_id;
  if observed<>1 then raise exception 'Freelancer project read blocked'; end if;
  select count(*) into observed from public.submissions s where s.milestone_id=milestone_id;
  if observed<>2 then raise exception 'Freelancer submission read blocked'; end if;
  if has_function_privilege('authenticated','public.milestone_dispute_action(uuid,uuid,text,text)','EXECUTE') then raise exception 'Browser can call actor-taking function'; end if;
  if has_table_privilege('authenticated','public.projects','UPDATE') then raise exception 'Browser can change roles'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub',stranger_id::text,true);
  set local role authenticated;
  select count(*) into observed from public.projects where id=project_id;
  if observed<>0 then raise exception 'Outsider can read project'; end if;
  select count(*) into observed from public.submissions s where s.milestone_id=milestone_id;
  if observed<>0 then raise exception 'Outsider can read submissions'; end if;
  reset role;
  -- Paid milestones are immutable in the dispute flow.
  update public.milestones set status='PAID',paypal_capture_id='fixture-not-a-real-capture' where id=milestone_id;
  blocked:=false;
  begin perform public.milestone_dispute_action(milestone_id,client_id,'open','A paid milestone must be blocked.'); exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Paid milestone dispute allowed'; end if;
end;
$$;
rollback;
