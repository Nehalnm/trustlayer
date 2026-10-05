import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Milestone = {
  id: string;
  title: string;
  amount: number;
  deadline_day: number;
  status: string;
  acceptance_criteria: string[];
};

type Activity = {
  id: string;
  message: string;
  event_type: string;
  created_at: string;
};

type Contract = {
  summary?: string;
  ambiguities?: string[];
  riskFlags?: string[];
};

export default async function ProjectPage({ params }: ProjectPageProps) {
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

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", id)
    .order("deadline_day", {
      ascending: true,
    });

  const { data: activities } = await supabase
    .from("activity_events")
    .select("*")
    .eq("project_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  const contract = (project.contract ?? {}) as Contract;

  const milestoneList: Milestone[] = milestones ?? [];

  const activityList: Activity[] = activities ?? [];

  const totalAmount = Number(project.total_amount);

  const paidAmount = milestoneList
    .filter((milestone) => milestone.status === "PAID")
    .reduce((sum, milestone) => sum + Number(milestone.amount), 0);

  const progress =
    totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;

  const statusLabel =
    project.status === "DRAFT"
      ? "Draft"
      : project.status === "FUNDED"
        ? "Funded"
        : project.status === "IN_PROGRESS"
          ? "In progress"
          : project.status === "UNDER_REVIEW"
            ? "Under review"
            : project.status === "COMPLETED"
              ? "Completed"
              : project.status === "DISPUTED"
                ? "Disputed"
                : "Cancelled";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Top navigation */}
        <div className="mb-8 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-bold tracking-tight text-slate-950"
          >
            Trust<span className="text-blue-600">Layer</span>
          </a>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            AI-managed project
          </div>
        </div>

        {/* Project header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                  Protected Project
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  AI protected
                </span>
              </div>

              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
                {project.title}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-800">
                {project.description}
              </p>
            </div>

            <div className="min-w-[220px] rounded-2xl bg-slate-950 p-6 text-white">
              <p className="text-sm font-medium text-slate-300">
                Project value
              </p>

              <p className="mt-2 text-3xl font-extrabold">
                {project.currency} {totalAmount.toFixed(2)}
              </p>

              <p className="mt-2 text-sm text-slate-300">
                Payment managed through PayPal
              </p>
            </div>
          </div>
        </section>

        {/* Overview cards */}
        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">
              Project status
            </p>

            <p className="mt-2 text-xl font-bold text-slate-950">
              {statusLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Deadline</p>

            <p className="mt-2 text-xl font-bold text-slate-950">
              {project.deadline_days} days
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Milestones</p>

            <p className="mt-2 text-xl font-bold text-slate-950">
              {milestoneList.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Released</p>

            <p className="mt-2 text-xl font-bold text-slate-950">
              {project.currency} {paidAmount.toFixed(2)}
            </p>
          </div>
        </section>

        {/* Payment progress */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                Payment protection
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {project.currency} {paidAmount.toFixed(2)} released
              </h2>

              <p className="mt-1 text-sm text-slate-700">
                Payments are released milestone by milestone after the agreed
                work is verified.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-3xl font-extrabold text-slate-950">
                {progress}%
              </p>

              <p className="text-sm font-medium text-slate-600">
                of project value released
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </section>

        {/* Main grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Milestones */}
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                  Payment workflow
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Milestones
                </h2>

                <p className="mt-1 text-sm text-slate-700">
                  Each milestone has its own acceptance criteria before payment
                  can be released.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800">
                {milestoneList.length} stages
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {milestoneList.map((milestone, index) => {
                const isPaid = milestone.status === "PAID";

                const isApproved = milestone.status === "APPROVED";

                const isSubmitted = milestone.status === "SUBMITTED";

                return (
                  <div
                    key={milestone.id}
                    className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300"
                  >
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                      <div className="flex gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : isApproved
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {isPaid ? "✓" : index + 1}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            {milestone.title}
                          </h3>

                          <p className="mt-1 text-sm font-medium text-slate-600">
                            Due by day {milestone.deadline_day}
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xl font-extrabold text-slate-950">
                          {project.currency}{" "}
                          {Number(milestone.amount).toFixed(2)}
                        </p>

                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                          {milestone.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-200 pt-5">
                      <p className="text-sm font-bold text-slate-900">
                        Acceptance criteria
                      </p>

                      <div className="mt-3 space-y-2">
                        {(milestone.acceptance_criteria ?? []).map(
                          (criterion, criterionIndex) => (
                            <div
                              key={criterionIndex}
                              className="flex gap-3 text-sm leading-6 text-slate-800"
                            >
                              <span className="mt-0.5 font-bold text-emerald-600">
                                ✓
                              </span>

                              <span>{criterion}</span>
                            </div>
                          ),
                        )}
                      </div>

                      {isSubmitted && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="font-bold text-amber-900">
                            AI verification pending
                          </p>

                          <p className="mt-1 text-sm text-amber-800">
                            The submitted work is being checked against these
                            criteria.
                          </p>
                        </div>
                      )}

                      {isApproved && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="font-bold text-blue-900">
                            Milestone approved
                          </p>

                          <p className="mt-1 text-sm text-blue-800">
                            The agreed requirements have been satisfied.
                          </p>
                        </div>
                      )}

                      {isPaid && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="font-bold text-emerald-900">
                            Payment released
                          </p>

                          <p className="mt-1 text-sm text-emerald-800">
                            PayPal payment for this milestone has been
                            completed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI contract */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
              AI contract
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Agreement summary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              This agreement becomes the source of truth used when TrustLayer
              evaluates future submissions.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Deadline
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {project.deadline_days} days
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Ambiguities
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {contract.ambiguities?.length ?? 0}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Risk flags
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {contract.riskFlags?.length ?? 0}
                </p>
              </div>
            </div>

            {contract.summary && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">AI summary</p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {contract.summary}
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* Risks & ambiguities */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {(contract.ambiguities ?? []).length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-amber-800">
                Scope clarity
              </p>

              <h2 className="mt-2 text-xl font-bold text-amber-950">
                AI found ambiguities
              </h2>

              <div className="mt-4 space-y-3">
                {contract.ambiguities!.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-amber-200 bg-white p-4"
                  >
                    <p className="text-sm leading-6 text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(contract.riskFlags ?? []).length > 0 && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-red-800">
                Project risk
              </p>

              <h2 className="mt-2 text-xl font-bold text-red-950">
                Risk flags
              </h2>

              <div className="mt-4 space-y-3">
                {contract.riskFlags!.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-red-200 bg-white p-4"
                  >
                    <p className="text-sm leading-6 text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Agent activity */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            Agent activity
          </p>

          <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                What TrustLayer has done
              </h2>

              <p className="mt-1 text-sm text-slate-700">
                A transparent record of the agent's actions.
              </p>
            </div>

            <span className="text-sm font-semibold text-slate-600">
              {activityList.length} recent events
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {activityList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-700">
                  No activity recorded yet.
                </p>
              </div>
            ) : (
              activityList.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="relative flex w-5 justify-center">
                    <span className="mt-2 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                  </div>

                  <div className="flex-1 pb-1">
                    <p className="font-semibold text-slate-900">
                      {activity.message}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
