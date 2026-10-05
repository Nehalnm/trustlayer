import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const contractSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise project title.",
    },

    summary: {
      type: Type.STRING,
      description: "A concise summary of the agreed freelance work.",
    },

    totalBudget: {
      type: Type.NUMBER,
      description: "Total project budget as a numeric value.",
    },

    currency: {
      type: Type.STRING,
      description: "Currency code such as USD, INR, or EUR.",
    },

    deadlineDays: {
      type: Type.INTEGER,
      description: "Total project duration in days from project start.",
    },

    milestones: {
      type: Type.ARRAY,
      description: "Milestones that divide the project into payment stages.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Milestone name.",
          },

          amount: {
            type: Type.NUMBER,
            description: "Payment amount for this milestone.",
          },

          deadlineDay: {
            type: Type.INTEGER,
            description:
              "The day by which this milestone should be completed, counted from project start.",
          },

          acceptanceCriteria: {
            type: Type.ARRAY,
            description:
              "Objective requirements that must be satisfied before this milestone can be approved.",
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
      description:
        "Potential contract or delivery risks identified from the request.",
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

    const prompt = `
You are TrustLayer's AI Contract Agent.

Your job is to convert a client's freelance project description into a
clear, structured, machine-readable agreement.

Rules:

1. Use ONLY requirements explicitly stated or strongly implied by the user.
2. Do not invent mandatory requirements.
3. Break the work into sensible milestones.
4. Milestone amounts must add up exactly to the total budget.
5. Acceptance criteria must be objective and verifiable.
6. Identify vague requirements in "ambiguities".
7. Identify meaningful delivery or contract risks in "riskFlags".
8. If something is unclear, flag it instead of pretending it is clear.
9. Prefer measurable criteria such as:
   - required sections
   - supported screen sizes
   - required functionality
   - file formats
   - number of revisions
   - explicit deadlines
10. Do not create a milestone merely to make the output longer.

User's project description:

${description}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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

    // Deterministic validation:
    // the AI is not allowed to create money out of thin air.
    const milestoneTotal = contract.milestones.reduce(
      (sum: number, milestone: { amount: number }) =>
        sum + Number(milestone.amount),
      0,
    );

    const difference = Math.abs(milestoneTotal - Number(contract.totalBudget));

    if (difference > 0.01) {
      return NextResponse.json(
        {
          error:
            "AI generated milestones whose amounts do not equal the total budget.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
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
