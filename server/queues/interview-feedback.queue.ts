import { Queue } from 'bullmq';

export type ScoreInterviewFeedbackJobName = 'scoreInterviewFeedback';

export type ScoreInterviewFeedbackJobData = {
  reportId: number;
  inviteId: number;
  force?: boolean;
};

function getRedisConnectionOptions(): { url?: string; host?: string; port?: number; password?: string; maxRetriesPerRequest: null } {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return { url: url.trim(), maxRetriesPerRequest: null };
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

export const interviewFeedbackQueue = new Queue<ScoreInterviewFeedbackJobData, unknown, ScoreInterviewFeedbackJobName>(
  'interview-feedback',
  { connection: getRedisConnectionOptions() }
);

export default { interviewFeedbackQueue };
