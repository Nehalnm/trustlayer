import { notFound } from "next/navigation";

import EvaluationResult from "@/components/EvaluationResult";
import MilestoneSubmission from "@/components/MilestoneSubmission";
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

function getStatusClasses(status: string) {
  switch (status) {
    case "FUNDED":
      return "border-blue-200 bg-blue-50 text-blue-800";

    case "SUBMITTED":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "UNDER_REVIEW":
      return "border-purple-200 bg-purple-50 text-purple-800";

    case "REVISION_REQUIRED":
      return "border-orange-200 bg-orange-50 text-orange-800";

    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "DISPUTED":
      return "border-red-200 bg-red-50 text-red-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getCriteria(criteria: unknown): string[] {
  if (!Array.isArray(criteria)) {
    return [];
  }

  return criteria.filter((item): item is string => typeof item === "string");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  const fundedAmount = projectMilestones
    .filter(
      (milestone) =>
        milestone.status === "FUNDED" ||
        milestone.status === "APPROVED" ||
        milestone.status === "PAID",
    )
    .reduce((sum, milestone) => sum + Number(milestone.amount ?? 0), 0);

  const paymentProgress =
    totalAmount > 0
      ? Math.min(100, Math.round((fundedAmount / totalAmount) * 100))
      : 0;

  const completedMilestones = projectMilestones.filter(
    (milestone) => milestone.status === "PAID",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-bold text-slate-950">TrustLayer</div>

            <div className="text-xs text-slate-500">
              AI-powered payment protection
            </div>
          </div>

          <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Project Dashboard
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Project header */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
                AI Contract
              </div>

              <h1 className="text-3xl font-bold text-slate-950">
                {project.title}
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-700">
                {project.description}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 lg:min-w-[220px]">
              <p className="text-sm font-medium text-slate-500">
                Project value
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {project.currency} {totalAmount.toFixed(2)}
              </p>

              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  project.status,
                )}`}
              >
                {formatStatus(project.status)}
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Milestones</p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {completedMilestones}/{projectMilestones.length}
            </p>

            <p className="mt-2 text-sm text-slate-600">Milestones fully paid</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Protected payment
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {project.currency} {fundedAmount.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Currently authorized or released
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Timeline</p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {project.deadline_days ?? 0} days
            </p>

            <p className="mt-2 text-sm text-slate-600">
              AI-generated project duration
            </p>
          </div>
        </section>

        {/* Payment protection progress */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Payment protection
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                PayPal funds are protected milestone by milestone and released
                only after verification.
              </p>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {paymentProgress}%
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${paymentProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>
              Protected: {project.currency} {fundedAmount.toFixed(2)}
            </span>

            <span>
              Total: {project.currency} {totalAmount.toFixed(2)}
            </span>
          </div>
        </section>

        {/* Milestones */}
        <section className="mb-8">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Execution plan
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Milestones
            </h2>

            <p className="mt-2 text-slate-600">
              Each milestone has objective acceptance criteria and an
              independently protected payment.
            </p>
          </div>

          <div className="space-y-6">
            {projectMilestones.map((milestone, index) => {
              const criteria = getCriteria(milestone.acceptance_criteria);

              const showEvaluation = [
                "REVISION_REQUIRED",
                "APPROVED",
                "PAID",
                "DISPUTED",
              ].includes(milestone.status);

              return (
                <div
                  key={milestone.id}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
                >
                  {/* Milestone header */}
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-950">
                          {milestone.title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          Deadline: Day {milestone.deadline_day}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <p className="text-xl font-bold text-slate-950">
                        {project.currency} {Number(milestone.amount).toFixed(2)}
                      </p>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                          milestone.status,
                        )}`}
                      >
                        {formatStatus(milestone.status)}
                      </span>
                    </div>
                  </div>

                  {/* Acceptance criteria */}
                  <div className="mt-7 rounded-xl bg-slate-50 p-5">
                    <p className="text-sm font-bold text-slate-900">
                      Acceptance criteria
                    </p>

                    {criteria.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {criteria.map((criterion, criterionIndex) => (
                          <li
                            key={`${milestone.id}-${criterionIndex}`}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="mt-1 text-blue-600">✓</span>

                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">
                        No acceptance criteria recorded.
                      </p>
                    )}
                  </div>

                  {/* Pending payment */}
                  {milestone.status === "PENDING" && (
                    <div className="mt-7 border-t border-slate-200 pt-7">
                      <div className="mb-5">
                        <p className="text-sm font-bold text-slate-950">
                          Protect this milestone payment
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          The payment will be authorized through PayPal and held
                          until TrustLayer verifies the submitted work.
                        </p>

                        <p className="mt-3 text-xl font-bold text-slate-950">
                          {project.currency}{" "}
                          {Number(milestone.amount).toFixed(2)}
                        </p>
                      </div>

                      <PayPalCheckout milestoneId={milestone.id} />
                    </div>
                  )}

                  {/* Funded milestone */}
                  {milestone.status === "FUNDED" && (
                    <div className="mt-7">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                        <p className="font-semibold text-emerald-900">
                          ✓ Payment protected
                        </p>

                        <p className="mt-1 text-sm leading-6 text-emerald-800">
                          The PayPal payment for this milestone has been
                          authorized. Funds will be released after the submitted
                          work passes verification.
                        </p>
                      </div>

                      <MilestoneSubmission milestoneId={milestone.id} />
                    </div>
                  )}

                  {/* Submitted milestone */}
                  {milestone.status === "SUBMITTED" && (
                    <div className="mt-7">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                        <p className="font-semibold text-amber-900">
                          ⏳ Work submitted
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          The deliverable has been submitted and is ready for AI
                          verification.
                        </p>
                      </div>

                      <VerifyMilestone milestoneId={milestone.id} />
                    </div>
                  )}

                  {/* Under review */}
                  {milestone.status === "UNDER_REVIEW" && (
                    <div className="mt-7 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
                      <p className="font-semibold text-purple-900">
                        AI verification in progress
                      </p>

                      <p className="mt-1 text-sm leading-6 text-purple-800">
                        TrustLayer is checking the submitted work against the
                        agreed acceptance criteria.
                      </p>
                    </div>
                  )}

                  {/* Revision required */}
                  {milestone.status === "REVISION_REQUIRED" && (
                    <div className="mt-7">
                      <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
                        <p className="font-semibold text-orange-900">
                          ⚠ Revision required
                        </p>

                        <p className="mt-1 text-sm leading-6 text-orange-800">
                          The AI verifier found that one or more acceptance
                          criteria were not satisfied. Revise the deliverable
                          and submit a new version.
                        </p>
                      </div>

                      <MilestoneSubmission milestoneId={milestone.id} />
                    </div>
                  )}

                  {/* Approved */}
                  {milestone.status === "APPROVED" && (
                    <div className="mt-7">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                        <p className="font-semibold text-emerald-900">
                          ✓ Work approved
                        </p>

                        <p className="mt-1 text-sm leading-6 text-emerald-800">
                          The work passed AI verification. TrustLayer's
                          deterministic payment policy can now evaluate whether
                          the authorized PayPal payment may be released.
                        </p>
                      </div>

                      <ReleasePayment milestoneId={milestone.id} />
                    </div>
                  )}

                  {/* Paid */}
                  {milestone.status === "PAID" && (
                    <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                      <p className="font-semibold text-emerald-900">
                        ✓ Payment released
                      </p>

                      <p className="mt-1 text-sm leading-6 text-emerald-800">
                        This milestone passed verification and its PayPal
                        payment was released.
                      </p>
                    </div>
                  )}

                  {/* Disputed */}
                  {milestone.status === "DISPUTED" && (
                    <div className="mt-7 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                      <p className="font-semibold text-red-900">
                        ⚠ Milestone disputed
                      </p>

                      <p className="mt-1 text-sm leading-6 text-red-800">
                        This milestone requires dispute resolution before
                        payment can be released.
                      </p>
                    </div>
                  )}

                  {/* Saved AI evaluation */}
                  {showEvaluation && (
                    <EvaluationResult milestoneId={milestone.id} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Contract Summary */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                AI contract agent
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Contract summary
              </h2>
            </div>

            <p className="text-sm leading-7 text-slate-700">
              {contract.summary ||
                "The AI contract agent generated a structured agreement from the original project description."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Budget
                </p>

                <p className="mt-1 font-bold text-slate-950">
                  {contract.currency || project.currency}{" "}
                  {Number(contract.totalBudget ?? totalAmount).toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </p>

                <p className="mt-1 font-bold text-slate-950">
                  {contract.deadlineDays ?? project.deadline_days ?? 0} days
                </p>
              </div>
            </div>
          </div>

          {/* Ambiguities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Scope clarity
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Ambiguities
              </h2>
            </div>

            {contract.ambiguities && contract.ambiguities.length > 0 ? (
              <ul className="space-y-3">
                {contract.ambiguities.map((item, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                No major ambiguities were identified.
              </p>
            )}
          </div>
        </section>

        {/* Risk Flags */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Risk analysis
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              AI risk flags
            </h2>
          </div>

          {contract.riskFlags && contract.riskFlags.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {contract.riskFlags.map((risk, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
                >
                  {risk}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No major project risks were identified.
            </p>
          )}
        </section>

        {/* Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              TrustLayer activity
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Agent activity
            </h2>
          </div>

          {events.length > 0 ? (
            <div className="space-y-5">
              {events.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-600" />

                  <div className="flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-slate-950">
                        {event.message}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatDate(event.created_at)}
                      </p>
                    </div>

                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {formatStatus(event.event_type)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No activity has been recorded yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
