import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

export default async function ContractPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const contract = (project.contract ?? {}) as ContractData;

  return (
    <main
      className="min-h-screen bg-[#f6f5f2] text-slate-950"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm text-slate-500">Contract</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {contract.title || project.title}
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {contract.summary ||
              "The structured agreement generated from the project description."}
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Agreement details</h2>

            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              <div className="flex justify-between gap-4 py-4 text-sm">
                <span className="text-slate-500">Budget</span>
                <span className="font-semibold">
                  {contract.currency || project.currency}{" "}
                  {Number(
                    contract.totalBudget ?? project.total_amount ?? 0,
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-4 text-sm">
                <span className="text-slate-500">Duration</span>
                <span className="font-semibold">
                  {contract.deadlineDays ?? project.deadline_days ?? 0} days
                </span>
              </div>

              <div className="flex justify-between gap-4 py-4 text-sm">
                <span className="text-slate-500">Project status</span>
                <span className="font-semibold">{project.status}</span>
              </div>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Scope notes</h2>

            <div className="mt-5">
              {(contract.ambiguities ?? []).length > 0 ? (
                <div className="space-y-3">
                  {contract.ambiguities?.map((item, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-amber-400 pl-3 text-sm leading-6 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No major ambiguities were identified.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Risk flags</h2>

          <div className="mt-5">
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
        </section>
      </div>
    </main>
  );
}
