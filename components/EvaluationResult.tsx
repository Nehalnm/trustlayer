"use client";

import { useEffect, useState } from "react";

type CriterionResult = {
  requirement: string;
  passed: boolean;
  evidence: string;
};

type Evaluation = {
  status: "APPROVED" | "REVISION_REQUIRED" | "ESCALATE";
  score: number;
  confidence: number;
  criteria_results: CriterionResult[];
  summary: string;
  created_at: string;
};

type EvaluationResultProps = {
  milestoneId: string;
};

export default function EvaluationResult({
  milestoneId,
}: EvaluationResultProps) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvaluation() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/milestone/${milestoneId}/evaluation`,
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load AI evaluation.");
        }

        setEvaluation(data?.evaluation ?? null);
      } catch (evaluationError) {
        console.error("Evaluation loading error:", evaluationError);

        setError(
          evaluationError instanceof Error
            ? evaluationError.message
            : "Failed to load AI evaluation.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadEvaluation();
  }, [milestoneId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        Loading AI verification result...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  const percentage = Math.round(evaluation.score * 100);

  const confidencePercentage = Math.round(evaluation.confidence * 100);

  const statusStyles =
    evaluation.status === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : evaluation.status === "REVISION_REQUIRED"
        ? "border-orange-200 bg-orange-50 text-orange-900"
        : "border-red-200 bg-red-50 text-red-900";

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
            AI verification
          </p>

          <h4 className="mt-1 text-lg font-bold text-slate-950">
            Verification result
          </h4>
        </div>

        <div
          className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${statusStyles}`}
        >
          {evaluation.status.replaceAll("_", " ")}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Score
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {percentage}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            AI confidence
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {confidencePercentage}%
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-bold text-slate-900">Verification summary</p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {evaluation.summary}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-slate-900">
          Acceptance criteria results
        </p>

        <div className="mt-3 space-y-3">
          {evaluation.criteria_results.map((result, index) => (
            <div
              key={index}
              className={`rounded-xl border p-4 ${
                result.passed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`mt-0.5 font-bold ${
                    result.passed ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {result.passed ? "✓" : "✕"}
                </span>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {result.requirement}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {result.evidence}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
