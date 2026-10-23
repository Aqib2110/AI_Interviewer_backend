import { Queue } from 'bullmq';
import redis from './redis'


export const ResumeQueue = new Queue('Resume', {
connection: redis
});

export const InterviewQueue = new Queue('Interview', {
connection: redis,
});

export const emailQueue = new Queue('Email', {
connection: redis
});

export const AIAssessmentQueue = new Queue('AIAssessment', {
connection: redis
});


