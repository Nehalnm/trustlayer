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
  created_at: string;
  artifact_analysis: ArtifactAnalysis | null;
};

type EvaluationResultProps = {
  milestoneId: string;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/10 bg-[#171a21] p-4">
      <p className="text-xs text-[#969eaf]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
        {value}
      </p>
    </div>
  );
}

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
      <div className="mt-6 border border-white/10 bg-[#171a21] px-5 py-4 text-sm text-slate-400">
        Loading verification evidence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  const percentage = Math.round(evaluation.score * 100);
  const confidencePercentage = Math.round(evaluation.confidence * 100);
  const artifact = evaluation.artifact_analysis;
  const structure = artifact?.structure;
  const security = artifact?.security;

  const statusStyles =
    evaluation.status === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : evaluation.status === "REVISION_REQUIRED"
        ? "border-orange-200 bg-orange-400/10 text-orange-200"
        : "border-red-400/20 bg-red-400/10 text-red-200";

  return (
    <div className="mt-8 space-y-6 border-t border-white/10 pt-7">
      {/* VERIFICATION SUMMARY */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#969eaf]">
              TRUSTLAYER / VERIFICATION
            </p>

            <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-100">
              Verification result
            </h4>

            <p className="mt-1 text-sm text-[#969eaf]">
              AI assessment and supporting source-level evidence
            </p>
          </div>

          <span
            className={`inline-flex w-fit border px-3 py-1.5 text-xs font-semibold ${statusStyles}`}
          >
            {evaluation.status.replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Metric label="Verification score" value={`${percentage}%`} />
          <Metric label="AI confidence" value={`${confidencePercentage}%`} />
        </div>

        <div className="mt-4 border border-white/10 bg-[#171a21] p-5">
          <p className="text-sm font-semibold text-slate-100">
            Verification summary
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {evaluation.summary}
          </p>
        </div>
      </section>

      {/* ARTIFACT ANALYSIS */}
      <section className="overflow-hidden border border-[#1b2940] bg-[#101216] text-white">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-wide text-slate-400">
                STATIC ANALYSIS / SOURCE INSPECTION
              </p>

              <h4 className="mt-2 text-lg font-semibold tracking-tight">
                Artifact evidence
              </h4>
            </div>

            <span
              className={`border px-2.5 py-1 text-[10px] font-medium ${
                artifact
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-300"
              }`}
            >
              {artifact ? "ANALYSIS SAVED" : "NO ANALYSIS"}
            </span>
          </div>

          {artifact && (
            <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-400">
              <span>
                Format{" "}
                <strong className="ml-1 font-medium text-white">
                  {artifact.format.toUpperCase()}
                </strong>
              </span>

              <span>
                Characters{" "}
                <strong className="ml-1 font-medium text-white">
                  {artifact.characterCount.toLocaleString()}
                </strong>
              </span>
            </div>
          )}
        </div>

        {!artifact ? (
          <div className="px-5 py-6 text-sm leading-6 text-slate-300 sm:px-6">
            No artifact analysis was saved for this evaluation. Run verification
            on a submission processed by the updated analyzer.
          </div>
        ) : (
          <div className="space-y-6 p-5 sm:p-6">
            {/* STRUCTURAL SIGNALS */}
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400">
                DETECTED STRUCTURE
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Footer elements</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.footerCount ?? 0}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Navigation elements</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.navigationCount ?? 0}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Anchor links</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.linkCount ?? 0}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Pricing markers</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.pricingMarkerCount ?? 0}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">Testimonial markers</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.testimonialMarkerCount ?? 0}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-400">CSS media queries</p>
                  <p className="mt-1 text-xl font-semibold">
                    {structure?.mediaQueryCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-3 border border-white/10 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Responsive utility tokens
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {structure?.responsiveUtilityCount ?? 0}
                </p>
              </div>
            </div>

            {/* REQUIREMENT SIGNAL MAPPING */}
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400">
                REQUIREMENT → EVIDENCE SIGNALS
              </p>

              <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                {artifact.criterionSignals.map((item, index) => (
                  <div key={`${item.criterion}-${index}`} className="py-4">
                    <p className="text-sm font-medium text-white">
                      {item.criterion}
                    </p>

                    <ul className="mt-2 space-y-2">
                      {item.signals.map((signal, signalIndex) => (
                        <li
                          key={`${index}-${signalIndex}`}
                          className="flex gap-2 text-sm leading-5 text-slate-400"
                        >
                          <span className="text-blue-300">↳</span>
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {artifact.criterionSignals.length === 0 && (
                  <p className="py-4 text-sm text-slate-400">
                    No criterion-specific signals were generated.
                  </p>
                )}
              </div>
            </div>

            {/* OBSERVATIONS */}
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400">
                ANALYZER OBSERVATIONS
              </p>

              <ul className="mt-3 space-y-2">
                {artifact.observations.map((observation, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-sm leading-6 text-slate-300"
                  >
                    <span className="text-blue-300">·</span>
                    <span>{observation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECURITY SIGNALS */}
            <div className="border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">
                  Suspicious instruction scan
                </p>

                <span
                  className={`text-xs font-medium ${
                    security && security.suspiciousInstructionCount > 0
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }`}
                >
                  {security?.suspiciousInstructionCount ?? 0} signal(s)
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                This scanner flags selected patterns in submitted text. It is
                not a complete security assessment and does not prove that an
                artifact is safe or malicious.
              </p>

              {security && security.suspiciousInstructions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {security.suspiciousInstructions.map((item, index) => (
                    <div
                      key={`${item.type}-${index}`}
                      className="border border-amber-400/20 bg-amber-400/[0.05] p-3"
                    >
                      <p className="text-xs font-semibold text-amber-200">
                        {item.type}
                      </p>

                      <p className="mt-2 break-words text-xs leading-5 text-slate-300">
                        {item.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CONTENT FINGERPRINT */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400">
                SHA-256 CONTENT FINGERPRINT
              </p>

              <p
                title={artifact.sha256}
                className="mt-2 break-all font-mono text-xs leading-5 text-blue-200"
              >
                {artifact.sha256}
              </p>

              <p className="mt-2 text-xs text-[#969eaf]">
                Fingerprint of the submitted content used for this analysis. It
                identifies the content; it does not certify its correctness.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* AI CRITERIA RESULTS */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-slate-100">
            Acceptance criteria results
          </h4>

          <span className="text-xs text-[#969eaf]">
            {
              evaluation.criteria_results.filter((result) => result.passed)
                .length
            }
            {" / "}
            {evaluation.criteria_results.length} passed
          </span>
        </div>

        <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
          {evaluation.criteria_results.map((result, index) => (
            <div key={index} className="flex gap-3 py-4">
              <span
                className={`mt-0.5 font-semibold ${
                  result.passed ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {result.passed ? "✓" : "×"}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">
                  {result.requirement}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {result.evidence}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
