import { NextResponse } from "next/server";

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
        { error: "Missing milestone ID" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

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
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    if (!milestone.paypal_order_id) {
      return NextResponse.json(
        {
          error: "This milestone does not have a PayPal order yet.",
        },
        { status: 409 },
      );
    }

    if (milestone.paypal_authorization_id) {
      return NextResponse.json({
        success: true,
        authorizationId: milestone.paypal_authorization_id,
      });
    }

    const authorization = await authorizePayPalOrder(milestone.paypal_order_id);

    const authorizationId =
      authorization.purchaseUnits?.[0]?.payments?.authorizations?.[0]?.id;

    if (!authorizationId) {
      console.error("PayPal authorization response:", authorization);

      return NextResponse.json(
        {
          error:
            "PayPal authorized the order, but no authorization ID was returned.",
        },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("milestones")
      .update({
        paypal_authorization_id: authorizationId,
        status: "FUNDED",
      })
      .eq("id", milestoneId);

    if (updateError) {
      console.error("Failed to update milestone:", updateError);

      return NextResponse.json(
        {
          error:
            "Payment was authorized, but the milestone could not be updated.",
        },
        { status: 500 },
      );
    }

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "PAYMENT_AUTHORIZED",
        message: "Milestone payment was authorized and protected by PayPal.",
        metadata: {
          paypalOrderId: milestone.paypal_order_id,
          paypalAuthorizationId: authorizationId,
        },
      });

    if (activityError) {
      console.error("Activity event error:", activityError);
    }

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
