import { Queue } from 'bullmq';

export type InterviewVideoJobName = 'processInterviewVideo';

export interface ProcessInterviewVideoJobData {
  /**
   * Absolute path on disk where multer stored the uploaded file.
   * Example: /home/.../ctnew/uploads/interviews/123.webm
   */
  filePath: string;

  /**
   * Public URL path that the frontend can use to access the file from this server.
   * Example: /uploads/interviews/123.webm
   */
  videoPath: string;

  interviewId: number;
  inviteId: number;

  question?: string;
  queType?: string;
  transcript?: string;
  questionId?: number;
  questionIndex?: number;

  isCompleted?: boolean;
}

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

export const interviewVideoQueue = new Queue<ProcessInterviewVideoJobData, unknown, InterviewVideoJobName>(
  'interview-video',
  {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
