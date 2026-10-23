import { db } from "../prisma/db";
import redis from "../lib/redis";
import { Worker } from "bullmq";
import { openai } from "../lib/openai";

interface interviewMessage {
  userMsg: string;
  aiMsg: string;
}

const worker = new Worker(
  "AIAssessment",
  async (job) => {
    if (job.name === "skills_evaluation") {
      try {
        const { interviewId } = job.data;

        const candidateInfo = await db.orm.public.Interview.where({
          id: interviewId,
        })
          .include("Message")
          .first();

        if (!candidateInfo) {
          throw new Error("candidate interview not found");
        }

        const skills = candidateInfo?.skills;

        if (!candidateInfo.skills?.length) {
          throw new Error("No required skills found for this interview");
        }

        const interviewMessages: interviewMessage[] = candidateInfo.Message.map(
          (msg) => ({ userMsg: msg.userMsg, aiMsg: msg.aiMsg }),
        );

        const response = await openai.responses.create({
          model: process.env.OPENAI_EVALUATION_MODEL!,

          input: [
            {
              role: "system",
              content: `
You are an expert technical interviewer and candidate-skill evaluator.

Evaluate the candidate ONLY using evidence from the supplied interview
conversation.

Rules:
- Evaluate every required skill independently.
- Do not assume knowledge without evidence.
- Do not penalize skills that were not sufficiently tested.
- Distinguish correct, partially correct, incorrect, vague, and strong
  practical answers.
- Focus on technical knowledge and reasoning.
- Do not evaluate English fluency, accent, grammar, personality, appearance,
  or other unrelated characteristics.
- Provide concise evidence for every skill.
- Return only the structured assessment.
      `,
            },
            {
              role: "user",
              content: JSON.stringify({
                requiredSkills: skills,
                interviewMessages: interviewMessages,
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

        const assessmentReport = JSON.parse(response.output_text);

        await db.orm.public.Report.create({
          interviewId,
          content: response.output_text,
        });

        await db.orm.public.Interview.where({
          id: interviewId
        }).update({
          score: assessmentReport?.overallScore
        })

        console.log("AI assessment report generated");
      } catch (error) {
        console.error(
          "Interview ai assessment failed:",
          error instanceof Error ? error.message : error,
        );

        throw error;
      }
    }
  },
  { connection: redis,
    concurrency: 3
   },
);
