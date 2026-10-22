import { NextResponse } from "next/server";

import { createClient as createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
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
        { error: "You must be signed in to view evaluation results." },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // 2. Load the milestone so we can verify its project ownership.

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, project_id")
      .eq("id", milestoneId)
      .maybeSingle();

    if (milestoneError) {
      console.error("Milestone lookup error:", milestoneError);

      return NextResponse.json(
        { error: "Could not load the milestone." },
        { status: 500 },
      );
    }

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 },
      );
    }

    // 3. Check access using the signed-in user's RLS policies.

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
          error: "You are not authorized to view this evaluation.",
        },
        { status: 403 },
      );
    }

    // 4. Load the latest submission.

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, version")
      .eq("milestone_id", milestoneId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error("Latest submission lookup error:", submissionError);

      return NextResponse.json(
        { error: "Could not load the latest submission." },
        { status: 500 },
      );
    }

    if (!submission) {
      return NextResponse.json(
        {
          evaluation: null,
          submissionVersion: null,
        },
        { status: 200 },
      );
    }

    // 5. Load the latest evaluation for that submission,
    // including the artifact evidence used by the Trust Console.

    const { data: evaluation, error: evaluationError } = await supabase
      .from("ai_evaluations")
      .select(
        "id, status, score, confidence, criteria_results, summary, created_at, artifact_analysis",
      )
      .eq("submission_id", submission.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evaluationError) {
      console.error("Evaluation lookup error:", evaluationError);

      return NextResponse.json(
        { error: "Could not load the AI evaluation." },
        { status: 500 },
      );
    }

    // 6. Return the evaluation and submission version.

    return NextResponse.json({
      evaluation,
      submissionVersion: submission.version,
    });
  } catch (error) {
    console.error("Evaluation API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load evaluation.",
      },
      { status: 500 },
    );
  }
}
