import "dotenv/config";
import "../lib/temporal.js";
import { db } from "../prisma/db.js";
import redis from "../lib/redis.js";
import { Worker } from "bullmq";
import { GoogleGenAI } from "@google/genai";

interface InterviewMessage {
  userMsg: string;
  aiMsg: string;
}

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_EVALUATION_MODEL;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

if (!model) {
  throw new Error("GEMINI_EVALUATION_MODEL is missing");
}

const gemini = new GoogleGenAI({ apiKey });

const assessmentSchema = {
  type: "OBJECT",
  properties: {
    overallScore: {
      type: "INTEGER",
    },
    overallLevel: {
      type: "STRING",
      enum: ["Excellent", "Strong", "Good", "Moderate", "Weak"],
    },
    transcript: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: {
            type: "STRING",
          },
          answer: {
            type: "STRING",
          },
        },
        required: ["question", "answer"],
      },
    },
    skills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          skill: {
            type: "STRING",
          },
          score: {
            type: "INTEGER",
          },
          level: {
            type: "STRING",
            enum: [
              "Excellent",
              "Strong",
              "Good",
              "Moderate",
              "Weak",
              "Insufficient Evidence",
            ],
          },
          evidence: {
            type: "STRING",
          },
          strengths: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
          weaknesses: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },
        },
        required: [
          "skill",
          "score",
          "level",
          "evidence",
          "strengths",
          "weaknesses",
        ],
      },
    },
    strengths: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },
    areasToImprove: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },
    summary: {
      type: "STRING",
    },
    recommendation: {
      type: "STRING",
      enum: [
        "Strongly Recommend",
        "Recommend",
        "Consider",
        "Do Not Recommend",
        "Insufficient Evidence",
      ],
    },
  },
  required: [
    "overallScore",
    "overallLevel",
    "transcript",
    "skills",
    "strengths",
    "areasToImprove",
    "summary",
    "recommendation",
  ],
};



const worker = new Worker(
  "AIAssessment",
  async (job) => {
    console.log("AIAssessment worker received job:", job.name, job.data);

    if (job.name !== "skills_evaluation") return;

    try {
      const { interviewId } = job.data;

      const candidateInfo = await db.orm.public.Interview.where({
        id: interviewId,
      })
        .include("Message")
        .first();

      if (!candidateInfo) {
        throw new Error("Candidate interview not found");
      }

      const skills = candidateInfo.skills;

      if (!skills?.length) {
        throw new Error("No required skills found for this interview");
      }

      const interviewMessages: InterviewMessage[] =
        candidateInfo.Message.map((msg) => ({
          userMsg: msg.userMsg,
          aiMsg: msg.aiMsg,
        }));

      if (!interviewMessages.length) {
        throw new Error("No interview messages found");
      }

      const response = await gemini.models.generateContent({
        model,
        contents: JSON.stringify({
          requiredSkills: skills,
          interviewMessages,
        }),
        config: {
          systemInstruction: `
You are an expert technical interviewer and candidate-skill evaluator.

Evaluate the candidate ONLY using evidence from the supplied interview conversation.

ASSESSMENT RULES:
- Evaluate every required skill independently.
- Do not assume knowledge without evidence.
- Do not penalize skills that were not sufficiently tested.
- Distinguish correct, partially correct, incorrect, vague, and strong practical answers.
- Focus on technical knowledge and reasoning.
- Do not evaluate English fluency, accent, grammar, personality, appearance, or other unrelated characteristics.
- Provide concise evidence for every skill.
- Score skills from 0 to 100.
- Overall score must be an integer from 0 to 100.
- Use "Insufficient Evidence" when a skill was not adequately evaluated.
- Return only the structured assessment.

TRANSCRIPT RULES:
- Generate a complete transcript from the supplied interview messages.
- Return the transcript as an array of objects.
- Each object must contain exactly two fields: question and answer.
- question must contain the AI interviewer's question.
- answer must contain the candidate's corresponding response.
- Preserve the original meaning of both questions and answers.
- Do not invent questions or candidate responses.
- Do not add explanations, evaluations, or feedback inside the transcript.
- Keep the original conversation order.
- If an AI message contains multiple distinct questions, represent them as separate question-answer entries where the corresponding answers can be identified.
- If a question has no corresponding candidate answer, use an empty string for answer.
- If a candidate response cannot be confidently matched to a question, do not invent a pairing.
- Include all identifiable interview questions and answers, not just technical questions.

OUTPUT RULES:
- Return valid JSON matching the supplied response schema.
- Do not include Markdown or code fences.
- Every required field must be populated.
`,
          responseMimeType: "application/json",
          responseJsonSchema: assessmentSchema,
        },
      });

      const outputText = response.text;

      if (!outputText) {
        throw new Error("Gemini returned an empty assessment response");
      }

      const assessmentReport = JSON.parse(outputText);

      await db.orm.public.Report.create({
        interviewId,
        content: JSON.stringify(assessmentReport),
      });

      await db.orm.public.Interview.where({
        id: interviewId,
      }).update({
        score: assessmentReport.overallScore,
      });

      console.log("AI assessment report generated successfully");
    } catch (error) {
      console.error(
        "Interview AI assessment failed:",
        error instanceof Error ? error.message : error,
      );

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

worker.on("ready", () => {
  console.log("Interview worker is ready");
});

worker.on("active", (job) => {
  console.log("Interview job started:", job.id, job.name);
});

worker.on("completed", (job) => {
  console.log("Interview job completed:", job.id);
});

worker.on("failed", (job, error) => {
  console.error("Interview job failed:", job?.id, error);
});

worker.on("error", (error) => {
  console.error("Interview worker error:", error);
});