import { Queue } from 'bullmq';

export type JobAutopilotSourcingJobName = 'jobAutopilotSourcing';

export interface JobAutopilotSourcingJobData {
  jobId: number;
  /**
   * Optional cap on how many candidates to store.
   * If omitted, the worker will pick a sane default.
   */
  targetCount?: number;
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

export const jobAutopilotSourcingQueue = new Queue<JobAutopilotSourcingJobData, unknown, JobAutopilotSourcingJobName>(
  'job-autopilot-sourcing',
  {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
