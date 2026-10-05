"use client";

import { useState } from "react";

type VerifyMilestoneProps = {
  milestoneId: string;
};

type Evaluation = {
  status: "APPROVED" | "REVISION_REQUIRED" | "ESCALATE";
  score: number;
  confidence: number;
  criteria_results: {
    requirement: string;
    passed: boolean;
    evidence: string;
  }[];
  summary: string;
};

export default function VerifyMilestone({ milestoneId }: VerifyMilestoneProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setError(null);
      setEvaluation(null);
      setIsVerifying(true);

      const response = await fetch(`/api/milestone/${milestoneId}/verify`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "AI verification failed.");
      }

      setEvaluation(data.evaluation);
    } catch (verifyError) {
      console.error("Verification error:", verifyError);

      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "AI verification failed.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-6">
      <div className="mb-4">
        <p className="text-sm font-bold text-purple-950">AI verification</p>

        <p className="mt-1 text-sm leading-6 text-purple-900">
          TrustLayer will compare the submitted work against the milestone's
          agreed acceptance criteria.
        </p>
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying}
        className="w-full rounded-xl bg-purple-600 px-5 py-3.5 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVerifying ? "AI is verifying the work..." : "Run AI verification"}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Verification failed</p>

          <p className="mt-1">{error}</p>
        </div>
      )}

      {evaluation && (
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-xl border p-4 ${
              evaluation.status === "APPROVED"
                ? "border-emerald-200 bg-emerald-50"
                : evaluation.status === "REVISION_REQUIRED"
                  ? "border-orange-200 bg-orange-50"
                  : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold text-slate-950">
                {evaluation.status.replaceAll("_", " ")}
              </p>

              <p className="font-bold text-slate-950">
                {Math.round(evaluation.score * 100)}%
              </p>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {evaluation.summary}
            </p>

            <p className="mt-2 text-xs font-medium text-slate-500">
              Confidence: {Math.round(evaluation.confidence * 100)}%
            </p>
          </div>

          <div className="space-y-3">
            {evaluation.criteria_results.map((result, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex gap-3">
                  <span
                    className={
                      result.passed
                        ? "font-bold text-emerald-600"
                        : "font-bold text-red-600"
                    }
                  >
                    {result.passed ? "✓" : "✕"}
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {result.requirement}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {result.evidence}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
