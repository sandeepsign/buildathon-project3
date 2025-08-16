import Queue from 'bull';
import { logger } from '../utils/logger';

export const jobQueue = new Queue('employee-engagement', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

export enum JobTypes {
  PROCESS_MESSAGE = 'process-message',
  ANALYZE_SENTIMENT = 'analyze-sentiment',
  CALCULATE_DAILY_MOOD = 'calculate-daily-mood',
  GENERATE_WEEKLY_REPORT = 'generate-weekly-report',
  SYNC_CHANNEL_HISTORY = 'sync-channel-history',
  SEND_BURNOUT_ALERT = 'send-burnout-alert'
}

export async function setupJobs(): Promise<void> {
  const { setupJobProcessors } = await import('./processors');
  await setupJobProcessors(jobQueue);

  const { setupScheduledJobs } = await import('./scheduledJobs');
  setupScheduledJobs();

  // Job queue event listeners
  jobQueue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} of type ${job.name} completed`);
  });

  jobQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} of type ${job.name} failed:`, err);
  });

  jobQueue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} of type ${job.name} stalled`);
  });

  logger.info('Job queue setup completed');
}