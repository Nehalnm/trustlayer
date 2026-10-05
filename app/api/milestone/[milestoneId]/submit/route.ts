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

    const submissionUrl = body?.submissionUrl;
    const notes = body?.notes ?? "";
    const submissionContent = body?.submissionContent;

    if (typeof submissionUrl !== "string" || submissionUrl.trim().length < 5) {
      return NextResponse.json(
        {
          error: "Please provide a valid submission URL.",
        },
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
      submissionContent.trim().length < 20
    ) {
      return NextResponse.json(
        {
          error: "Please provide the actual deliverable content.",
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
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

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

    const { data: previousSubmission, error: previousSubmissionError } =
      await supabase
        .from("submissions")
        .select("version")
        .eq("milestone_id", milestoneId)
        .order("version", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (previousSubmissionError) {
      console.error(
        "Previous submission lookup error:",
        previousSubmissionError,
      );

      return NextResponse.json(
        {
          error: "Could not determine submission version.",
        },
        { status: 500 },
      );
    }

    const nextVersion = previousSubmission?.version
      ? Number(previousSubmission.version) + 1
      : 1;

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
        {
          error: "Failed to create submission.",
        },
        { status: 500 },
      );
    }

    const { error: milestoneUpdateError } = await supabase
      .from("milestones")
      .update({
        status: "SUBMITTED",
      })
      .eq("id", milestoneId);

    if (milestoneUpdateError) {
      console.error("Milestone status update error:", milestoneUpdateError);

      return NextResponse.json(
        {
          error:
            "Submission was created, but the milestone status could not be updated.",
        },
        { status: 500 },
      );
    }

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
        },
      });

    if (activityError) {
      console.error("Activity event error:", activityError);
    }

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
