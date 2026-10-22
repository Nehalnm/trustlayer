export type CriterionResult = {
  requirement: string;
  passed: boolean;
  evidence: string;
};

export type PaymentPolicyInput = {
  milestoneStatus: string;
  submissionStatus: string;
  evaluationStatus: string;
  score: number;
  confidence: number;
  acceptanceCriteria: string[];
  criteriaResults: CriterionResult[];
  criteriaResultsWellFormed: boolean;
  hasAuthorization: boolean;
  hasOpenDispute: boolean;
  artifactAnalysisValid: boolean;
  suspiciousInstructionCount: number | null;
};

export type PaymentPolicyResult = {
  allowed: boolean;
  reasons: string[];
};

export function evaluatePaymentPolicy(
  input: PaymentPolicyInput,
): PaymentPolicyResult {
  const reasons: string[] = [];

  if (input.milestoneStatus !== "APPROVED") {
    reasons.push("Milestone has not been approved.");
  }

  if (input.submissionStatus !== "APPROVED") {
    reasons.push("The latest submission has not been approved.");
  }

  if (input.evaluationStatus !== "APPROVED") {
    reasons.push("AI verification did not approve the submission.");
  }

  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 1) {
    reasons.push("The evaluation score is invalid.");
  }

  if (
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    reasons.push("The evaluation confidence is invalid.");
  } else if (input.confidence < 0.9) {
    reasons.push("AI verification confidence is below 90%.");
  }

  const criteria = input.acceptanceCriteria;

  const criteriaAreValid =
    Array.isArray(criteria) &&
    criteria.length > 0 &&
    criteria.every(
      (criterion) =>
        typeof criterion === "string" && criterion.trim().length > 0,
    );

  if (!criteriaAreValid) {
    reasons.push("The milestone has no valid acceptance criteria.");
  }

  if (!input.criteriaResultsWellFormed) {
    reasons.push("The stored criterion results are malformed.");
  }

  const results = input.criteriaResults;

  const resultQueues = new Map<string, CriterionResult[]>();

  for (const result of results) {
    const key = result.requirement.trim().toLowerCase();
    const queue = resultQueues.get(key) ?? [];

    queue.push(result);
    resultQueues.set(key, queue);
  }

  let coverageValid =
    criteriaAreValid &&
    input.criteriaResultsWellFormed &&
    results.length === criteria.length;

  const matchedResults: CriterionResult[] = [];

  if (criteriaAreValid) {
    for (const criterion of criteria) {
      const key = criterion.trim().toLowerCase();
      const match = resultQueues.get(key)?.shift();

      if (!match) {
        coverageValid = false;
      } else {
        matchedResults.push(match);
      }
    }
  }

  // Reject extra results that do not correspond to agreed criteria.
  for (const queue of resultQueues.values()) {
    if (queue.length > 0) {
      coverageValid = false;
    }
  }

  if (!coverageValid) {
    reasons.push(
      "The verification results do not match every agreed acceptance criterion exactly.",
    );
  }

  const allCriteriaPassed =
    coverageValid &&
    matchedResults.length === criteria.length &&
    matchedResults.every(
      (criterion) => criterion.passed && criterion.evidence.trim().length > 0,
    );

  if (!allCriteriaPassed) {
    reasons.push(
      "One or more acceptance criteria lack a passing result with evidence.",
    );
  }

  if (!input.artifactAnalysisValid) {
    reasons.push(
      "Artifact analysis is missing, invalid, or does not match the latest submission.",
    );
  }

  if (
    input.suspiciousInstructionCount === null ||
    !Number.isInteger(input.suspiciousInstructionCount) ||
    input.suspiciousInstructionCount < 0
  ) {
    reasons.push("Artifact security signals could not be validated.");
  } else if (input.suspiciousInstructionCount > 0) {
    reasons.push(
      "Suspicious instructions were detected in the submission; manual review is required.",
    );
  }

  if (!input.hasAuthorization) {
    reasons.push("No PayPal authorization is attached to this milestone.");
  }

  if (input.hasOpenDispute) {
    reasons.push("The milestone has an open dispute.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}
