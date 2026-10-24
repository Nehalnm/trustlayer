import { notFound } from "next/navigation";
import Link from "next/link";

import OpenDispute from "@/components/OpenDispute";
import MilestoneInsights from "@/components/MilestoneInsights";
import MilestoneSubmission from "@/components/MilestoneSubmission";
import PaymentProtectionBanner from "@/components/PaymentProtectionBanner";
import PayPalCheckout from "@/components/PayPalCheckout";
import ReleasePayment from "@/components/ReleasePayment";
import PaymentRecovery from "@/components/PaymentRecovery";
import VerifyMilestone from "@/components/VerifyMilestone";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { canSubmitWork, projectRole } from "@/lib/auth/project-role";
import ProjectTeam from "@/components/ProjectTeam";
import DisputeResolution, { type DisputeDetails } from "@/components/DisputeResolution";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Milestone = {
  id: string;
  title: string;
  amount: number | string;
  deadline_day: number;
  acceptance_criteria: unknown;
  status: string;
  paypal_order_id: string | null;
  paypal_authorization_id: string | null;
  paypal_capture_id: string | null;
  payment_release_locked_at: string | null;
};

type ActivityEvent = {
  id: string;
  event_type: string;
  message: string;
  metadata: unknown;
  created_at: string;
};

type ContractData = {
  title?: string;
  summary?: string;
  totalBudget?: number;
  currency?: string;
  deadlineDays?: number;
  ambiguities?: string[];
  riskFlags?: string[];
};

function getCriteria(criteria: unknown): string[] {
  if (!Array.isArray(criteria)) return [];

  return criteria.filter((item): item is string => typeof item === "string");
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-white/5 text-slate-400";

    case "FUNDED":
      return "bg-blue-500/10 text-blue-300";

    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "bg-violet-400/10 text-violet-300";

    case "REVISION_REQUIRED":
      return "bg-orange-400/10 text-orange-300";

    case "APPROVED":
    case "PAID":
      return "bg-emerald-400/10 text-emerald-300";

    case "DISPUTED":
      return "bg-red-400/10 text-red-300";

    default:
      return "bg-white/5 text-slate-400";
  }
}

function getWorkflowStep(status: string) {
  switch (status) {
    case "PENDING":
      return 0;

    case "FUNDED":
      return 1;

    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "REVISION_REQUIRED":
    case "DISPUTED":
      return 2;

    case "APPROVED":
      return 3;

    case "PAID":
      return 4;

    default:
      return 0;
  }
}

function getCurrentAction(status: string) {
  switch (status) {
    case "PENDING":
      return "Authorize payment";

    case "FUNDED":
      return "Submit the work";

    case "SUBMITTED":
      return "Ready for verification";

    case "UNDER_REVIEW":
      return "Verification in progress";

    case "REVISION_REQUIRED":
      return "Submit a revised version";

    case "APPROVED":
      return "Release payment";

    case "PAID":
      return "Completed";

    case "DISPUTED":
      return "Dispute under review";

    default:
      return "Review milestone";
  }
}

function WorkflowStep({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-[110px] flex-1 items-center">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] ${
            complete
              ? "border-emerald-500 bg-emerald-500 text-white"
              : active
                ? "border-slate-950 bg-blue-500 text-white"
                : "border-white/15 bg-transparent text-slate-400"
          }`}
        >
          {complete ? "✓" : ""}
        </span>

        <span
          className={`whitespace-nowrap text-xs ${
            active || complete ? "font-medium text-slate-200" : "text-slate-400"
          }`}
        >
          {label}
        </span>
      </div>

      {label !== "Paid" && <div className="mx-3 h-px flex-1 bg-white/10" />}
    </div>
  );
}

function ProjectDescription({ description }: { description: string }) {
  return (
    <div className="whitespace-pre-line text-sm leading-7 text-slate-400">
      {description}
    </div>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

  const { user } = await requireProjectAccess(id);

  // 3. Only load privileged project data after access is verified.
  const supabase = createAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", id)
    .order("deadline_day", {
      ascending: true,
    });

  const { data: activityEvents, error: activityError } = await supabase
    .from("activity_events")
    .select("*")
    .eq("project_id", id)
    .order("created_at", {
      ascending: false,
    });

  if (milestonesError) {
    console.error("Milestone loading error:", milestonesError);
  }

  if (activityError) {
    console.error("Activity loading error:", activityError);
  }

  const role = projectRole(project, user.id);
  if (!role) notFound();
  const canSubmit = canSubmitWork(project, user.id);
  const isClient = role === "CLIENT";
  const { data: disputes, error: disputesError } = await supabase.from("disputes")
    .select("id, milestone_id, reason, status, operation_lock_at, proposed_by, proposed_resolution")
    .eq("project_id", id).neq("status", "RESOLVED");
  if (disputesError) throw new Error("Could not load project disputes.");
  const projectMilestones = (milestones ?? []) as Milestone[];
  const events = (activityEvents ?? []) as ActivityEvent[];
  const contract = (project.contract ?? {}) as ContractData;

  const totalAmount = Number(project.total_amount ?? 0);

  const protectedAmount = projectMilestones
    .filter(
      (milestone) =>
        Boolean(milestone.paypal_authorization_id) ||
        Boolean(milestone.paypal_capture_id),
    )
    .reduce((sum, milestone) => sum + Number(milestone.amount ?? 0), 0);

  const paymentProgress =
    totalAmount > 0
      ? Math.min(100, Math.round((protectedAmount / totalAmount) * 100))
      : 0;

  const completedMilestones = projectMilestones.filter(
    (milestone) => milestone.status === "PAID",
  ).length;

  const firstUnpaidIndex = projectMilestones.findIndex(
    (milestone) => milestone.status !== "PAID",
  );

  const activeMilestoneIndex = firstUnpaidIndex === -1 ? 0 : firstUnpaidIndex;

  return (
    <main
      className="min-h-screen bg-[#0d0f13] text-slate-100"
      style={{
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="border-b border-white/10 bg-[#0d0f13]">
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-slate-500"><Link href="/projects" className="hover:text-white">Workspace</Link><span className="text-slate-700">/</span><span className="text-slate-300">Project overview</span></div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-100">
                  Project workspace
                </p>
                <p className="text-xs text-[#969eaf]">
                  {completedMilestones}/{projectMilestones.length} milestones
                  paid
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
          {/* Project heading */}
          <section className="mb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                  {formatStatus(project.status)} project
                </div>

                <h1 className="mt-4 text-3xl font-medium tracking-[-0.05em] sm:text-[42px]">
                  {project.title}
                </h1>

                <div className="mt-4">
                  <ProjectDescription description={project.description ?? ""} />
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#969eaf]">
                  <span>
                    {project.currency} {totalAmount.toFixed(2)} total
                  </span>

                  <span>{projectMilestones.length} milestones</span>

                  <span>{project.deadline_days ?? 0} days</span>
                </div>
              </div>

              <div className="shrink-0 border-l-2 border-emerald-500 pl-4">
                <p className="text-xs text-[#969eaf]">Project status</p>

                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {formatStatus(project.status)}
                </p>
              </div>
            </div>
          </section>

          <ProjectTeam projectId={id} role={role} assigned={Boolean(project.freelancer_id)} />
          {/* Payment protection */}
          <div id="payment-protection" className="mb-9">
            <PaymentProtectionBanner
              currency={project.currency}
              totalAmount={totalAmount}
              protectedAmount={protectedAmount}
            />
          </div>

          {/* Payment summary */}
          <section className="mb-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="workspace-stat">
                <p className="text-xs text-[#969eaf]">Protected or released</p>

                <p className="mt-1 text-xl font-semibold">
                  {project.currency} {protectedAmount.toFixed(2)}
                </p>
              </div>

              <div className="workspace-stat">
                <p className="text-xs text-[#969eaf]">Project value</p>

                <p className="mt-1 text-xl font-semibold">
                  {project.currency} {totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="workspace-stat">
                <p className="text-xs text-[#969eaf]">Payment progress</p>

                <p className="mt-1 text-xl font-semibold">{paymentProgress}%</p>
              </div>
            </div>

            <div className="mt-5 h-1 bg-white/10">
              <div
                className="h-1 bg-blue-500 transition-all"
                style={{
                  width: `${paymentProgress}%`,
                }}
              />
            </div>
          </section>

          {/* Milestones heading */}
          <section id="milestones" className="mb-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[#969eaf]">Project execution</p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Milestones
                </h2>
              </div>

              <p className="text-sm text-[#969eaf]">
                {completedMilestones} of {projectMilestones.length} complete
              </p>
            </div>
          </section>

          {/* Milestones */}
          <section>
            {projectMilestones.map((milestone, index) => {
              const criteria = getCriteria(milestone.acceptance_criteria);

              const isInitiallyOpen = index === activeMilestoneIndex;

              const workflowStep = getWorkflowStep(milestone.status);

              return (
                <details
                  key={milestone.id}
                  open={isInitiallyOpen}
                  className="group milestone-card"
                >
                  <summary className="cursor-pointer list-none py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span className="pt-0.5 text-sm text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-semibold text-slate-100">
                              {milestone.title}
                            </h3>

                            <span
                              className={`px-2 py-1 text-[11px] font-medium ${getStatusStyle(
                                milestone.status,
                              )}`}
                            >
                              {formatStatus(milestone.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-[#969eaf]">
                            Due day {milestone.deadline_day}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 sm:pl-4">
                        <span className="text-sm font-semibold text-slate-100">
                          {project.currency}{" "}
                          {Number(milestone.amount).toFixed(2)}
                        </span>

                        <span className="text-slate-400 transition-transform group-open:rotate-180">
                          ↓
                        </span>
                      </div>
                    </div>
                  </summary>

                  {/* Every milestone can open */}
                  <div className="px-5 pb-7 pt-2 sm:px-6">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
                      {/* Main milestone workspace */}
                      <div>
                        <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs text-[#969eaf]">
                              Milestone {index + 1} of{" "}
                              {projectMilestones.length}
                            </p>

                            <h4 className="mt-1 text-2xl font-semibold tracking-tight">
                              {milestone.title}
                            </h4>
                          </div>

                          <p className="text-sm text-[#969eaf]">
                            {getCurrentAction(milestone.status)}
                          </p>
                        </div>

                        {/* Workflow */}
                        <div className="mt-7 flex overflow-x-auto pb-2">
                          {["Fund", "Submit", "Verify", "Approve", "Paid"].map(
                            (label, stepIndex) => (
                              <WorkflowStep
                                key={label}
                                label={label}
                                active={workflowStep === stepIndex}
                                complete={workflowStep > stepIndex}
                              />
                            ),
                          )}
                        </div>

                        {/* Acceptance criteria */}
                        <div className="mt-8">
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h5 className="text-sm font-semibold">
                              Acceptance criteria
                            </h5>

                            <span className="text-xs text-[#969eaf]">
                              {criteria.length} requirements
                            </span>
                          </div>

                          {criteria.length > 0 ? (
                            <div className="divide-y divide-white/10">
                              {criteria.map((criterion, criterionIndex) => (
                                <div
                                  key={`${milestone.id}-${criterionIndex}`}
                                  className="flex gap-3 py-3"
                                >
                                  <span className="mt-1 text-sm text-slate-400">
                                    {String(criterionIndex + 1).padStart(
                                      2,
                                      "0",
                                    )}
                                  </span>

                                  <p className="text-sm leading-6 text-slate-300">
                                    {criterion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="py-4 text-sm text-[#969eaf]">
                              No acceptance criteria were recorded for this
                              milestone.
                            </p>
                          )}
                        </div>

                        {/* PENDING */}
                        {isClient && milestone.status === "PENDING" && (
                          <section className="mt-8 border-t border-white/10 pt-7">
                            <div className="mb-5">
                              <h5 className="text-lg font-semibold">
                                Protect this milestone payment
                              </h5>

                              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                Authorize the PayPal payment first. The payment
                                remains protected until the submitted work
                                passes verification.
                              </p>

                              <p className="mt-4 text-xl font-semibold">
                                {project.currency}{" "}
                                {Number(milestone.amount).toFixed(2)}
                              </p>
                            </div>

                            <PayPalCheckout milestoneId={milestone.id} amount={Number(milestone.amount).toFixed(2)} />
                          </section>
                        )}

                        {/* FUNDED */}
                        {milestone.status === "FUNDED" && (
                          <>
                            {canSubmit ? <MilestoneSubmission milestoneId={milestone.id} /> : <p className="mt-6 text-sm text-slate-400">Waiting for the assigned freelancer to submit work.</p>}


                          </>
                        )}

                        {/* SUBMITTED */}
                        {milestone.status === "SUBMITTED" && (
                          <section className="mt-8 border-t border-white/10 pt-7">
                            <h5 className="text-lg font-semibold">
                              Ready for verification
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                              The deliverable has been submitted. Run
                              verification against the milestone requirements.
                            </p>

                            <div className="mt-5">
                              {isClient ? <VerifyMilestone milestoneId={milestone.id} /> : <p className="mt-4 text-sm text-slate-400">Waiting for client verification.</p>}
                            </div>

                            <div className="mt-5">

                            </div>
                          </section>
                        )}

                        {/* UNDER REVIEW */}
                        {milestone.status === "UNDER_REVIEW" && (
                          <section className="mt-8 border-t border-white/10 pt-7">
                            <h5 className="text-lg font-semibold">
                              Verification in progress
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                              TrustLayer is checking the submitted work against
                              the agreed requirements.
                            </p>
                          </section>
                        )}

                        {/* REVISION REQUIRED */}
                        {milestone.status === "REVISION_REQUIRED" && (
                          canSubmit ? <MilestoneSubmission milestoneId={milestone.id} /> : <p className="mt-6 text-sm text-slate-400">Waiting for a revised submission from the freelancer.</p>
                        )}

                        {/* APPROVED */}
                        {milestone.status === "APPROVED" && (
                          <section className="mt-8 border-t border-white/10 pt-7">
                            <h5 className="text-lg font-semibold">
                              Verification passed
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                              The submission meets the acceptance criteria. The
                              deterministic payment policy can now decide
                              whether PayPal capture is allowed.
                            </p>

                            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                            {isClient && <ReleasePayment milestoneId={milestone.id} locked={Boolean(milestone.payment_release_locked_at)} />}
                            {isClient && milestone.paypal_order_id && <PaymentRecovery milestoneId={milestone.id} locked={Boolean(milestone.payment_release_locked_at)} />}


                            </div>
                          </section>
                        )}

                        {/* PAID */}
                        {milestone.status === "PAID" && (
                          <section className="mt-8 border-t border-white/10 pt-7">
                            <h5 className="text-lg font-semibold">
                              Milestone complete
                            </h5>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              The work passed verification and the authorized
                              payment was captured through PayPal.
                            </p>
                          </section>
                        )}

                        {/* DISPUTED */}
                        {milestone.status === "DISPUTED" && (
                          <section className="mt-8 border-t border-red-400/20 pt-7">
                            <h5 className="text-lg font-semibold text-red-200">
                              Milestone under dispute
                            </h5>

                            <p className="mt-2 text-sm leading-6 text-red-200">
                              Payment is blocked until the dispute is resolved.
                            </p>
                            <DisputeResolution milestoneId={milestone.id} userId={user.id} assigned={Boolean(project.freelancer_id)} dispute={(disputes ?? []).find(d => d.milestone_id === milestone.id) as DisputeDetails | undefined} />
                          </section>
                        )}
                      </div>

                      {!["PAID", "DISPUTED", "PENDING"].includes(milestone.status) && <OpenDispute milestoneId={milestone.id} />}

                      {/* Verification */}
                      <MilestoneInsights
                        milestoneId={milestone.id}
                        criteria={criteria}
                        milestoneStatus={milestone.status}
                        hasAuthorization={Boolean(
                          milestone.paypal_authorization_id,
                        )}
                        hasCapture={Boolean(milestone.paypal_capture_id)}
                      />
                    </div>
                  </div>
                </details>
              );
            })}
          </section>

          {/* Secondary information */}
          <section className="mt-12 border-t border-white/10">
            {/* Contract */}
            <details id="contract" className="border-b border-white/10">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Contract details
              </summary>

              <div className="grid gap-8 pb-7 lg:grid-cols-2">
                <div>
                  <p className="text-sm leading-7 text-slate-400">
                    {contract.summary ||
                      "The structured contract was generated from the original project description."}
                  </p>

                  <div className="mt-5 flex gap-8 text-sm">
                    <div>
                      <p className="text-xs text-[#969eaf]">Budget</p>

                      <p className="mt-1 font-semibold">
                        {contract.currency || project.currency}{" "}
                        {Number(contract.totalBudget ?? totalAmount).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#969eaf]">Duration</p>

                      <p className="mt-1 font-semibold">
                        {contract.deadlineDays ?? project.deadline_days ?? 0}{" "}
                        days
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Scope notes</p>

                  <div className="mt-3 space-y-2">
                    {(contract.ambiguities ?? []).length > 0 ? (
                      contract.ambiguities?.map((item, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-amber-400 pl-3 text-sm leading-6 text-slate-400"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#969eaf]">
                        No major ambiguities were identified.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {/* Risk flags */}
            <details className="border-b border-white/10">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Risk flags
              </summary>

              <div className="pb-7">
                {(contract.riskFlags ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {contract.riskFlags?.map((risk, index) => (
                      <div
                        key={index}
                        className="border-l-2 border-red-400 pl-3 text-sm leading-6 text-slate-400"
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#969eaf]">
                    No major project risks were identified.
                  </p>
                )}
              </div>
            </details>

            {/* Activity */}
            <details id="activity" className="border-b border-white/10">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Activity
              </summary>

              <div className="pb-7">
                {events.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{event.message}</p>

                          <p className="mt-1 text-xs text-[#969eaf]">
                            {formatStatus(event.event_type)}
                          </p>
                        </div>

                        <p className="text-xs text-[#969eaf]">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#969eaf]">
                    No activity has been recorded yet.
                  </p>
                )}
              </div>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
