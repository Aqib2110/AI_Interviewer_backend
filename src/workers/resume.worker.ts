import "../lib/temporal.js";
import { db } from "../prisma/db.js";
import redis from "../lib/redis.js";
import { Worker } from "bullmq";
import { getFileFromS3 } from "../lib/s3.js";
import { parsePdfText, parseDocxText } from "../lib/parse.js";
import { gemini } from "../lib/gemini.js";

const resumeSkillsSchema = {
  type: "OBJECT",
  properties: {
    skills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
          },
          category: {
            type: "STRING",
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
            type: "STRING",
          },
        },
        required: ["name", "category", "evidence"],
      },
    },
  },
  required: ["skills"],
};

const worker = new Worker(
  "Resume",
  async (job) => {
    if (job.name !== "process_Resume") return;

    const { resumeId, userId, fileKey, fileType } = job.data;

    try {
      console.log("Processing resume:", fileKey);

      let parsedResumeText = "";

      const response = await getFileFromS3(fileKey);
      const buffer = await response?.Body?.transformToByteArray();

      if (!buffer) {
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
      } else {
        throw new Error("Unsupported resume file type");
      }

      if (!parsedResumeText.trim()) {
        throw new Error("No readable text found in resume");
      }

      const modelResponse = await gemini.models.generateContent({
        model: process.env.GEMINI_EVALUATION_MODEL!,
        contents: parsedResumeText,
        config: {
          systemInstruction: `
You are an expert resume skill extractor.

Extract skills explicitly mentioned or clearly demonstrated in the supplied resume.

Rules:
- Do not invent or infer skills that are not supported by the resume.
- Extract programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools, testing tools, AI/ML technologies, and other technical skills.
- Extract relevant professional skills only when clearly supported by the resume.
- Normalize obvious variations of the same skill.
  Example: "React JS", "React.js" -> "React.js".
- Do not include duplicate skills.
- For every skill, provide a concise evidence statement grounded in the resume.
- Assign the most appropriate category to each skill.
- Return only the structured JSON response.
          `,
          responseMimeType: "application/json",
          responseJsonSchema: resumeSkillsSchema,
        },
      });

      const content = modelResponse.text;

      if (!content) {
        throw new Error("Gemini returned an empty resume skill response");
      }

      const result = JSON.parse(content);

      await db.orm.public.Resume.where({
        id: resumeId,
        userId: userId,
      }).update({
        status: "PROCESSED",
        skills: JSON.stringify(result.skills),
      });

      console.log("Resume processed successfully:", resumeId);
    } catch (error) {
      console.error(
        "Error processing resume:",
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
  console.log("Resume worker is ready");
});

worker.on("active", (job) => {
  console.log("Resume job started:", job.id, job.name);
});

worker.on("completed", (job) => {
  console.log("Resume job completed:", job.id);
});

worker.on("error", (error) => {
  console.error("Resume worker error:", error);
});

worker.on("failed", async (job, error) => {
  if (!job) return;

  console.error(`Resume job failed: ${job.id}`, error.message);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    try {
      await db.orm.public.Resume.where({
        id: job.data.resumeId,
        userId: job.data.userId,
      }).update({
        status: "FAILED",
      });
    } catch (updateError) {
      console.error("Failed to update resume status:", updateError);
    }
  }
});
