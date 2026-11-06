
import "../lib/temporal.js";
import { db } from "../prisma/db.js";
import redis from "../lib/redis.js";
import { Worker } from "bullmq";
import { openai } from "../lib/openai.js";

interface InterviewMessage {
  userMsg: string;
  aiMsg: string;
}

const worker = new Worker(
  "AIAssessment",
  async (job) => {
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

      const response = await openai.responses.create({
        model: process.env.OPENAI_EVALUATION_MODEL!,

        input: [
          {
            role: "system",
            content: `
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
`,
          },
          {
            role: "user",
            content: JSON.stringify({
              requiredSkills: skills,
              interviewMessages,
            }),
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name: "candidate_skill_assessment",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overallScore: {
                  type: "integer",
                },

                overallLevel: {
                  type: "string",
                  enum: ["Excellent", "Strong", "Good", "Moderate", "Weak"],
                },

                transcript: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: {
                        type: "string",
                      },
                      answer: {
                        type: "string",
                      },
                    },
                    required: ["question", "answer"],
                    additionalProperties: false,
                  },
                },

                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      skill: {
                        type: "string",
                      },

                      score: {
                        type: "integer",
                      },

                      level: {
                        type: "string",
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
                        type: "string",
                      },

                      strengths: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },

                      weaknesses: {
                        type: "array",
                        items: {
                          type: "string",
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

                    additionalProperties: false,
                  },
                },

                strengths: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                areasToImprove: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                summary: {
                  type: "string",
                },

                recommendation: {
                  type: "string",
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

              additionalProperties: false,
            },
          },
        },
      });

      if (!response.output_text) {
        throw new Error("AI returned an empty assessment response");
      }

      const assessmentReport = JSON.parse(response.output_text);

      await db.orm.public.Report.create({
        interviewId,
        content: response.output_text,
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
