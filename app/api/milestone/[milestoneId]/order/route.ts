import { NextResponse } from "next/server";

import { createClient as createUserClient } from "@/lib/supabase/server";
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
        { error: "You must be signed in to protect a payment." },
        { status: 401 },
      );
    }

    // 2. Load the milestone using the server-side admin client.

    const supabase = createAdminClient();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, amount, status, project_id, paypal_order_id")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

    // 3. Verify project ownership using the authenticated user's client.
    // The projects SELECT RLS policy restricts access to owned projects.

    const { data: accessibleProject, error: projectAccessError } =
      await userSupabase
        .from("projects")
        .select("id, currency")
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
        { error: "You are not authorized to protect this payment." },
        { status: 403 },
      );
    }

    if (accessibleProject.currency !== "USD") {
      return NextResponse.json(
        { error: "This demo supports USD payments only. No currency conversion is performed." },
        { status: 422 },
      );
    }

    // 4. Return an existing order only after authentication
    // and project ownership have been verified.

    if (milestone.paypal_order_id) {
      if (milestone.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "This milestone is no longer available for payment protection.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        id: milestone.paypal_order_id,
      });
    }

    // 5. Only pending milestones can receive a new order.

    if (milestone.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "This milestone is not available for payment protection.",
        },
        { status: 409 },
      );
    }

    const amount = Number(milestone.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid milestone amount." },
        { status: 400 },
      );
    }

    // 6. Create the PayPal order.

    const orderId = await createPayPalOrder(amount.toFixed(2));

    // 7. Link the order to the milestone only if it is still pending
    // and has not already been linked to a different order.

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("milestones")
      .update({
        paypal_order_id: orderId,
      })
      .eq("id", milestoneId)
      .eq("status", "PENDING")
      .is("paypal_order_id", null)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedMilestone) {
      console.error("Failed to link PayPal order to milestone:", updateError);

      return NextResponse.json(
        {
          error:
            "The PayPal order was created but could not be linked to the milestone. Check the payment state before retrying.",
        },
        { status: 409 },
      );
    }

    // 8. Return the order ID to the authorized caller.

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
