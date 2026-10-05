import { NextResponse } from "next/server";

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

    const supabase = createAdminClient();

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, version")
      .eq("milestone_id", milestoneId)
      .order("version", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error("Latest submission lookup error:", submissionError);

      return NextResponse.json(
        {
          error: "Could not load the latest submission.",
        },
        { status: 500 },
      );
    }

    if (!submission) {
      return NextResponse.json({ evaluation: null }, { status: 200 });
    }

    const { data: evaluation, error: evaluationError } = await supabase
      .from("ai_evaluations")
      .select(
        "id, status, score, confidence, criteria_results, summary, created_at",
      )
      .eq("submission_id", submission.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (evaluationError) {
      console.error("Evaluation lookup error:", evaluationError);

      return NextResponse.json(
        {
          error: "Could not load the AI evaluation.",
        },
        { status: 500 },
      );
    }

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
