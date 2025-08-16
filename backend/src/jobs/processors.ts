import Queue from 'bull';
import { JobTypes } from './index';
import { SentimentService } from '../services/SentimentService';
import { AnalyticsService } from '../services/AnalyticsService';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';

const sentimentService = new SentimentService();
const analyticsService = new AnalyticsService();
const notificationService = new NotificationService();

export async function setupJobProcessors(jobQueue: Queue.Queue): Promise<void> {
  // Message processing pipeline
  jobQueue.process(JobTypes.PROCESS_MESSAGE, async (job) => {
    const { message } = job.data;
    logger.info(`Processing message ${message.id}`);
    
    // Store message logic would go here
    await new Promise(resolve => setTimeout(resolve, 100)); // Mock processing time
    
    // Queue sentiment analysis
    await jobQueue.add(JobTypes.ANALYZE_SENTIMENT, { 
      messageId: message.id,
      messageText: message.text 
    });
    
    // Check if we need to calculate daily mood
    const now = new Date();
    const isEndOfDay = now.getHours() >= 23;
    if (isEndOfDay) {
      await jobQueue.add(JobTypes.CALCULATE_DAILY_MOOD, {
        channelId: message.channelId,
        date: new Date(now.setHours(0, 0, 0, 0))
      });
    }

    return { processed: true, messageId: message.id };
  });

  // Sentiment analysis
  jobQueue.process(JobTypes.ANALYZE_SENTIMENT, async (job) => {
    const { messageId, messageText } = job.data;
    logger.info(`Analyzing sentiment for message ${messageId}`);
    
    try {
      const sentiment = await sentimentService.analyzeMessage(messageText);
      
      // Store sentiment results in database
      const { db } = await import('../database/connection');
      await db('sentiment_analysis').insert({
        message_id: messageId,
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
        confidence: sentiment.confidence,
        emotions: sentiment.emotions || {},
        processed_by: sentiment.model || 'openai'
      });
      
      logger.info(`Sentiment analysis completed for message ${messageId}: ${sentiment.label} (${sentiment.score})`);
      return { messageId, sentiment };
    } catch (error) {
      logger.error(`Failed to analyze sentiment for message ${messageId}:`, error);
      throw error;
    }
  });

  // Daily mood calculation
  jobQueue.process(JobTypes.CALCULATE_DAILY_MOOD, async (job) => {
    const { channelId, date } = job.data;
    logger.info(`Calculating daily mood for channel ${channelId} on ${date}`);
    
    const dailyMood = await analyticsService.calculateDailyMood(channelId, new Date(date));
    
    // Store daily mood in database
    // await dailyMoodRepository.store(dailyMood);
    
    // Check for burnout indicators
    const burnoutWarnings = await analyticsService.detectBurnoutIndicators(channelId);
    if (burnoutWarnings.length > 0) {
      await jobQueue.add(JobTypes.SEND_BURNOUT_ALERT, { 
        warnings: burnoutWarnings,
        channelId 
      });
    }
    
    return { channelId, date, avgSentiment: dailyMood.avgSentiment };
  });

  // Weekly report generation
  jobQueue.process(JobTypes.GENERATE_WEEKLY_REPORT, async (job) => {
    const { weekStart } = job.data;
    logger.info(`Generating weekly report for week starting ${weekStart}`);
    
    const report = await analyticsService.generateWeeklyReport(new Date(weekStart));
    
    // Store report and send to managers
    // const managers = await userRepository.getManagers();
    // for (const manager of managers) {
    //   await notificationService.sendWeeklyDigest(report, manager);
    // }
    
    return { reportId: report.id, weekStart };
  });

  // Channel history sync
  jobQueue.process(JobTypes.SYNC_CHANNEL_HISTORY, async (job) => {
    const { channelId, slackChannelId, botToken } = job.data;
    logger.info(`Syncing history for channel ${slackChannelId}`);
    
    try {
      const { SlackService } = await import('../services/SlackService');
      const { MessageService } = await import('../services/MessageService');
      
      // Fetch recent messages (last 7 days)
      const messages = await SlackService.getChannelHistory(botToken, slackChannelId, undefined, 200);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const messageService = new MessageService();
      let processedCount = 0;
      
      for (const message of messages) {
        // Skip old messages
        const messageTime = parseFloat(message.ts) * 1000;
        if (messageTime < sevenDaysAgo) continue;
        
        // Skip bot messages
        if (message.bot_id || message.subtype) continue;
        
        // Get workspace ID for this channel
        const { db } = await import('../database/connection');
        console.log(`Looking for channel with ID: ${channelId}`);
        console.log(`Database config:`, process.env.DB_NAME || 'engagement_db');
        
        // Debug: list all channels in database
        const allChannels = await db('monitored_channels').select('id', 'channel_name');
        console.log(`All channels in database:`, allChannels);
        
        const channelInfo = await db('monitored_channels')
          .select('workspace_id')
          .where('id', channelId)
          .first();
        
        if (!channelInfo) {
          console.error(`Channel not found in database: ${channelId}`);
          throw new Error(`Channel not found: ${channelId}`);
        }
        
        console.log(`Found channel info:`, channelInfo);

        // Store message and queue sentiment analysis
        const storedMessage = await messageService.storeMessage({
          slackMessageId: message.ts,
          slackUserId: message.user,
          channelId: channelId,
          text: message.text || '',
          threadTs: message.thread_ts,
          timestamp: new Date(messageTime),
          teamId: channelInfo.workspace_id
        });
        
        // Queue sentiment analysis
        await jobQueue.add(JobTypes.ANALYZE_SENTIMENT, {
          messageId: storedMessage.id,
          messageText: message.text || ''
        });
        
        processedCount++;
      }
      
      logger.info(`Synced ${processedCount} messages for channel ${slackChannelId}`);
      return { channelId, slackChannelId, messageCount: processedCount };
    } catch (error) {
      logger.error(`Failed to sync channel ${slackChannelId}:`, error);
      throw error;
    }
  });

  // Burnout alert sending
  jobQueue.process(JobTypes.SEND_BURNOUT_ALERT, async (job) => {
    const { warnings, channelId } = job.data;
    logger.info(`Sending burnout alerts for channel ${channelId}`);
    
    // Get managers for this channel
    // const managers = await userRepository.getManagersForChannel(channelId);
    const managers = []; // Mock empty managers list
    
    for (const warning of warnings) {
      await notificationService.sendBurnoutAlert(warning, managers);
    }
    
    return { alertsSent: warnings.length };
  });

  logger.info('Job processors setup completed');
}