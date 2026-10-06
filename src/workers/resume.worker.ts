import { db } from "../prisma/db";
import redis from "../lib/redis";
import { Worker } from "bullmq";
import { getFileFromS3 } from "../lib/s3";
import { parsePdfText, parseDocxText } from "../lib/parse";
import { openai } from "../lib/openai";

const worker = new Worker(
  "Resume",
  async (job) => {
    if (job.name === "process_Resume") {
      try {
        const { resumeId, userId, fileKey, fileType } = job.data;
        let parsedResumeText = "";
        const response = await getFileFromS3(fileKey);
        const buffer = await response?.Body?.transformToByteArray();
        if (!buffer) {
          await db.orm.public.Resume.where({
            id: resumeId,
          }).update({
            status: "FAILED",
          });
          throw new Error("File body is empty");
        }
        const fileBuffer = Buffer.from(buffer);
        if (fileType === "application/pdf") {
          parsedResumeText = await parsePdfText(fileBuffer);
        } else if (
          fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          parsedResumeText = await parseDocxText(fileBuffer);
        }

        const modelResponse = await openai.responses.create({
          model: process.env.OPENAI_EVALUATION_MODEL!,
          input: [
            {
              role: "system",
              content: `
You are an expert resume skill extractor.

Extract skills explicitly mentioned or clearly demonstrated in the supplied resume.

Rules:
- Do not invent or infer skills that are not supported by the resume.
- Extract programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools, testing tools, AI/ML technologies, and other technical skills.
- Extract relevant professional skills only when clearly supported by the resume.
- Normalize obvious variations of the same skill.
  Example: "React JS", "React.js" -> "React.js"
- Do not include duplicate skills.
- Return only the structured assessment.
      `,
            },
            {
              role: "user",
              content: parsedResumeText,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "resume_skills",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        category: {
                          type: "string",
                          enum: [
                            "Programming Language",
                            "Framework",
                            "Library",
                            "Database",
                            "Cloud",
                            "DevOps",
                            "Testing",
                            "AI/ML",
                            "Tool",
                            "Other",
                          ],
                        },
                        evidence: {
                          type: "string",
                        },
                      },
                      required: ["name", "category", "evidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["skills"],
                additionalProperties: false,
              },
            },
          },
        });

        const skills = JSON.parse(modelResponse.output_text);

        await db.orm.public.Resume.where({
          id: resumeId,
          userId: userId,
        }).update({
          status: "PROCESSED",
          skills: skills,
        });
      } catch (error) {
        console.error("Error processing resume:", error);
      }
    }
  },
  { connection: redis },
);

worker.on("failed", async (job, error) => {
  if (!job) return;

  console.error(`Job ${job.id} failed:`, error.message);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await db.orm.public.Resume.where({
      id: job.data.resumeId,
    }).update({
      status: "FAILED",
    });
  }
});
