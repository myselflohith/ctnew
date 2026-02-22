import cron from 'node-cron';
import { processInterviewScoring, autoArchivingPoorResults } from '../jobs/interview-scoring.cron.js';

/**
 * Initialize cron jobs for interview system
 * Runs every 2 minutes to process interview scoring
 * Matches ch-job-marketplace cron schedule
 */
export function initializeCronJobs() {
  console.log('🔄 Initializing cron jobs...');

  // Process interview scoring every 2 minutes (matching ch-job-marketplace)
  const scoringJob = cron.schedule('*/2 * * * *', async () => {
    console.log('⏰ Interview scoring cron job triggered');
    try {
      await processInterviewScoring();
      await autoArchivingPoorResults();
    } catch (error) {
      console.error('❌ Error in cron job:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
  console.log('📅 Interview scoring scheduled for every 2 minutes');
  console.log('🔒 Poor candidate archival scheduled with scoring process');

  return scoringJob;
}

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
export function stopCronJobs(job: any) {
  if (job) {
    job.stop();
    job.destroy();
    console.log('✋ Cron jobs stopped');
  }
}

export default { initializeCronJobs, stopCronJobs };
