import { Queue } from 'bullmq';
import redis from './redis.js'

export const ResumeQueue = new Queue('Resume', {
connection: redis
});

export const InterviewQueue = new Queue('Interview', {
connection: redis,
});

export const emailQueue = new Queue('Email', {
connection: redis
});

console.log("PRODUCER:", {
  host: redis.options.host,
  port: redis.options.port,
  db: redis.options.db,
  queue: emailQueue.name,
});

export const AIAssessmentQueue = new Queue('AIAssessment', {
connection: redis
});


