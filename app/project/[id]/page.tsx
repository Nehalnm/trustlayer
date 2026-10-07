import { notFound } from "next/navigation";

import OpenDispute from "@/components/OpenDispute";
import MilestoneInsights from "@/components/MilestoneInsights";
import MilestoneSubmission from "@/components/MilestoneSubmission";
import PaymentProtectionBanner from "@/components/PaymentProtectionBanner";
import PayPalCheckout from "@/components/PayPalCheckout";
import ReleasePayment from "@/components/ReleasePayment";
import VerifyMilestone from "@/components/VerifyMilestone";
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
      return "bg-slate-100 text-slate-600";

    case "FUNDED":
      return "bg-blue-50 text-blue-700";

    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "bg-violet-50 text-violet-700";

    case "REVISION_REQUIRED":
      return "bg-orange-50 text-orange-700";

    case "APPROVED":
    case "PAID":
      return "bg-emerald-50 text-emerald-700";

    case "DISPUTED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
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
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-300 bg-transparent text-slate-400"
          }`}
        >
          {complete ? "✓" : ""}
        </span>

        <span
          className={`whitespace-nowrap text-xs ${
            active || complete ? "font-medium text-slate-800" : "text-slate-400"
          }`}
        >
          {label}
        </span>
      </div>

      {label !== "Paid" && <div className="mx-3 h-px flex-1 bg-slate-200" />}
    </div>
  );
}

function ProjectDescription({ description }: { description: string }) {
  return (
    <div className="whitespace-pre-line text-sm leading-7 text-slate-600">
      {description}
    </div>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

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
      className="min-h-screen bg-[#f6f5f2] text-slate-950"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-[#f4f1eb]">
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  Project workspace
                </p>
                <p className="text-xs text-slate-500">
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
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="h-2 w-2 bg-emerald-500" />
                  Active project
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {project.title}
                </h1>

                <div className="mt-4">
                  <ProjectDescription description={project.description ?? ""} />
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>
                    {project.currency} {totalAmount.toFixed(2)} total
                  </span>

                  <span>{projectMilestones.length} milestones</span>

                  <span>{project.deadline_days ?? 0} days</span>
                </div>
              </div>

              <div className="shrink-0 border-l-2 border-emerald-500 pl-4">
                <p className="text-xs text-slate-500">Project status</p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatStatus(project.status)}
                </p>
              </div>
            </div>
          </section>

          {/* Payment protection */}
          <div id="payment-protection" className="mb-9">
            <PaymentProtectionBanner
              currency={project.currency}
              totalAmount={totalAmount}
              protectedAmount={protectedAmount}
            />
          </div>

          {/* Payment summary */}
          <section className="mb-10 border-y border-slate-200 py-5">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Protected or released</p>

                <p className="mt-1 text-xl font-semibold">
                  {project.currency} {protectedAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Project value</p>

                <p className="mt-1 text-xl font-semibold">
                  {project.currency} {totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Payment progress</p>

                <p className="mt-1 text-xl font-semibold">{paymentProgress}%</p>
              </div>
            </div>

            <div className="mt-5 h-1 bg-slate-200">
              <div
                className="h-1 bg-slate-950 transition-all"
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
                <p className="text-xs text-slate-500">Project execution</p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Milestones
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                {completedMilestones} of {projectMilestones.length} complete
              </p>
            </div>
          </section>

          {/* Milestones */}
          <section className="border-t border-slate-200">
            {projectMilestones.map((milestone, index) => {
              const criteria = getCriteria(milestone.acceptance_criteria);

              const isInitiallyOpen = index === activeMilestoneIndex;

              const workflowStep = getWorkflowStep(milestone.status);

              return (
                <details
                  key={milestone.id}
                  open={isInitiallyOpen}
                  className="group border-b border-slate-200"
                >
                  <summary className="cursor-pointer list-none py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span className="pt-0.5 text-sm text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-semibold text-slate-950">
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

                          <p className="mt-1 text-sm text-slate-500">
                            Due day {milestone.deadline_day}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 sm:pl-4">
                        <span className="text-sm font-semibold text-slate-950">
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
                  <div className="pb-9 pt-2">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
                      {/* Main milestone workspace */}
                      <div>
                        <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs text-slate-500">
                              Milestone {index + 1} of{" "}
                              {projectMilestones.length}
                            </p>

                            <h4 className="mt-1 text-2xl font-semibold tracking-tight">
                              {milestone.title}
                            </h4>
                          </div>

                          <p className="text-sm text-slate-500">
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
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h5 className="text-sm font-semibold">
                              Acceptance criteria
                            </h5>

                            <span className="text-xs text-slate-500">
                              {criteria.length} requirements
                            </span>
                          </div>

                          {criteria.length > 0 ? (
                            <div className="divide-y divide-slate-200">
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

                                  <p className="text-sm leading-6 text-slate-700">
                                    {criterion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="py-4 text-sm text-slate-500">
                              No acceptance criteria were recorded for this
                              milestone.
                            </p>
                          )}
                        </div>

                        {/* PENDING */}
                        {milestone.status === "PENDING" && (
                          <section className="mt-8 border-t border-slate-200 pt-7">
                            <div className="mb-5">
                              <h5 className="text-lg font-semibold">
                                Protect this milestone payment
                              </h5>

                              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Authorize the PayPal payment first. The payment
                                remains protected until the submitted work
                                passes verification.
                              </p>

                              <p className="mt-4 text-xl font-semibold">
                                {project.currency}{" "}
                                {Number(milestone.amount).toFixed(2)}
                              </p>
                            </div>

                            <PayPalCheckout milestoneId={milestone.id} />
                          </section>
                        )}

                        {/* FUNDED */}
                        {milestone.status === "FUNDED" && (
                          <>
                            <MilestoneSubmission milestoneId={milestone.id} />

                            <div className="mt-6">
                              <OpenDispute milestoneId={milestone.id} />
                            </div>
                          </>
                        )}

                        {/* SUBMITTED */}
                        {milestone.status === "SUBMITTED" && (
                          <section className="mt-8 border-t border-slate-200 pt-7">
                            <h5 className="text-lg font-semibold">
                              Ready for verification
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                              The deliverable has been submitted. Run
                              verification against the milestone requirements.
                            </p>

                            <div className="mt-5">
                              <VerifyMilestone milestoneId={milestone.id} />
                            </div>

                            <div className="mt-5">
                              <OpenDispute milestoneId={milestone.id} />
                            </div>
                          </section>
                        )}

                        {/* UNDER REVIEW */}
                        {milestone.status === "UNDER_REVIEW" && (
                          <section className="mt-8 border-t border-slate-200 pt-7">
                            <h5 className="text-lg font-semibold">
                              Verification in progress
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                              TrustLayer is checking the submitted work against
                              the agreed requirements.
                            </p>
                          </section>
                        )}

                        {/* REVISION REQUIRED */}
                        {milestone.status === "REVISION_REQUIRED" && (
                          <MilestoneSubmission milestoneId={milestone.id} />
                        )}

                        {/* APPROVED */}
                        {milestone.status === "APPROVED" && (
                          <section className="mt-8 border-t border-slate-200 pt-7">
                            <h5 className="text-lg font-semibold">
                              Verification passed
                            </h5>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                              The submission meets the acceptance criteria. The
                              deterministic payment policy can now decide
                              whether PayPal capture is allowed.
                            </p>

                            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                              <ReleasePayment milestoneId={milestone.id} />

                              <OpenDispute milestoneId={milestone.id} />
                            </div>
                          </section>
                        )}

                        {/* PAID */}
                        {milestone.status === "PAID" && (
                          <section className="mt-8 border-t border-slate-200 pt-7">
                            <h5 className="text-lg font-semibold">
                              Milestone complete
                            </h5>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              The work passed verification and the authorized
                              payment was captured through PayPal.
                            </p>
                          </section>
                        )}

                        {/* DISPUTED */}
                        {milestone.status === "DISPUTED" && (
                          <section className="mt-8 border-t border-red-200 pt-7">
                            <h5 className="text-lg font-semibold text-red-900">
                              Milestone under dispute
                            </h5>

                            <p className="mt-2 text-sm leading-6 text-red-800">
                              Payment is blocked until the dispute is resolved.
                            </p>
                          </section>
                        )}
                      </div>

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
          <section className="mt-12 border-t border-slate-200">
            {/* Contract */}
            <details id="contract" className="border-b border-slate-200">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Contract details
              </summary>

              <div className="grid gap-8 pb-7 lg:grid-cols-2">
                <div>
                  <p className="text-sm leading-7 text-slate-600">
                    {contract.summary ||
                      "The structured contract was generated from the original project description."}
                  </p>

                  <div className="mt-5 flex gap-8 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Budget</p>

                      <p className="mt-1 font-semibold">
                        {contract.currency || project.currency}{" "}
                        {Number(contract.totalBudget ?? totalAmount).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Duration</p>

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
                          className="border-l-2 border-amber-400 pl-3 text-sm leading-6 text-slate-600"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No major ambiguities were identified.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {/* Risk flags */}
            <details className="border-b border-slate-200">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Risk flags
              </summary>

              <div className="pb-7">
                {(contract.riskFlags ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {contract.riskFlags?.map((risk, index) => (
                      <div
                        key={index}
                        className="border-l-2 border-red-400 pl-3 text-sm leading-6 text-slate-600"
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No major project risks were identified.
                  </p>
                )}
              </div>
            </details>

            {/* Activity */}
            <details id="activity" className="border-b border-slate-200">
              <summary className="cursor-pointer list-none py-5 text-sm font-semibold">
                Activity
              </summary>

              <div className="pb-7">
                {events.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{event.message}</p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(event.event_type)}
                          </p>
                        </div>

                        <p className="text-xs text-slate-500">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
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
