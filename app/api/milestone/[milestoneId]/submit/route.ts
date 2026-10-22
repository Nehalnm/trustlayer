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
        { error: "You must be signed in to submit work." },
        { status: 401 },
      );
    }

    // 2. Validate the submission request.

    let body: {
      submissionUrl?: unknown;
      notes?: unknown;
      submissionContent?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const submissionUrl = body?.submissionUrl;
    const notes = body?.notes ?? "";
    const submissionContent = body?.submissionContent;

    if (typeof submissionUrl !== "string" || submissionUrl.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid submission URL." },
        { status: 400 },
      );
    }

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be text." },
        { status: 400 },
      );
    }

    if (
      typeof submissionContent !== "string" ||
      submissionContent.trim().length < 20 ||
      submissionContent.length > 1_000_000
    ) {
      return NextResponse.json(
        { error: "Provide deliverable content between 20 and 1,000,000 characters." },
        { status: 400 },
      );
    }

    // 3. Load the milestone using the admin client.

    const supabase = createAdminClient();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, project_id, title, status")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

    // 4. Verify access using the signed-in user's RLS policies.

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
        { error: "You are not authorized to submit work for this project." },
        { status: 403 },
      );
    }

    // 5. Check whether the milestone accepts submissions.

    if (
      milestone.status !== "FUNDED" &&
      milestone.status !== "REVISION_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Work can only be submitted when the milestone is funded or requires revision.",
        },
        { status: 409 },
      );
    }

    // Serialize version allocation with verification, disputes, and release.
    const submissionLock = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("milestones")
      .update({ payment_release_locked_at: submissionLock })
      .eq("id", milestoneId)
      .in("status", ["FUNDED", "REVISION_REQUIRED"])
      .is("payment_release_locked_at", null)
      .is("paypal_capture_id", null)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      return NextResponse.json(
        { error: "Another operation is in progress or this milestone requires reconciliation." },
        { status: claimError ? 500 : 409 },
      );
    }

    // 6. Determine the next submission version under our operation lock.

    const { data: previousSubmission, error: previousSubmissionError } =
      await supabase
        .from("submissions")
        .select("version")
        .eq("milestone_id", milestoneId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (previousSubmissionError) {
      console.error(
        "Previous submission lookup error:",
        previousSubmissionError,
      );

      return NextResponse.json(
        { error: "Could not determine submission version." },
        { status: 500 },
      );
    }

    const nextVersion = previousSubmission?.version
      ? Number(previousSubmission.version) + 1
      : 1;

    // 7. Save the submission.

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        milestone_id: milestoneId,
        version: nextVersion,
        submission_url: submissionUrl.trim(),
        submission_content: submissionContent.trim(),
        notes: notes.trim(),
        status: "SUBMITTED",
      })
      .select("id, version")
      .single();

    if (submissionError || !submission) {
      console.error("Submission creation error:", submissionError);

      return NextResponse.json(
        { error: "Failed to create submission." },
        { status: 500 },
      );
    }

    // 8. Update the milestone only if it is still eligible.
    // If another request changed its status, do not overwrite it.

    const { data: updatedMilestone, error: milestoneUpdateError } =
      await supabase
        .from("milestones")
        .update({ status: "SUBMITTED", payment_release_locked_at: null })
        .eq("id", milestoneId)
        .in("status", ["FUNDED", "REVISION_REQUIRED"])
        .eq("payment_release_locked_at", submissionLock)
        .is("paypal_capture_id", null)
        .select("id")
        .maybeSingle();

    if (milestoneUpdateError || !updatedMilestone) {
      console.error("Milestone status update error:", milestoneUpdateError);

      return NextResponse.json(
        {
          error:
            "The submission was saved, but the milestone status changed or could not be updated. Review the milestone before retrying.",
          submissionId: submission.id,
        },
        { status: 409 },
      );
    }

    // 9. Record the submission activity.

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "WORK_SUBMITTED",
        message: `Work submitted for milestone "${milestone.title}".`,
        metadata: {
          submissionId: submission.id,
          version: nextVersion,
          submittedBy: user.id,
        },
      });

    if (activityError) {
      console.error("Activity event error:", activityError);
    }

    // 10. Return the result.

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      version: nextVersion,
    });
  } catch (error) {
    console.error("Submission API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit work.",
      },
      { status: 500 },
    );
  }
}
