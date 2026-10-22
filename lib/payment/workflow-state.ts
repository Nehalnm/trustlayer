export type VerificationDecision = "APPROVED" | "REVISION_REQUIRED" | "ESCALATE";

// ESCALATE is an evaluation decision, not a valid submissions.status value.
export function verificationStates(decision: VerificationDecision) {
  return decision === "ESCALATE"
    ? { submission: "UNDER_REVIEW", milestone: "DISPUTED" }
    : { submission: decision, milestone: decision };
}

// Fail closed for unfamiliar states; only RESOLVED stops blocking payment.
export function hasUnresolvedDispute(disputes: { status: string }[]) {
  return disputes.some((dispute) => dispute.status !== "RESOLVED");
}
