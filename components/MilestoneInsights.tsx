"use client";

import { useEffect, useState } from "react";

type CriterionResult = {
  requirement: string;
  passed: boolean;
  evidence: string;
};

type ArtifactStructure = {
  hasDoctype: boolean;
  hasHtmlRoot: boolean;
  hasHead: boolean;
  hasBody: boolean;
  footerCount: number;
  navigationCount: number;
  headingCount: number;
  imageCount: number;
  imagesWithAltCount: number;
  linkCount: number;
  formCount: number;
  scriptCount: number;
  styleBlockCount: number;
  mediaQueryCount: number;
  responsiveUtilityCount: number;
  pricingMarkerCount: number;
  testimonialMarkerCount: number;
  ariaAttributeCount: number;
};

type ArtifactAnalysis = {
  format: string;
  characterCount: number;
  sha256: string;
  structure: ArtifactStructure;
  observations: string[];
  criterionSignals: {
    criterion: string;
    signals: string[];
  }[];
  security: {
    suspiciousInstructionCount: number;
    suspiciousInstructions: {
      type: string;
      excerpt: string;
    }[];
  };
};

type Evaluation = {
  status: "APPROVED" | "REVISION_REQUIRED" | "ESCALATE";
  score: number;
  confidence: number;
  criteria_results: CriterionResult[];
  summary: string;
  artifact_analysis?: ArtifactAnalysis | null;
};

type MilestoneInsightsProps = {
  milestoneId: string;
  criteria: string[];
  milestoneStatus: string;
  hasAuthorization: boolean;
  hasCapture: boolean;
};

function EvidenceMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-white/10 bg-[#171a21] p-3">
      <p className="text-xs leading-5 text-[#969eaf]">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-100">
        {value}
      </p>
    </div>
  );
}

function StructureCheck({
  label,
  detected,
}: {
  label: string;
  detected: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={
          detected
            ? "text-xs font-medium text-emerald-300"
            : "text-xs text-slate-400"
        }
      >
        {detected ? "Detected" : "Not detected"}
      </span>
    </div>
  );
}

export default function MilestoneInsights({
  milestoneId,
  criteria,
  milestoneStatus,
  hasAuthorization,
  hasCapture,
}: MilestoneInsightsProps) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        const response = await fetch(
          `/api/milestone/${milestoneId}/evaluation`,
          { cache: "no-store" },
        );

        if (!response.ok) throw new Error("Could not load verification evidence. Refresh to retry.");

        const data = await response.json();
        const result = data.evaluation ?? data.result ?? data;

        if (!cancelled) {
          setLoadError(null);
          setEvaluation(result && Array.isArray(result.criteria_results) ? result : null);
        }
      } catch (error) {
        console.error("Milestone insights loading error:", error);
        if (!cancelled) setLoadError("Could not load verification evidence. Refresh to retry.");
      }
    }

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [milestoneId, milestoneStatus]);

  const results = evaluation?.criteria_results ?? [];
  const artifact = evaluation?.artifact_analysis ?? null;
  const structure = artifact?.structure;
  const security = artifact?.security;

  const passedCount = results.filter((item) => item.passed).length;
  const score = evaluation ? Math.round(evaluation.score * 100) : null;
  const confidence = evaluation
    ? Math.round(evaluation.confidence * 100)
    : null;

  const suspiciousCount = security?.suspiciousInstructionCount ?? 0;
  const criterionSignals = artifact?.criterionSignals ?? [];
  const observations = artifact?.observations ?? [];

  const paymentLabel = hasCapture
    ? "Released"
    : hasAuthorization
      ? "Authorized"
      : "Not authorized";

  const paymentClass = hasCapture
    ? "text-emerald-300"
    : hasAuthorization
      ? "text-blue-300"
      : "text-[#969eaf]";

  return (
    <aside className="min-w-0 border-l border-white/10 pl-0 lg:pl-7">
      {loadError && <p role="alert" className="mb-4 border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">{loadError}</p>}
      {/* TRUST CHECK */}
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-semibold tracking-tight text-slate-100">
            Trust check
          </h4>

          <span
            className={
              milestoneStatus === "APPROVED" || milestoneStatus === "PAID"
                ? "text-sm font-medium text-emerald-300"
                : milestoneStatus === "REVISION_REQUIRED"
                  ? "text-sm font-medium text-orange-300"
                  : milestoneStatus === "DISPUTED"
                    ? "text-sm font-medium text-red-300"
                    : milestoneStatus === "UNDER_REVIEW"
                      ? "text-sm font-medium text-blue-300"
                      : "text-sm font-medium text-[#969eaf]"
            }
          >
            {milestoneStatus === "APPROVED" || milestoneStatus === "PAID"
              ? "Passed"
              : milestoneStatus === "REVISION_REQUIRED"
                ? "Revision needed"
                : milestoneStatus === "DISPUTED"
                  ? "Disputed"
                  : milestoneStatus === "UNDER_REVIEW"
                    ? "Reviewing"
                    : "Pending"}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          The submitted work is checked against the agreed acceptance criteria.
          The verification result does not directly release funds.
        </p>
      </div>

      {/* SCORE */}
      <div className="grid grid-cols-3 gap-3 border-b border-white/10 py-5">
        <div>
          <p className="text-xs text-[#969eaf]">Score</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">
            {score !== null ? `${score}%` : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#969eaf]">Confidence</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">
            {confidence !== null ? `${confidence}%` : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#969eaf]">Passed</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">
            {results.length > 0 ? `${passedCount}/${results.length}` : "—"}
          </p>
        </div>
      </div>

      {/* ACCEPTANCE CRITERIA */}
      <div className="py-5">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold text-slate-100">
            Acceptance criteria
          </h5>

          <span className="text-xs text-[#969eaf]">
            {results.length > 0
              ? `${passedCount}/${results.length} passed`
              : `${criteria.length} requirements`}
          </span>
        </div>

        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
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
                        ? "border-emerald-300 bg-emerald-400/10 text-emerald-300"
                        : passed === false
                          ? "border-orange-300 bg-orange-400/10 text-orange-300"
                          : "border-white/15 text-slate-400"
                    }`}
                  >
                    {passed === true ? "✓" : passed === false ? "!" : "·"}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm leading-5 text-slate-200">
                      {criterion}
                    </p>

                    {result?.evidence && (
                      <p className="mt-1 text-xs leading-5 text-[#969eaf]">
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

      {/* NEW: ARTIFACT EVIDENCE */}
      <section className="border-t border-white/10 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-blue-300">
              SOURCE ANALYSIS
            </p>

            <h5 className="mt-1 text-base font-semibold text-slate-100">
              Artifact evidence
            </h5>

            <p className="mt-1 text-xs leading-5 text-[#969eaf]">
              Observable signals extracted from the submitted content.
            </p>
          </div>

          <span
            className={`shrink-0 border px-2 py-1 text-[10px] font-medium ${
              artifact
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-700"
            }`}
          >
            {artifact ? "SAVED" : "MISSING"}
          </span>
        </div>

        {!artifact ? (
          <div className="mt-4 border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm font-medium text-amber-200">
              Artifact analysis unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              This evaluation has no stored artifact analysis. Run verification
              again on a submission processed by the updated analyzer.
            </p>
          </div>
        ) : (
          <>
            {/* Main evidence counters */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <EvidenceMetric
                label="Pricing markers"
                value={structure?.pricingMarkerCount ?? 0}
              />

              <EvidenceMetric
                label="Testimonial markers"
                value={structure?.testimonialMarkerCount ?? 0}
              />

              <EvidenceMetric
                label="Footer elements"
                value={structure?.footerCount ?? 0}
              />

              <EvidenceMetric
                label="CSS media queries"
                value={structure?.mediaQueryCount ?? 0}
              />
            </div>

            {/* Source fingerprint */}
            <div className="mt-3 border border-white/10 bg-[#171a21] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-400">
                  Content fingerprint
                </p>

                <span className="text-[10px] text-slate-400">SHA-256</span>
              </div>

              <p
                title={artifact.sha256}
                className="mt-2 break-all font-mono text-[10px] leading-5 text-slate-300"
              >
                {artifact.sha256}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#969eaf]">
                <span>Format: {artifact.format.toUpperCase()}</span>

                <span>
                  {artifact.characterCount.toLocaleString()} characters
                </span>
              </div>
            </div>

            {/* Detected source structure */}
            <details className="group mt-3 border border-white/10 bg-[#171a21]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium text-slate-200">
                  HTML structure
                </span>

                <span className="text-xs text-[#969eaf] transition-transform group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <div className="border-t border-white/10 px-3 pb-3">
                <StructureCheck
                  label="DOCTYPE"
                  detected={structure?.hasDoctype ?? false}
                />

                <StructureCheck
                  label="HTML root"
                  detected={structure?.hasHtmlRoot ?? false}
                />

                <StructureCheck
                  label="Head element"
                  detected={structure?.hasHead ?? false}
                />

                <StructureCheck
                  label="Body element"
                  detected={structure?.hasBody ?? false}
                />

                <div className="divide-y divide-slate-100">
                  {[
                    ["Navigation elements", structure?.navigationCount ?? 0],
                    ["Headings", structure?.headingCount ?? 0],
                    ["Links", structure?.linkCount ?? 0],
                    ["Images", structure?.imageCount ?? 0],
                    [
                      "Images with alt attributes",
                      structure?.imagesWithAltCount ?? 0,
                    ],
                    ["Forms", structure?.formCount ?? 0],
                    ["Scripts", structure?.scriptCount ?? 0],
                    ["Style blocks", structure?.styleBlockCount ?? 0],
                    [
                      "Responsive utility tokens",
                      structure?.responsiveUtilityCount ?? 0,
                    ],
                    ["ARIA attributes", structure?.ariaAttributeCount ?? 0],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="text-xs text-[#969eaf]">{label}</span>
                      <span className="text-xs font-medium text-slate-200">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            {/* Criterion-to-evidence mapping */}
            <details className="group mt-3 border border-white/10 bg-[#171a21]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium text-slate-200">
                  Requirement evidence
                </span>

                <span className="text-xs text-[#969eaf] transition-transform group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <div className="border-t border-white/10 px-3">
                {criterionSignals.length > 0 ? (
                  criterionSignals.map((item, index) => (
                    <div
                      key={`${item.criterion}-${index}`}
                      className="border-b border-white/10 py-3 last:border-0"
                    >
                      <p className="text-xs font-medium leading-5 text-slate-200">
                        {item.criterion}
                      </p>

                      <ul className="mt-2 space-y-2">
                        {item.signals.map((signal, signalIndex) => (
                          <li
                            key={`${index}-${signalIndex}`}
                            className="flex gap-2 text-xs leading-5 text-[#969eaf]"
                          >
                            <span className="text-blue-600">↳</span>
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-xs text-[#969eaf]">
                    No criterion-specific signals were recorded.
                  </p>
                )}
              </div>
            </details>

            {/* Analyzer observations */}
            <details className="group mt-3 border border-white/10 bg-[#171a21]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium text-slate-200">
                  Analyzer observations
                </span>

                <span className="text-xs text-[#969eaf] transition-transform group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <ul className="space-y-2 border-t border-white/10 p-3">
                {observations.map((observation, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-xs leading-5 text-[#969eaf]"
                  >
                    <span className="text-blue-600">·</span>
                    <span>{observation}</span>
                  </li>
                ))}
              </ul>
            </details>

            {/* Security signals */}
            <div className="mt-3 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-200">
                  Suspicious-instruction scan
                </p>

                <span
                  className={`text-xs font-medium ${
                    suspiciousCount > 0 ? "text-amber-700" : "text-emerald-300"
                  }`}
                >
                  {suspiciousCount} signal(s)
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#969eaf]">
                This pattern scanner is a limited security signal, not proof
                that a submission is safe or malicious.
              </p>

              {security?.suspiciousInstructions?.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className="mt-3 border border-amber-400/20 bg-amber-400/10 p-3"
                >
                  <p className="text-xs font-semibold text-amber-200">
                    {item.type}
                  </p>

                  <p className="mt-1 break-words text-xs leading-5 text-amber-800">
                    {item.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* PAYMENT */}
      <div className="border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#969eaf]">Payment</span>

          <span className={`text-sm font-semibold ${paymentClass}`}>
            {paymentLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {hasCapture
            ? "The authorized payment has been captured."
            : hasAuthorization
              ? milestoneStatus === "APPROVED"
                ? "Verification passed. The payment is eligible for release after policy validation."
                : "The payment remains protected until the milestone is approved."
              : "Payment must be authorized before this milestone can be released."}
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-xs text-[#969eaf]">
        AI recommends · Policy validates · PayPal executes
      </div>
    </aside>
  );
}
