import { Queue } from 'bullmq';

export type TalentJobMatchingJobName = 'computeMatchScores';

export interface TalentJobMatchingJobData {
  userId: number;
}

function getRedisConnectionOptions(): {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  maxRetriesPerRequest: null;
} {
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

export const talentJobMatchingQueue = new Queue<
  TalentJobMatchingJobData,
  unknown,
  TalentJobMatchingJobName
>('talent-job-matching', {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});
