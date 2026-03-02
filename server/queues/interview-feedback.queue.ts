import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export type ScoreInterviewFeedbackJobData = {
  reportId: number;
  inviteId: number;
};

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return new IORedis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
}

export const interviewFeedbackQueue = new Queue<ScoreInterviewFeedbackJobData>('interview-feedback', {
  connection: getRedisConnection(),
});

export default { interviewFeedbackQueue };
