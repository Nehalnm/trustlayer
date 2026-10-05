import { NextResponse } from "next/server";

import { captureAuthorizedPayPalPayment } from "@/lib/paypal/orders";
import {
  evaluatePaymentPolicy,
  type PaymentPolicyInput,
} from "@/lib/payment/policy";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const supabase = createAdminClient();

    /*
     * 1. Load the milestone.
     */
    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select(
        "id, project_id, title, status, paypal_authorization_id, paypal_capture_id",
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

    /*
     * Prevent an already-paid milestone from being
     * captured again.
     */
    if (milestone.status === "PAID") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        captureId: milestone.paypal_capture_id,
      });
    }

    /*
     * 2. Load the latest submission.
     */
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, version")
      .eq("milestone_id", milestoneId)
      .order("version", {
        ascending: false,
      })
      .limit(1)
      .single();

    if (submissionError || !submission) {
      console.error("Submission lookup error:", submissionError);

      return NextResponse.json(
        {
          error: "No submission was found for this milestone.",
        },
        { status: 404 },
      );
    }

    /*
     * 3. Load the latest AI evaluation for that submission.
     */
    const { data: evaluation, error: evaluationError } = await supabase
      .from("ai_evaluations")
      .select("id, status, score, confidence, criteria_results, created_at")
      .eq("submission_id", submission.id)
      .order("created_at", {
        ascending: false,
      })
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

    /*
     * 4. Check for an open dispute.
     *
     * We treat OPEN and UNDER_REVIEW disputes as
     * blocking payment release.
     */
    const { data: disputes, error: disputeError } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("milestone_id", milestoneId);

    if (disputeError) {
      console.error("Dispute lookup error:", disputeError);

      return NextResponse.json(
        {
          error: "Could not verify dispute status.",
        },
        { status: 500 },
      );
    }

    const hasOpenDispute = (disputes ?? []).some(
      (dispute) =>
        dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW",
    );

    /*
     * 5. Build deterministic policy input.
     */
    const criteriaResults = Array.isArray(evaluation.criteria_results)
      ? evaluation.criteria_results.filter(
          (
            item,
          ): item is {
            passed: boolean;
          } =>
            typeof item === "object" &&
            item !== null &&
            "passed" in item &&
            typeof (
              item as {
                passed?: unknown;
              }
            ).passed === "boolean",
        )
      : [];

    const policyInput: PaymentPolicyInput = {
      milestoneStatus: milestone.status,

      evaluationStatus: evaluation.status,

      confidence: Number(evaluation.confidence ?? 0),

      criteriaResults,

      hasAuthorization: Boolean(milestone.paypal_authorization_id),

      hasOpenDispute,
    };

    /*
     * 6. Run the policy engine.
     */
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

    /*
     * 7. PayPal capture.
     *
     * This is the ONLY point in the current
     * TrustLayer flow where the authorized payment
     * is actually captured.
     */
    const capture = await captureAuthorizedPayPalPayment(
      milestone.paypal_authorization_id!,
    );

    const captureId = capture.id;

    if (!captureId) {
      throw new Error(
        "PayPal capture succeeded but no capture ID was returned.",
      );
    }

    /*
     * 8. Mark the milestone as PAID.
     */
    const { error: milestoneUpdateError } = await supabase
      .from("milestones")
      .update({
        status: "PAID",
        paypal_capture_id: captureId,
      })
      .eq("id", milestoneId);

    if (milestoneUpdateError) {
      console.error("Milestone payment update error:", milestoneUpdateError);

      return NextResponse.json(
        {
          error:
            "Payment was captured, but the milestone could not be updated.",
          captureId,
        },
        { status: 500 },
      );
    }

    /*
     * 9. Check whether every milestone is now paid.
     */
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

    /*
     * 10. Update project status when all milestones
     * have been paid.
     */
    if (projectCompleted) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          status: "COMPLETED",
        })
        .eq("id", milestone.project_id);

      if (projectUpdateError) {
        console.error("Project completion update error:", projectUpdateError);
      }
    }

    /*
     * 11. Record the payment release.
     */
    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "PAYMENT_RELEASED",
        message: `Payment released for milestone "${milestone.title}" after successful AI verification.`,
        metadata: {
          submissionId: submission.id,
          evaluationId: evaluation.id,
          paypalAuthorizationId: milestone.paypal_authorization_id,
          paypalCaptureId: captureId,
          evaluationStatus: evaluation.status,
          confidence: evaluation.confidence,
          policyApproved: true,
        },
      });

    if (activityError) {
      console.error("Payment activity error:", activityError);
    }

    return NextResponse.json({
      success: true,
      released: true,
      milestoneId,
      captureId,
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
