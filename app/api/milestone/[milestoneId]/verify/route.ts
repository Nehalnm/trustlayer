import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

import { createAdminClient } from "@/lib/supabase/admin";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const verificationSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["APPROVED", "REVISION_REQUIRED", "ESCALATE"],
      description: "Overall verification decision.",
    },

    score: {
      type: Type.NUMBER,
      description: "Overall score from 0 to 1.",
    },

    confidence: {
      type: Type.NUMBER,
      description: "Confidence in the verification decision from 0 to 1.",
    },

    criteria_results: {
      type: Type.ARRAY,
      description: "Result for every acceptance criterion.",
      items: {
        type: Type.OBJECT,
        properties: {
          requirement: {
            type: Type.STRING,
          },

          passed: {
            type: Type.BOOLEAN,
          },

          evidence: {
            type: Type.STRING,
            description:
              "Concise evidence from the submitted work supporting the result.",
          },
        },
        required: ["requirement", "passed", "evidence"],
      },
    },

    summary: {
      type: Type.STRING,
      description: "Concise explanation of the verification result.",
    },
  },

  required: ["status", "score", "confidence", "criteria_results", "summary"],
};

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

    const supabase = createAdminClient();

    /*
     * 1. Load the milestone.
     */
    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, project_id, title, status, acceptance_criteria")
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
      milestone.status !== "SUBMITTED" &&
      milestone.status !== "UNDER_REVIEW"
    ) {
      return NextResponse.json(
        {
          error: "This milestone is not ready for AI verification.",
        },
        { status: 409 },
      );
    }

    /*
     * 2. Load the latest submission INCLUDING
     *    the actual deliverable content.
     */
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, version, submission_url, submission_content, notes")
      .eq("milestone_id", milestoneId)
      .order("version", {
        ascending: false,
      })
      .limit(1)
      .single();

    if (submissionError || !submission) {
      console.error("Submission lookup error:", submissionError);

      return NextResponse.json(
        {
          error: "No submission was found for this milestone.",
        },
        { status: 404 },
      );
    }

    if (
      typeof submission.submission_content !== "string" ||
      submission.submission_content.trim().length < 20
    ) {
      return NextResponse.json(
        {
          error:
            "This submission does not contain enough deliverable content to verify.",
        },
        { status: 422 },
      );
    }

    /*
     * 3. Mark milestone as UNDER_REVIEW.
     */
    const { error: reviewUpdateError } = await supabase
      .from("milestones")
      .update({
        status: "UNDER_REVIEW",
      })
      .eq("id", milestoneId);

    if (reviewUpdateError) {
      console.error("Review status update error:", reviewUpdateError);
    }

    /*
     * 4. Normalize acceptance criteria.
     */
    const criteria = Array.isArray(milestone.acceptance_criteria)
      ? milestone.acceptance_criteria.filter(
          (item): item is string => typeof item === "string",
        )
      : [];

    if (criteria.length === 0) {
      return NextResponse.json(
        {
          error: "This milestone has no acceptance criteria to verify.",
        },
        { status: 422 },
      );
    }

    /*
     * 5. Send the ACTUAL deliverable to Gemini.
     */
    const prompt = `
You are TrustLayer's AI Verification Agent.

Your job is to evaluate a freelance milestone submission
against the EXACT acceptance criteria agreed for that milestone.

IMPORTANT RULES:

1. Evaluate EVERY acceptance criterion separately.
2. Use the submitted deliverable content as the primary evidence.
3. Do NOT invent additional requirements.
4. Do NOT assume a requirement passed just because the freelancer
   claims it was completed.
5. Do NOT treat the submission URL alone as proof.
6. Use the submission notes only as supplementary context.
7. If the actual deliverable content does not provide enough
   evidence for a criterion, mark that criterion as failed.
8. APPROVED should only be used when the available deliverable
   evidence strongly supports that all mandatory criteria passed.
9. REVISION_REQUIRED should be used when specific requirements
   are missing or clearly not satisfied.
10. ESCALATE should be used when the evidence is genuinely
    ambiguous, contradictory, or impossible to evaluate.
11. Evidence must reference what is actually present in the
    submitted content.
12. Do not reveal hidden reasoning or chain-of-thought.
13. Return only the structured result.

Milestone:
${milestone.title}

Acceptance criteria:
${criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join("\n")}

Submission version:
${submission.version}

Deliverable URL:
${submission.submission_url}

Submission notes:
${submission.notes || "(No notes provided)"}

ACTUAL DELIVERABLE CONTENT:
--------------------------------
${submission.submission_content}
--------------------------------

Evaluate the actual deliverable against every acceptance criterion.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: verificationSchema,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty verification response.");
    }

    const evaluation = JSON.parse(response.text);

    /*
     * 6. Store the AI evaluation.
     */
    const { error: evaluationError } = await supabase
      .from("ai_evaluations")
      .insert({
        submission_id: submission.id,
        status: evaluation.status,
        score: evaluation.score,
        confidence: evaluation.confidence,
        criteria_results: evaluation.criteria_results,
        summary: evaluation.summary,
      });

    if (evaluationError) {
      console.error("AI evaluation storage error:", evaluationError);

      throw new Error(
        "AI verification completed, but the evaluation could not be saved.",
      );
    }

    /*
     * 7. Update submission status.
     */
    const { error: submissionUpdateError } = await supabase
      .from("submissions")
      .update({
        status: evaluation.status,
      })
      .eq("id", submission.id);

    if (submissionUpdateError) {
      console.error("Submission status update error:", submissionUpdateError);
    }

    /*
     * 8. Update milestone status.
     *
     * IMPORTANT:
     * AI verification NEVER captures money.
     */
    let milestoneStatus = "UNDER_REVIEW";

    if (evaluation.status === "APPROVED") {
      milestoneStatus = "APPROVED";
    }

    if (evaluation.status === "REVISION_REQUIRED") {
      milestoneStatus = "REVISION_REQUIRED";
    }

    if (evaluation.status === "ESCALATE") {
      milestoneStatus = "DISPUTED";
    }

    const { error: finalMilestoneError } = await supabase
      .from("milestones")
      .update({
        status: milestoneStatus,
      })
      .eq("id", milestoneId);

    if (finalMilestoneError) {
      console.error("Final milestone update error:", finalMilestoneError);
    }

    /*
     * 9. Record activity.
     */
    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        event_type: "AI_VERIFICATION_COMPLETED",
        message: `AI verification completed for milestone "${milestone.title}": ${evaluation.status}.`,
        metadata: {
          submissionId: submission.id,
          evaluationStatus: evaluation.status,
          score: evaluation.score,
          confidence: evaluation.confidence,
        },
      });

    if (activityError) {
      console.error("Verification activity error:", activityError);
    }

    return NextResponse.json({
      success: true,
      milestoneId,
      submissionId: submission.id,
      evaluation,
    });
  } catch (error) {
    console.error("AI verification error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI verification failed.",
      },
      { status: 500 },
    );
  }
}
