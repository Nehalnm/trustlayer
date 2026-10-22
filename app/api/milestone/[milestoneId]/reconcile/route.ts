import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayPalOrder, getPayPalCapture, getPayPalAuthorization } from "@/lib/paypal/orders";
import { inspectRecoveryOrder, validateCompletedCapture, usdCents } from "@/lib/payment/reconciliation";
import { completeProjectIfPaid } from "@/lib/payment/complete-project";

/** Reconcile existing PayPal evidence. No capture, authorization, or unlock call. */
export async function POST(_request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to check payment status." }, { status: 401 });
    const { milestoneId } = await params;
    const db = createAdminClient();
    const { data: milestone, error } = await db.from("milestones")
      .select("id, project_id, amount, status, paypal_order_id, paypal_authorization_id, paypal_capture_id, payment_release_locked_at")
      .eq("id", milestoneId).maybeSingle();
    if (error) throw new Error("Milestone lookup failed.");
    if (!milestone) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    const { data: project, error: accessError } = await userClient.from("projects")
      .select("id, currency").eq("id", milestone.project_id).eq("created_by", user.id).maybeSingle();
    if (accessError) throw new Error("Project access check failed.");
    if (!project) return NextResponse.json({ error: "Project access denied." }, { status: 403 });
    if (!milestone.paypal_order_id) return NextResponse.json({ error: "No PayPal order is linked to this milestone." }, { status: 409 });

    const expected = { orderId: milestone.paypal_order_id, authorizationId: milestone.paypal_authorization_id,
      captureId: milestone.paypal_capture_id, amount: milestone.amount, currency: project.currency };
    const order = await getPayPalOrder(expected.orderId);
    const evidence = inspectRecoveryOrder(expected, order);

    // A process may stop after recording the response but before saving PAID.
    // Only a server-recorded receipt may supplement a missing capture in the order.
    let captureId = evidence.captureId;
    if (!captureId) {
      const { data: receipt, error: receiptError } = await db.from("activity_events")
        .select("metadata").eq("milestone_id", milestoneId)
        .eq("event_type", "PAYMENT_CAPTURE_OBSERVED").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (receiptError) throw new Error("Could not inspect recorded payment receipts.");
      if (typeof receipt?.metadata?.paypalCaptureId === "string") captureId = receipt.metadata.paypalCaptureId;
    }

    if (captureId) {
      const capture = await getPayPalCapture(captureId);
      validateCompletedCapture(expected, evidence.authorizationId, evidence.merchantId, captureId, capture);
      let changed = false;
      if (milestone.status !== "PAID" || milestone.paypal_capture_id !== captureId) {
        const update = db.from("milestones").update({ status: "PAID", paypal_capture_id: captureId,
          paypal_authorization_id: evidence.authorizationId }).eq("id", milestoneId)
          .eq("paypal_order_id", expected.orderId);
        // Compare the values we observed; never replace a conflicting payment.
        const captureGuard = expected.captureId ? update.eq("paypal_capture_id", expected.captureId) : update.is("paypal_capture_id", null);
        const authGuard = expected.authorizationId ? captureGuard.eq("paypal_authorization_id", expected.authorizationId) : captureGuard.is("paypal_authorization_id", null);
        const { data: updated, error: updateError } = await authGuard.select("id").maybeSingle();
        if (updateError) throw new Error("Payment evidence is confirmed but the database update failed.");
        if (!updated) {
          const { data: current, error: currentError } = await db.from("milestones").select("status, paypal_capture_id")
            .eq("id", milestoneId).maybeSingle();
          if (currentError || current?.status !== "PAID" || current.paypal_capture_id !== captureId) {
            throw new Error("Payment changed concurrently. Review is required.");
          }
        } else changed = true;
      }
      const projectCompleted = await completeProjectIfPaid(db, project.id);
      if (changed) {
        const { error: logError } = await db.from("activity_events").insert({ project_id: project.id, milestone_id: milestoneId,
          event_type: "PAYMENT_RECONCILED", message: "An existing completed PayPal capture was independently checked and reconciled.",
          metadata: { checkedBy: user.id, paypalOrderId: expected.orderId, paypalAuthorizationId: evidence.authorizationId,
            paypalCaptureId: captureId, amount: milestone.amount, currency: project.currency } });
        if (logError) console.error("Payment reconciliation activity failed:", logError);
      }
      return NextResponse.json({ reconciled: true, state: "PAID", projectCompleted,
        message: "PayPal confirms this payment was already captured. The project record is synchronized." });
    }

    const authorization = await getPayPalAuthorization(evidence.authorizationId);
    if (authorization.id !== evidence.authorizationId || authorization.amount?.currencyCode !== project.currency ||
      usdCents(authorization.amount?.value) !== usdCents(milestone.amount)) throw new Error("Authorization evidence does not match.");
    const expired = !authorization.expirationTime || !Number.isFinite(Date.parse(authorization.expirationTime)) ||
      Date.parse(authorization.expirationTime) <= Date.now();
    if (authorization.status !== "CREATED" || expired) {
      return NextResponse.json({ reconciled: false, state: "REVIEW_REQUIRED",
        message: "No matching completed capture is confirmed. The authorization is not currently confirmed as available; manual review is required. No lock was cleared." });
    }
    if (!milestone.paypal_authorization_id && milestone.status === "PENDING" && !milestone.payment_release_locked_at && !milestone.paypal_capture_id) {
      const { data: updated, error: updateError } = await db.from("milestones")
        .update({ paypal_authorization_id: evidence.authorizationId, status: "FUNDED" })
        .eq("id", milestoneId).eq("status", "PENDING").eq("paypal_order_id", expected.orderId)
        .is("paypal_authorization_id", null).is("paypal_capture_id", null).is("payment_release_locked_at", null)
        .select("id").maybeSingle();
      if (updateError || !updated) throw new Error("The authorization could not be reconciled safely.");
      const { error: logError } = await db.from("activity_events").insert({ project_id: project.id, milestone_id: milestoneId,
        event_type: "AUTHORIZATION_RECONCILED", message: "An existing PayPal authorization was checked and restored to the milestone.",
        metadata: { checkedBy: user.id, paypalAuthorizationId: evidence.authorizationId } });
      if (logError) console.error("Authorization recovery activity failed:", logError);
      return NextResponse.json({ reconciled: true, state: "FUNDED", message: "The existing PayPal authorization is restored. No new payment was requested." });
    }
    return NextResponse.json({ reconciled: false, state: "AUTHORIZED", expiresAt: authorization.expirationTime,
      message: milestone.payment_release_locked_at
        ? "Authorization exists, but an interrupted operation remains locked. No completed capture was confirmed. Manual review is required before retrying."
        : "PayPal confirms the authorization. No completed capture is present. No payment was requested." });
  } catch (error) {
    console.error("Payment reconciliation failed:", error);
    return NextResponse.json({ error: "Payment evidence could not be safely reconciled. Existing locks remain in place; review the payment before retrying." }, { status: 409 });
  }
}
