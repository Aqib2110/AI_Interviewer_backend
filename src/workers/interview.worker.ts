import { db } from "../prisma/db.js";
import redis from "../lib/redis.js";
import { Worker } from "bullmq";
import { AIAssessmentQueue } from "../lib/queue.js";

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
            status:"COMPELETED"
          });

        if (!interview) {
          throw new Error("Interview not found");
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
  { connection: redis,
     concurrency: 3
   }
);