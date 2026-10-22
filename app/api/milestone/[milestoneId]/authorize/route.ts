import { NextResponse } from "next/server";

import { createClient as createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizePayPalOrder } from "@/lib/paypal/orders";

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

    // 1. Authenticate the caller.

    const userSupabase = await createUserClient();

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to authorize a payment." },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // 2. Load the milestone and its existing PayPal payment details.

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select(
        "id, project_id, status, paypal_order_id, paypal_authorization_id",
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

    // 3. Verify access through the signed-in user's RLS policies.

    const { data: accessibleProject, error: projectAccessError } =
      await userSupabase
        .from("projects")
        .select("id")
        .eq("id", milestone.project_id)
        .eq("created_by", user.id)
        .maybeSingle();

    if (projectAccessError) {
      console.error("Project access check failed:", projectAccessError);

      return NextResponse.json(
        { error: "Could not verify project access." },
        { status: 500 },
      );
    }

    if (!accessibleProject) {
      return NextResponse.json(
        {
          error: "You are not authorized to authorize this payment.",
        },
        { status: 403 },
      );
    }

    // 4. Require an existing PayPal order.

    if (!milestone.paypal_order_id) {
      return NextResponse.json(
        {
          error: "This milestone does not have a PayPal order yet.",
        },
        { status: 409 },
      );
    }

    // 5. Return the existing authorization for safe retries.

    if (milestone.paypal_authorization_id) {
      return NextResponse.json({
        success: true,
        authorizationId: milestone.paypal_authorization_id,
        alreadyAuthorized: true,
      });
    }

    // 6. Only a pending milestone can receive a new authorization.

    if (milestone.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "This milestone is not available for payment authorization.",
        },
        { status: 409 },
      );
    }

    // 7. Authorize the existing PayPal order.

    const authorization = await authorizePayPalOrder(milestone.paypal_order_id);

    const authorizationId =
      authorization.purchaseUnits?.[0]?.payments?.authorizations?.[0]?.id;

    if (!authorizationId) {
      console.error(
        "PayPal authorization response did not include an authorization ID.",
      );

      return NextResponse.json(
        {
          error:
            "PayPal returned no authorization ID. Reconcile the payment state before retrying.",
        },
        { status: 502 },
      );
    }

    // 8. Save the authorization only if the milestone is still pending
    // and does not already have another recorded authorization.

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("milestones")
      .update({
        paypal_authorization_id: authorizationId,
        status: "FUNDED",
      })
      .eq("id", milestoneId)
      .eq("status", "PENDING")
      .is("paypal_authorization_id", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedMilestone) {
      console.error("Failed to persist PayPal authorization:", updateError);

      return NextResponse.json(
        {
          error:
            "PayPal may have authorized the payment, but the milestone update did not complete. Reconciliation is required before retrying.",
        },
        { status: 409 },
      );
    }

    // 9. Record the authorization event.

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "PAYMENT_AUTHORIZED",
        message: "Milestone payment was authorized by PayPal.",
        metadata: {
          paypalOrderId: milestone.paypal_order_id,
          paypalAuthorizationId: authorizationId,
          authorizedBy: user.id,
        },
      });

    if (activityError) {
      console.error("Activity event error:", activityError);
    }

    // 10. Return the authorization result.
    // Authorization does not capture or release the funds.

    return NextResponse.json({
      success: true,
      authorizationId,
    });
  } catch (error) {
    console.error("Milestone PayPal authorization error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to authorize milestone payment.",
      },
      { status: 500 },
    );
  }
}
