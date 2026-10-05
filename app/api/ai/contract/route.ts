import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

import { createAdminClient } from "@/lib/supabase/admin";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const contractSchema = {
  type: Type.OBJECT,

  properties: {
    title: {
      type: Type.STRING,
      description: "A concise title for the freelance project.",
    },

    summary: {
      type: Type.STRING,
      description: "A concise summary of the agreed freelance work.",
    },

    totalBudget: {
      type: Type.NUMBER,
      description: "The total project budget as a numeric value.",
    },

    currency: {
      type: Type.STRING,
      description: "The currency code, such as USD, INR, or EUR.",
    },

    deadlineDays: {
      type: Type.INTEGER,
      description: "The total project duration in days from the project start.",
    },

    milestones: {
      type: Type.ARRAY,

      description: "Payment milestones that divide the project into stages.",

      items: {
        type: Type.OBJECT,

        properties: {
          title: {
            type: Type.STRING,
            description: "The milestone name.",
          },

          amount: {
            type: Type.NUMBER,
            description: "The payment amount assigned to this milestone.",
          },

          deadlineDay: {
            type: Type.INTEGER,
            description:
              "The day by which this milestone should be completed, counted from project start.",
          },

          acceptanceCriteria: {
            type: Type.ARRAY,

            description:
              "Objective, measurable requirements that must be satisfied before this milestone can be approved.",

            items: {
              type: Type.STRING,
            },
          },
        },

        required: ["title", "amount", "deadlineDay", "acceptanceCriteria"],
      },
    },

    ambiguities: {
      type: Type.ARRAY,

      description:
        "Important parts of the request that are vague, missing, or open to interpretation.",

      items: {
        type: Type.STRING,
      },
    },

    riskFlags: {
      type: Type.ARRAY,

      description: "Potential project, delivery, scope, or contract risks.",

      items: {
        type: Type.STRING,
      },
    },
  },

  required: [
    "title",
    "summary",
    "totalBudget",
    "currency",
    "deadlineDays",
    "milestones",
    "ambiguities",
    "riskFlags",
  ],
};

export async function POST(request: Request) {
  try {
    // ------------------------------------------
    // 1. Read request
    // ------------------------------------------

    const body = await request.json();

    const description = body?.description;

    if (typeof description !== "string" || description.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            "Please provide a project description of at least 20 characters.",
        },
        { status: 400 },
      );
    }

    // ------------------------------------------
    // 2. Ask Gemini to create the contract
    // ------------------------------------------

    const prompt = `
You are TrustLayer's AI Contract Agent.

Your job is to convert a client's freelance project description
into a clear, structured, machine-readable agreement.

Rules:

1. Use ONLY requirements explicitly stated or strongly implied by the user.
2. Never invent mandatory requirements.
3. Break the project into sensible payment milestones.
4. Milestone amounts must add up EXACTLY to the total project budget.
5. Acceptance criteria must be objective and verifiable.
6. Identify vague or missing requirements in "ambiguities".
7. Identify meaningful project risks in "riskFlags".
8. If something is unclear, flag it instead of assuming.
9. Prefer measurable criteria such as:
   - required sections
   - supported screen sizes
   - required functionality
   - required file formats
   - explicit deadlines
   - number of revisions
10. Do not create unnecessary milestones.

Client's project description:

${description}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents: prompt,

      config: {
        responseMimeType: "application/json",
        responseSchema: contractSchema,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const contract = JSON.parse(response.text);

    // ------------------------------------------
    // 3. Validate AI-generated money values
    // ------------------------------------------

    const milestoneTotal = contract.milestones.reduce(
      (sum: number, milestone: { amount: number }) =>
        sum + Number(milestone.amount),
      0,
    );

    const budgetDifference = Math.abs(
      milestoneTotal - Number(contract.totalBudget),
    );

    if (budgetDifference > 0.01) {
      return NextResponse.json(
        {
          error:
            "AI generated milestones whose amounts do not equal the total project budget.",
        },
        { status: 422 },
      );
    }

    // ------------------------------------------
    // 4. Create Supabase admin client
    // ------------------------------------------

    const supabase = createAdminClient();

    // ------------------------------------------
    // 5. Save project
    // ------------------------------------------

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: contract.title,
        description,
        currency: contract.currency,
        total_amount: contract.totalBudget,
        deadline_days: contract.deadlineDays,
        status: "DRAFT",
        contract,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      console.error("Project creation error:", projectError);

      throw new Error("Failed to save project to database.");
    }

    // ------------------------------------------
    // 6. Save milestones
    // ------------------------------------------

    const milestoneRows = contract.milestones.map(
      (milestone: {
        title: string;
        amount: number;
        deadlineDay: number;
        acceptanceCriteria: string[];
      }) => ({
        project_id: project.id,
        title: milestone.title,
        amount: milestone.amount,
        deadline_day: milestone.deadlineDay,
        acceptance_criteria: milestone.acceptanceCriteria,
        status: "PENDING",
      }),
    );

    const { error: milestoneError } = await supabase
      .from("milestones")
      .insert(milestoneRows);

    if (milestoneError) {
      console.error("Milestone creation error:", milestoneError);

      throw new Error(
        "Project was created, but milestones could not be saved.",
      );
    }

    // ------------------------------------------
    // 7. Create initial activity event
    // ------------------------------------------

    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        project_id: project.id,
        event_type: "CONTRACT_CREATED",
        message: "AI generated the project contract and milestones.",
        metadata: {
          generatedBy: "Gemini",
        },
      });

    if (activityError) {
      console.error("Activity event error:", activityError);

      // We don't fail the whole project just because
      // the activity log couldn't be written.
    }

    // ------------------------------------------
    // 8. Return result
    // ------------------------------------------

    return NextResponse.json({
      projectId: project.id,
      contract,
    });
  } catch (error) {
    console.error("Contract agent error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate contract.",
      },
      { status: 500 },
    );
  }
}
