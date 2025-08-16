import cron from 'node-cron';
import { jobQueue, JobTypes } from './index';
import { logger } from '../utils/logger';

export function setupScheduledJobs(): void {
  // Daily mood calculation (runs at 1 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.info('Running daily mood calculation job');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      // Get all active channels
      // const channels = await channelRepository.getActiveChannels();
      const channels = []; // Mock empty channels for now
      
      for (const channel of channels) {
        await jobQueue.add(JobTypes.CALCULATE_DAILY_MOOD, {
          channelId: channel.id,
          date: yesterday
        });
      }
      
      logger.info(`Queued daily mood calculation for ${channels.length} channels`);
    } catch (error) {
      logger.error('Daily mood calculation job failed:', error);
    }
  });

  // Weekly report generation (runs Monday at 9 AM)
  cron.schedule('0 9 * * 1', async () => {
    try {
      logger.info('Running weekly report generation job');
      
      const now = new Date();
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 6); // Previous Monday
      lastWeekStart.setHours(0, 0, 0, 0);
      
      await jobQueue.add(JobTypes.GENERATE_WEEKLY_REPORT, {
        weekStart: lastWeekStart
      });
      
      logger.info(`Queued weekly report generation for week starting ${lastWeekStart.toISOString()}`);
    } catch (error) {
      logger.error('Weekly report generation job failed:', error);
    }
  });

  // Channel history sync (runs every 4 hours)
  cron.schedule('0 */4 * * *', async () => {
    try {
      logger.info('Running channel history sync job');
      
      // Get all active channels
      // const channels = await channelRepository.getActiveChannels();
      const channels = []; // Mock empty channels for now
      
      for (const channel of channels) {
        await jobQueue.add(JobTypes.SYNC_CHANNEL_HISTORY, {
          channelId: channel.id
        }, {
          delay: Math.random() * 60000 // Random delay up to 1 minute to spread load
        });
      }
      
      logger.info(`Queued history sync for ${channels.length} channels`);
    } catch (error) {
      logger.error('Channel history sync job failed:', error);
    }
  });

  // Health check for job queue (runs every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    try {
      const waiting = await jobQueue.getWaiting();
      const active = await jobQueue.getActive();
      const failed = await jobQueue.getFailed();
      
      logger.info(`Job queue health: ${waiting.length} waiting, ${active.length} active, ${failed.length} failed`);
      
      // Alert if too many failed jobs
      if (failed.length > 50) {
        logger.warn(`High number of failed jobs: ${failed.length}`);
      }
    } catch (error) {
      logger.error('Job queue health check failed:', error);
    }
  });

  logger.info('Scheduled jobs setup completed');
}