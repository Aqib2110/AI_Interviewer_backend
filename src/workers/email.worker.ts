import dotenv from "dotenv";
dotenv.config();
import redis from "../lib/redis.js";
import { Worker } from "bullmq";
import {
  invitationEmailTemplate,
  interviewEmailTemplate,
  sendEmail,
} from "../lib/email.js";

console.log("Email worker file loaded");

const worker = new Worker(
  "Email",
  async (job) => {
    console.log("Email worker received job:", job.name, job.data);

    if (job.name === "sendInvitationEmail") {
      const { email, link } = job.data;

      const html = invitationEmailTemplate(link);

      await sendEmail(
        email,
        "You're invited to join our organization",
        html
      );

      console.log("Invitation email sent successfully:", email);
      return;
    }

    if (job.name === "sendInterviewEmail") {
      const { link, companyName, role, email } = job.data;

      const html = interviewEmailTemplate({
        interviewLink: link,
        companyName,
        jobRole: role,
      });

      console.log("Sending interview email to:", email);

      await sendEmail(
        email,
        "Invitation for Interview",
        html
      );

      console.log("Interview email sent successfully:", email);
      return;
    }

    throw new Error(`Unknown email job: ${job.name}`);
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

console.log("WORKER:", {
  host: redis.options.host,
  port: redis.options.port,
  db: redis.options.db,
  queue: worker.name,
});

worker.on("ready", () => {
  console.log("Email worker is ready and waiting for jobs");
});

worker.on("active", (job) => {
  console.log("Email job started:", job.id, job.name);
});

worker.on("completed", (job) => {
  console.log("Email job completed:", job.id);
});

worker.on("failed", (job, error) => {
  console.error("Email job failed:", job?.id, error);
});

worker.on("error", (error) => {
  console.error("Email worker error:", error);
});
