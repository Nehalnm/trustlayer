import { NextResponse } from "next/server";

import { createClient as createUserClient } from "@/lib/supabase/server";
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

    // 1. Authenticate the caller.

    const userSupabase = await createUserClient();

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to open a dispute." },
        { status: 401 },
      );
    }

    // 2. Validate the request body.

    let body: { reason?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const reason = body?.reason;

    if (typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a dispute reason of at least 10 characters." },
        { status: 400 },
      );
    }

    // 3. Load the milestone and its current lock state.

    const supabase = createAdminClient();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, project_id, title, status, payment_release_locked_at")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

    // 4. Verify project access under the signed-in user's RLS policies.

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
        { error: "You are not authorized to dispute this milestone." },
        { status: 403 },
      );
    }

    // 5. A completed payment cannot be disputed through this endpoint.

    if (milestone.status === "PAID") {
      return NextResponse.json(
        {
          error: "A paid milestone cannot be disputed through this flow.",
        },
        { status: 409 },
      );
    }

    // 6. Check for an existing open dispute.

    const { data: existingDispute, error: existingDisputeError } =
      await supabase
        .from("disputes")
        .select("id, status")
        .eq("milestone_id", milestoneId)
        .neq("status", "RESOLVED")
        .maybeSingle();

    if (existingDisputeError) {
      console.error("Existing dispute lookup error:", existingDisputeError);

      return NextResponse.json(
        { error: "Could not verify the dispute status." },
        { status: 500 },
      );
    }

    if (existingDispute) {
      return NextResponse.json(
        {
          error: "An open dispute already exists for this milestone.",
          disputeId: existingDispute.id,
        },
        { status: 409 },
      );
    }

    // 7. Acquire the same atomic lock used by payment release.
    //
    // Only one operation can claim a milestone while the lock is NULL.
    // An existing lock means release or reconciliation may be in progress.

    const lockTimestamp = new Date().toISOString();

    const { data: lockAcquired, error: lockError } = await supabase
      .from("milestones")
      .update({
        payment_release_locked_at: lockTimestamp,
      })
      .eq("id", milestoneId)
      .neq("status", "PAID")
      .is("payment_release_locked_at", null)
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("Dispute lock error:", lockError);

      return NextResponse.json(
        { error: "Could not acquire the dispute lock." },
        { status: 500 },
      );
    }

    if (!lockAcquired) {
      return NextResponse.json(
        {
          error:
            "Payment release or another protected operation is in progress. Reconcile the milestone before opening a dispute.",
        },
        { status: 409 },
      );
    }

    // From this point, retain the lock if any database operation fails.
    // That is deliberately fail-closed: an unresolved operation must
    // not silently make the milestone eligible for payment release.

    // 8. Create the dispute.

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
          error:
            "The dispute could not be confirmed as saved. The milestone is locked pending reconciliation.",
        },
        { status: 500 },
      );
    }

    // 9. Mark the milestone as disputed, preserving our lock.

    const { data: updatedMilestone, error: milestoneUpdateError } =
      await supabase
        .from("milestones")
        .update({
          status: "DISPUTED",
        })
        .eq("id", milestoneId)
        .eq("payment_release_locked_at", lockTimestamp)
        .neq("status", "PAID")
        .select("id")
        .maybeSingle();

    if (milestoneUpdateError || !updatedMilestone) {
      console.error("Milestone dispute update error:", milestoneUpdateError);

      return NextResponse.json(
        {
          error:
            "The dispute was created, but the milestone update requires reconciliation.",
          disputeId: dispute.id,
        },
        { status: 409 },
      );
    }

    // 10. Record the dispute activity.

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "DISPUTE_OPENED",
        message: `Dispute opened for milestone "${milestone.title}".`,
        metadata: {
          disputeId: dispute.id,
          openedBy: user.id,
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
