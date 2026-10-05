export type PaymentPolicyInput = {
  milestoneStatus: string;
  evaluationStatus: string;
  confidence: number;
  criteriaResults: {
    passed: boolean;
  }[];
  hasAuthorization: boolean;
  hasOpenDispute: boolean;
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

  if (input.evaluationStatus !== "APPROVED") {
    reasons.push("AI verification did not approve the submission.");
  }

  if (input.confidence < 0.9) {
    reasons.push("AI verification confidence is below 90%.");
  }

  const allCriteriaPassed =
    input.criteriaResults.length > 0 &&
    input.criteriaResults.every((criterion) => criterion.passed);

  if (!allCriteriaPassed) {
    reasons.push("One or more acceptance criteria did not pass.");
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
