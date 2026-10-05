"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Milestone = {
  title: string;
  amount: number;
  deadlineDay: number;
  acceptanceCriteria: string[];
};

type Contract = {
  title: string;
  summary: string;
  totalBudget: number;
  currency: string;
  deadlineDays: number;
  milestones: Milestone[];
  ambiguities: string[];
  riskFlags: string[];
};

export default function ContractBuilder() {
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateContract = async () => {
    if (description.trim().length < 20) {
      setError("Please describe the project in a little more detail.");
      return;
    }

    setLoading(true);
    setError("");
    setContract(null);

    try {
      const response = await fetch("/api/ai/contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate contract.");
      }

      setContract(data.contract);

      if (data.projectId) {
        router.push(`/project/${data.projectId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-8 py-20">
      {/* Heading */}
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          AI Contract Agent
        </p>

        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Describe the work. Let AI structure the agreement.
        </h2>

        <p className="mt-4 leading-7 text-slate-700">
          TrustLayer turns a natural-language freelance request into measurable
          milestones, deadlines, and acceptance criteria.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Input */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-semibold text-slate-800">
            Describe your project
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: I need a responsive landing page for my startup. Budget is $300 and I need it within 5 days..."
            className="mt-3 min-h-64 w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-800 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="button"
            onClick={generateContract}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "AI is structuring your agreement..."
              : "Generate Contract"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!contract && !loading && (
            <div className="flex min-h-96 items-center justify-center text-center text-slate-600">
              <div>
                <div className="text-4xl text-blue-600">✦</div>

                <p className="mt-3 font-medium text-slate-700">
                  Your AI-generated agreement will appear here.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-96 items-center justify-center text-center">
              <div>
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 font-medium text-slate-800">
                  Analyzing scope, budget and requirements...
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Detecting milestones and ambiguities
                </p>
              </div>
            </div>
          )}

          {contract && (
            <div>
              {/* Contract header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    AI-generated agreement
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-slate-900">
                    {contract.title}
                  </h3>
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                  {contract.currency} {contract.totalBudget}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">
                {contract.summary}
              </p>

              {/* Details */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">Budget</p>

                  <p className="mt-1 font-bold text-slate-900">
                    {contract.currency} {contract.totalBudget}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">Deadline</p>

                  <p className="mt-1 font-bold text-slate-900">
                    {contract.deadlineDays} days
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Milestones</h4>

                  <span className="text-sm text-slate-600">
                    {contract.milestones.length} stages
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {contract.milestones.map((milestone, index) => (
                    <div
                      key={`${milestone.title}-${index}`}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {index + 1}. {milestone.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            Due by day {milestone.deadlineDay}
                          </p>
                        </div>

                        <p className="font-bold text-slate-900">
                          {contract.currency} {milestone.amount}
                        </p>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {milestone.acceptanceCriteria.map(
                          (criterion, criterionIndex) => (
                            <div
                              key={criterionIndex}
                              className="flex gap-2 text-sm text-slate-700"
                            >
                              <span className="font-semibold text-emerald-600">
                                ✓
                              </span>

                              <span>{criterion}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambiguities */}
              {contract.ambiguities.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-900">
                    AI found ambiguities
                  </p>

                  <div className="mt-2 space-y-1">
                    {contract.ambiguities.map((item, index) => (
                      <p key={index} className="text-sm text-amber-800">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk flags */}
              {contract.riskFlags.length > 0 && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-900">Risk flags</p>

                  <div className="mt-2 space-y-1">
                    {contract.riskFlags.map((item, index) => (
                      <p key={index} className="text-sm text-red-800">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
