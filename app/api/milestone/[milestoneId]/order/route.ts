import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPayPalOrder } from "@/lib/paypal/orders";

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
      .select("id, amount, status, project_id, paypal_order_id")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    if (milestone.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "This milestone is not available for payment protection.",
        },
        { status: 409 },
      );
    }

    if (milestone.paypal_order_id) {
      return NextResponse.json({
        id: milestone.paypal_order_id,
      });
    }

    const amount = Number(milestone.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid milestone amount" },
        { status: 400 },
      );
    }

    const orderId = await createPayPalOrder(amount.toFixed(2));

    const { error: updateError } = await supabase
      .from("milestones")
      .update({
        paypal_order_id: orderId,
      })
      .eq("id", milestoneId);

    if (updateError) {
      console.error("Failed to save PayPal order ID:", updateError);

      return NextResponse.json(
        {
          error:
            "PayPal order was created, but could not be linked to the milestone.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: orderId,
    });
  } catch (error) {
    console.error("Milestone PayPal order error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create milestone payment order.",
      },
      { status: 500 },
    );
  }
}
