import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { captureAuthorizedPayPalPayment } from "@/lib/paypal/orders";
import {
  evaluatePaymentPolicy,
  type CriterionResult,
  type PaymentPolicyInput,
} from "@/lib/payment/policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasUnresolvedDispute } from "@/lib/payment/workflow-state";
import { completeProjectIfPaid } from "@/lib/payment/complete-project";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCriterionResult(value: unknown): value is CriterionResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.requirement === "string" &&
    typeof value.passed === "boolean" &&
    typeof value.evidence === "string"
  );
}

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ milestoneId: string }>;
  },
) {
  try {
    const { milestoneId } = await params;

    if (!milestoneId) {
      return NextResponse.json(
        { error: "Missing milestone ID." },
        { status: 400 },
      );
    }

    const userSupabase = await createUserClient();

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to release a payment." },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // 1. Load the milestone and the agreed acceptance criteria.

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select(
        "id, project_id, title, status, acceptance_criteria, paypal_authorization_id, paypal_capture_id, payment_release_locked_at",
      )
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }
    const { data: accessibleProject, error: accessError } = await userSupabase
      .from("projects")
      .select("id, currency")
      .eq("id", milestone.project_id)
      .eq("created_by", user.id)
      .maybeSingle();

    if (accessError) {
      console.error("Project access check failed:", accessError);

      return NextResponse.json(
        { error: "Could not verify project access." },
        { status: 500 },
      );
    }

    if (!accessibleProject) {
      return NextResponse.json(
        { error: "You are not authorized to access this project." },
        { status: 403 },
      );
    }
    if (accessibleProject.currency !== "USD") {
      return NextResponse.json(
        { error: "Payment currency must be USD. Reconcile this agreement before release." },
        { status: 409 },
      );
    }

    // 2. Handle already-completed or inconsistent payment states.

    if (milestone.status === "PAID") {
      if (!milestone.paypal_capture_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The milestone is marked as paid but has no capture ID. Reconciliation is required.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        released: true,
        captureId: milestone.paypal_capture_id,
      });
    }

    if (milestone.paypal_capture_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A capture ID already exists, but the milestone is not marked as paid. Reconciliation is required.",
        },
        { status: 409 },
      );
    }

    // 3. Load the latest submission, including its actual content.

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, version, status, submission_content")
      .eq("milestone_id", milestoneId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (submissionError || !submission) {
      console.error("Submission lookup error:", submissionError);

      return NextResponse.json(
        { error: "No submission was found for this milestone." },
        { status: 404 },
      );
    }

    if (submission.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          released: false,
          reasons: ["The latest submission has not been approved."],
        },
        { status: 409 },
      );
    }

    if (typeof submission.submission_content !== "string") {
      return NextResponse.json(
        {
          error: "The latest submission has no verifiable content.",
        },
        { status: 409 },
      );
    }

    // 4. Load the latest evaluation for this exact submission.

    const { data: evaluation, error: evaluationError } = await supabase
      .from("ai_evaluations")
      .select(
        "id, status, score, confidence, criteria_results, artifact_analysis, created_at",
      )
      .eq("submission_id", submission.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (evaluationError || !evaluation) {
      console.error("Evaluation lookup error:", evaluationError);

      return NextResponse.json(
        {
          error: "No AI verification result was found for this submission.",
        },
        { status: 409 },
      );
    }

    // 5. Validate the artifact analysis against the latest content.

    const artifactAnalysis: unknown = evaluation.artifact_analysis;

    let artifactAnalysisValid = false;
    let suspiciousInstructionCount: number | null = null;

    if (isRecord(artifactAnalysis)) {
      const security = artifactAnalysis.security;
      const storedHash = artifactAnalysis.sha256;

      if (
        typeof storedHash === "string" &&
        /^[a-f0-9]{64}$/i.test(storedHash) &&
        isRecord(security) &&
        typeof security.suspiciousInstructionCount === "number" &&
        Number.isInteger(security.suspiciousInstructionCount) &&
        security.suspiciousInstructionCount >= 0
      ) {
        const actualHash = createHash("sha256")
          .update(submission.submission_content, "utf8")
          .digest("hex");

        artifactAnalysisValid = actualHash === storedHash.toLowerCase();

        suspiciousInstructionCount = security.suspiciousInstructionCount;
      }
    }

    // 6. Validate acceptance criteria and stored results.

    const acceptanceCriteria = Array.isArray(milestone.acceptance_criteria)
      ? milestone.acceptance_criteria.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [];

    const rawResults: unknown = evaluation.criteria_results;

    const criteriaResultsWellFormed =
      Array.isArray(rawResults) && rawResults.every(isCriterionResult);

    const criteriaResults: CriterionResult[] = criteriaResultsWellFormed
      ? (rawResults as CriterionResult[])
      : [];

    // 7. Check for open disputes. A lookup failure must block release.

    const { data: disputes, error: disputeError } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("milestone_id", milestoneId);

    if (disputeError) {
      console.error("Dispute lookup error:", disputeError);

      return NextResponse.json(
        { error: "Could not verify dispute status." },
        { status: 500 },
      );
    }

    const hasOpenDispute = hasUnresolvedDispute(disputes ?? []);

    // 8. Build and execute the deterministic payment policy.

    const confidence =
      typeof evaluation.confidence === "number"
        ? evaluation.confidence
        : Number.NaN;

    const score =
      typeof evaluation.score === "number" ? evaluation.score : Number.NaN;

    const hasAuthorization =
      typeof milestone.paypal_authorization_id === "string" &&
      milestone.paypal_authorization_id.trim().length > 0;

    const policyInput: PaymentPolicyInput = {
      milestoneStatus: milestone.status,
      submissionStatus: submission.status,
      evaluationStatus: evaluation.status,
      score,
      confidence,
      acceptanceCriteria,
      criteriaResults,
      criteriaResultsWellFormed,
      hasAuthorization,
      hasOpenDispute,
      artifactAnalysisValid,
      suspiciousInstructionCount,
    };

    const policyResult = evaluatePaymentPolicy(policyInput);

    if (!policyResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          released: false,
          reasons: policyResult.reasons,
        },
        { status: 409 },
      );
    }
    // Acquire an atomic lock before contacting PayPal.

    const lockTimestamp = new Date().toISOString();

    const { data: lockAcquired, error: lockError } = await supabase
      .from("milestones")
      .update({
        payment_release_locked_at: lockTimestamp,
      })
      .eq("id", milestoneId)
      .eq("status", "APPROVED")
      .is("paypal_capture_id", null)
      .is("payment_release_locked_at", null)
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("Payment release lock error:", lockError);

      return NextResponse.json(
        { error: "Could not acquire the payment release lock." },
        { status: 500 },
      );
    }

    if (!lockAcquired) {
      return NextResponse.json(
        {
          success: false,
          released: false,
          error:
            "Payment release is already in progress or requires reconciliation.",
        },
        { status: 409 },
      );
    }
    // 9. Capture with a stable idempotency key.
    //
    // Repeated attempts for the same milestone and authorization
    // use the same key, including retries after a network failure.

    const authorizationId = milestone.paypal_authorization_id!;

    const paypalRequestId = createHash("sha256")
      .update(`trustlayer:capture:${milestone.id}:${authorizationId}`)
      .digest("hex")
      .slice(0, 32);

    const capture = await captureAuthorizedPayPalPayment(
      authorizationId,
      paypalRequestId,
    );

    if (!capture.id) {
      throw new Error(
        "PayPal returned no capture ID. Reconciliation is required.",
      );
    }

    // Do not mark the milestone as PAID unless PayPal reports
    // a completed capture.

    if (capture.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          released: false,
          error:
            "PayPal has not confirmed a completed capture. Reconcile the payment before retrying.",
          captureId: capture.id,
          captureStatus: capture.status,
        },
        { status: 409 },
      );
    }

    // 10. Update the milestone only after completed capture.

    const { data: updatedMilestone, error: milestoneUpdateError } =
      await supabase
        .from("milestones")
        .update({
          status: "PAID",
          paypal_capture_id: capture.id,
        })
        .eq("id", milestoneId)
        .eq("status", "APPROVED")
        .eq("payment_release_locked_at", lockTimestamp)
        .is("paypal_capture_id", null)
        .select("id, paypal_capture_id")
        .maybeSingle();

    if (milestoneUpdateError || !updatedMilestone) {
      // A verified webhook may have committed the same completed capture first.
      const { data: current, error: currentError } = await supabase
        .from("milestones")
        .select("status, paypal_capture_id")
        .eq("id", milestoneId)
        .maybeSingle();

      if (!currentError && current?.status === "PAID" && current.paypal_capture_id === capture.id) {
        const projectCompleted = await completeProjectIfPaid(supabase, milestone.project_id);
        return NextResponse.json({ success: true, released: true, milestoneId, captureId: capture.id, projectCompleted, reconciledByWebhook: true });
      }

      console.error("Milestone payment update error:", milestoneUpdateError);

      // The capture may already exist at PayPal. Never attempt
      // another capture with a different idempotency key.

      return NextResponse.json(
        {
          success: false,
          released: false,
          error:
            "PayPal completed the capture, but the milestone update did not complete. Reconciliation is required.",
          captureId: capture.id,
        },
        { status: 500 },
      );
    }

    // 11. Check whether all milestones for this project are paid.

    const { data: allMilestones, error: allMilestonesError } = await supabase
      .from("milestones")
      .select("status")
      .eq("project_id", milestone.project_id);

    if (allMilestonesError) {
      console.error("Project milestone lookup error:", allMilestonesError);
    }

    const projectCompleted =
      Array.isArray(allMilestones) &&
      allMilestones.length > 0 &&
      allMilestones.every((item) => item.status === "PAID");

    // 12. Mark the project completed when every milestone is paid.

    if (projectCompleted) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({ status: "COMPLETED" })
        .eq("id", milestone.project_id);

      if (projectUpdateError) {
        console.error("Project completion update error:", projectUpdateError);
      }
    }

    // 13. Record the release event.

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "PAYMENT_RELEASED",
        message: `Payment released for milestone "${milestone.title}" after policy validation and completed PayPal capture.`,
        metadata: {
          submissionId: submission.id,
          evaluationId: evaluation.id,
          paypalAuthorizationId: authorizationId,
          paypalCaptureId: capture.id,
          paypalRequestId,
          evaluationStatus: evaluation.status,
          score,
          confidence,
          policyApproved: true,
          artifactAnalysisValid,
          suspiciousInstructionCount,
        },
      });

    if (activityError) {
      console.error("Payment activity error:", activityError);
    }

    return NextResponse.json({
      success: true,
      released: true,
      milestoneId,
      captureId: capture.id,
      projectCompleted,
    });
  } catch (error) {
    console.error("Payment release error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Payment release failed.",
      },
      { status: 500 },
    );
  }
}
