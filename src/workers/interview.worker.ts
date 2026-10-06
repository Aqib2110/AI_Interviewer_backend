import { db } from "../prisma/db";
import redis from "../lib/redis";
import { Worker } from "bullmq";
import { AIAssessmentQueue } from "../lib/queue";

const worker = new Worker(
  "Interview",
  async (job) => {
    if (job.name === "expire_interview") {
      try {
        const { interviewId } = job.data;

        const interview = await db.orm.public.Interview
          .where({
            id: interviewId,
          })
          .update({
            endedAt: Temporal.Now.instant(),
          });

        if (!interview) {
          throw new Error("Interview not found");
        }

        const response = await fetch(
          `https://api.openai.com/v1/realtime/calls/${interview.aiSessionId}/hangup`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();

          throw new Error(
            `Failed to hangup realtime call: ${response.status} ${error}`
          );
        }

        await AIAssessmentQueue.add("skills_evaluation", {
          interviewId: interview.id,
        });
      } catch (error) {
        console.error(
          "Interview expiration failed:",
          error instanceof Error ? error.message : error
        );

        throw error;
      }
    }
  },
  { connection: redis }
);