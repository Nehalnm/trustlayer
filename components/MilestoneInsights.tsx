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
};

type MilestoneInsightsProps = {
  milestoneId: string;
  criteria: string[];
  milestoneStatus: string;
  hasAuthorization: boolean;
  hasCapture: boolean;
};

export default function MilestoneInsights({
  milestoneId,
  criteria,
  milestoneStatus,
  hasAuthorization,
  hasCapture,
}: MilestoneInsightsProps) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    async function loadEvaluation() {
      try {
        const response = await fetch(
          `/api/milestone/${milestoneId}/evaluation`,
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data = await response.json();
        const result = data.evaluation ?? data.result ?? data;

        if (result && Array.isArray(result.criteria_results)) {
          setEvaluation(result);
        }
      } catch {}
    }

    loadEvaluation();
  }, [milestoneId, milestoneStatus]);

  const results = evaluation?.criteria_results ?? [];

  const passedCount = results.filter((item) => item.passed).length;

  const score = evaluation ? Math.round(evaluation.score * 100) : null;

  const confidence = evaluation
    ? Math.round(evaluation.confidence * 100)
    : null;

  const paymentLabel = hasCapture
    ? "Released"
    : hasAuthorization
      ? "Authorized"
      : "Not authorized";

  const paymentClass = hasCapture
    ? "text-emerald-700"
    : hasAuthorization
      ? "text-blue-700"
      : "text-slate-500";

  return (
    <aside className="border-l border-slate-200 pl-0 lg:pl-7">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold tracking-tight text-slate-950">
            Trust check
          </h4>

          <span
            className={
              milestoneStatus === "APPROVED" || milestoneStatus === "PAID"
                ? "text-sm font-medium text-emerald-700"
                : milestoneStatus === "REVISION_REQUIRED"
                  ? "text-sm font-medium text-orange-700"
                  : "text-sm font-medium text-slate-500"
            }
          >
            {milestoneStatus === "APPROVED" || milestoneStatus === "PAID"
              ? "Passed"
              : milestoneStatus === "REVISION_REQUIRED"
                ? "Revision needed"
                : milestoneStatus === "UNDER_REVIEW"
                  ? "Reviewing"
                  : "Pending"}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          The submitted work is checked against the agreed acceptance criteria.
          The verification result does not directly release funds.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 border-b border-slate-200 py-5">
        <div>
          <p className="text-xs text-slate-500">Score</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">
            {score !== null ? `${score}%` : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Confidence</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">
            {confidence !== null ? `${confidence}%` : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Passed</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">
            {results.length > 0 ? `${passedCount}/${results.length}` : "—"}
          </p>
        </div>
      </div>

      <div className="py-5">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold text-slate-950">
            Acceptance criteria
          </h5>

          <span className="text-xs text-slate-500">
            {results.length > 0
              ? `${passedCount}/${results.length} passed`
              : `${criteria.length} requirements`}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {criteria.map((criterion, index) => {
            const result = results.find(
              (item) =>
                item.requirement.trim().toLowerCase() ===
                criterion.trim().toLowerCase(),
            );

            const passed = result?.passed;

            return (
              <div key={`${milestoneId}-criterion-${index}`} className="py-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] ${
                      passed === true
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : passed === false
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-slate-300 text-slate-400"
                    }`}
                  >
                    {passed === true ? "✓" : passed === false ? "!" : "•"}
                  </span>

                  <div>
                    <p className="text-sm leading-5 text-slate-800">
                      {criterion}
                    </p>

                    {result?.evidence && (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {result.evidence}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Payment</span>
          <span className={`text-sm font-semibold ${paymentClass}`}>
            {paymentLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {hasCapture
            ? "The authorized payment has been captured."
            : hasAuthorization
              ? milestoneStatus === "APPROVED"
                ? "Verification passed. The payment is eligible for release after policy validation."
                : "The payment remains protected until the milestone is approved."
              : "Payment must be authorized before this milestone can be released."}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
        AI recommends · Policy validates · PayPal executes
      </div>
    </aside>
  );
}
