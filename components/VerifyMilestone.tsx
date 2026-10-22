"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
};

type VerifyMilestoneProps = {
  milestoneId: string;
};

export default function VerifyMilestone({ milestoneId }: VerifyMilestoneProps) {
  const router = useRouter();

  const [isVerifying, setIsVerifying] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");

  async function handleVerify() {
    setIsVerifying(true);
    setError("");
    setEvaluation(null);

    try {
      const response = await fetch(`/api/milestone/${milestoneId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      const result = data.evaluation ?? data;

      setEvaluation(result);

      // Refresh the server-rendered milestone state automatically.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong during verification.",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  function getStatusLabel(status: Evaluation["status"]) {
    switch (status) {
      case "APPROVED":
        return "Approved";
      case "REVISION_REQUIRED":
        return "Revision Required";
      case "ESCALATE":
        return "Escalation Required";
      default:
        return status;
    }
  }

  return (
    <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-400/10 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-purple-300">
          AI verification
        </p>

        <h3 className="mt-1 text-xl font-bold text-purple-950">
          Verify submitted work
        </h3>

        <p className="mt-2 text-sm text-purple-800">
          TrustLayer will compare the submitted deliverable against the
          milestone acceptance criteria.
        </p>
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying}
        className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerifying ? "Verifying..." : "Run AI verification"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {evaluation && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-purple-400/20 bg-[#171a21] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#969eaf]">
                Result
              </p>
              <p className="mt-1 text-lg font-bold text-slate-100">
                {getStatusLabel(evaluation.status)}
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/20 bg-[#171a21] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#969eaf]">
                Score
              </p>
              <p className="mt-1 text-lg font-bold text-slate-100">
                {Math.round(evaluation.score * 100)}%
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/20 bg-[#171a21] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#969eaf]">
                AI confidence
              </p>
              <p className="mt-1 text-lg font-bold text-slate-100">
                {Math.round(evaluation.confidence * 100)}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-400/20 bg-[#171a21] p-4">
            <p className="text-sm font-semibold text-slate-100">
              Verification summary
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {evaluation.summary}
            </p>
          </div>

          {evaluation.criteria_results?.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-100">
                Acceptance criteria
              </p>

              <div className="space-y-3">
                {evaluation.criteria_results.map((criterion, index) => (
                  <div
                    key={`${criterion.requirement}-${index}`}
                    className="rounded-xl border border-white/10 bg-[#171a21] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          criterion.passed
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-red-400/15 text-red-300"
                        }`}
                      >
                        {criterion.passed ? "✓" : "✕"}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">
                          {criterion.requirement}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {criterion.evidence}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 text-sm text-purple-200">
            {evaluation.status === "APPROVED"
              ? "All required checks passed. The milestone can proceed to payment release."
              : evaluation.status === "REVISION_REQUIRED"
                ? "The submitted work does not yet satisfy all acceptance criteria. A revision can be submitted."
                : "The submission requires further review before payment can proceed."}
          </div>
        </div>
      )}
    </div>
  );
}
