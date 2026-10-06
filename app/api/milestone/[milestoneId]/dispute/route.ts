import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
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

    const body = await request.json();
    const reason = body?.reason;

    if (typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        {
          error: "Please provide a dispute reason.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, project_id, title, status")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

    /*
     * A dispute can be opened while payment is
     * protected, even before work is submitted.
     *
     * Paid milestones remain locked.
     */
    if (milestone.status === "PAID") {
      return NextResponse.json(
        {
          error: "A paid milestone cannot be disputed through this flow.",
        },
        { status: 409 },
      );
    }

    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("milestone_id", milestoneId)
      .in("status", ["OPEN", "UNDER_REVIEW"])
      .maybeSingle();

    if (existingDispute) {
      return NextResponse.json(
        {
          error: "An open dispute already exists for this milestone.",
        },
        { status: 409 },
      );
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        raised_by: "CLIENT",
        reason: reason.trim(),
        status: "OPEN",
      })
      .select("id, status")
      .single();

    if (disputeError || !dispute) {
      console.error("Dispute creation error:", disputeError);

      return NextResponse.json(
        {
          error: "Failed to create dispute.",
        },
        { status: 500 },
      );
    }

    const { error: milestoneUpdateError } = await supabase
      .from("milestones")
      .update({
        status: "DISPUTED",
      })
      .eq("id", milestoneId);

    if (milestoneUpdateError) {
      console.error("Milestone dispute update error:", milestoneUpdateError);

      return NextResponse.json(
        {
          error: "Dispute was created, but the milestone could not be updated.",
        },
        { status: 500 },
      );
    }

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "DISPUTE_OPENED",
        message: `Dispute opened for milestone "${milestone.title}".`,
        metadata: {
          disputeId: dispute.id,
          paymentProtected: milestone.status === "FUNDED",
        },
      });

    if (activityError) {
      console.error("Dispute activity error:", activityError);
    }

    return NextResponse.json({
      success: true,
      disputeId: dispute.id,
      status: dispute.status,
    });
  } catch (error) {
    console.error("Dispute API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to open dispute.",
      },
      { status: 500 },
    );
  }
}
