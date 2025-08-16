import { JSONResolver } from 'graphql-scalars';
import { GraphQLScalarType } from 'graphql';
import { SlackService } from '../../services/SlackService';
import { MonitoredChannelModel } from '../../database/models/MonitoredChannel';
import { WorkspaceModel } from '../../database/models/Workspace';

// Function to generate sentiment trends for last 2 hours in 10-minute intervals
async function generateSentimentTrends(db: any, timeRange?: any) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
  
  // Generate 10-minute intervals
  const intervals = [];
  const intervalMinutes = 10;
  
  for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + (intervalMinutes * 60 * 1000))) {
    const intervalStart = new Date(time);
    const intervalEnd = new Date(time.getTime() + (intervalMinutes * 60 * 1000));
    
    // Get sentiment data for this interval
    const sentimentData = await db('sentiment_analysis')
      .join('messages', 'sentiment_analysis.message_id', 'messages.id')
      .where('messages.timestamp', '>=', intervalStart)
      .where('messages.timestamp', '<', intervalEnd)
      .select(
        db.raw('AVG(sentiment_analysis.sentiment_score) as avg_sentiment'),
        db.raw('COUNT(*) as message_count')
      )
      .first();
    
    intervals.push({
      date: intervalStart,
      avgSentiment: parseFloat(sentimentData?.avg_sentiment || '0'),
      messageCount: parseInt(sentimentData?.message_count || '0')
    });
  }
  
  return intervals;
}

// Custom Date scalar that accepts both strings and Date objects
const DateScalar = new GraphQLScalarType({
  name: 'Date',
  serialize: (value: any) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    return value;
  },
  parseValue: (value: any) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (value instanceof Date) {
      return value;
    }
    return new Date(value);
  },
  parseLiteral: (ast: any) => {
    return new Date(ast.value);
  }
});

export const resolvers = {
  Date: DateScalar,
  JSON: JSONResolver,

  Query: {
    getDashboardData: async (parent: any, { timeRange }: any, context: any) => {
      try {
        console.log('getDashboardData called with timeRange:', timeRange);
        
        const { db } = await import('../../database/connection');
        
        // Build query - if timeRange provided, filter by dates, otherwise get all
        let sentimentQuery = db('sentiment_analysis')
          .join('messages', 'sentiment_analysis.message_id', 'messages.id')
          .join('monitored_channels', 'messages.channel_id', 'monitored_channels.id');
          
        // Remove channelQuery - we'll build it fresh for channel breakdown
        
        if (timeRange) {
          // Parse dates properly - timeRange contains ISO strings or date strings
          let startDate, endDate;
          if (typeof timeRange.start === 'string' && !timeRange.start.includes('T')) {
            // Date-only string like "2025-08-09"
            startDate = new Date(timeRange.start + 'T00:00:00.000Z');
            endDate = new Date(timeRange.end + 'T23:59:59.999Z');
          } else {
            // Full ISO string or Date object
            startDate = new Date(timeRange.start);
            endDate = new Date(timeRange.end);
            endDate.setHours(23, 59, 59, 999);
          }
          
          console.log('Querying with dates:', { startDate, endDate });
          
          sentimentQuery = sentimentQuery
            .where('messages.timestamp', '>=', startDate)
            .where('messages.timestamp', '<=', endDate);
        } else {
          console.log('Querying all messages without date filter');
        }
        
        // Get overall sentiment from database
        const sentimentData = await sentimentQuery
          .select(
            db.raw('AVG(sentiment_analysis.sentiment_score) as avg_score'),
            db.raw('COUNT(*) as message_count'),
            db.raw('SUM(CASE WHEN sentiment_analysis.sentiment_score > 0.1 THEN 1 ELSE 0 END) as positive_count'),
            db.raw('SUM(CASE WHEN sentiment_analysis.sentiment_score < -0.1 THEN 1 ELSE 0 END) as negative_count'),
            db.raw('SUM(CASE WHEN sentiment_analysis.sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 ELSE 0 END) as neutral_count')
          )
          .first();

        // Get channel breakdown with proper time filtering
        let channelBreakdownQuery = db('monitored_channels')
          .leftJoin('messages', 'monitored_channels.id', 'messages.channel_id')
          .leftJoin('sentiment_analysis', 'messages.id', 'sentiment_analysis.message_id');
          
        if (timeRange) {
          let startDate, endDate;
          if (typeof timeRange.start === 'string' && !timeRange.start.includes('T')) {
            startDate = new Date(timeRange.start + 'T00:00:00.000Z');
            endDate = new Date(timeRange.end + 'T23:59:59.999Z');
          } else {
            startDate = new Date(timeRange.start);
            endDate = new Date(timeRange.end);
            endDate.setHours(23, 59, 59, 999);
          }
          
          channelBreakdownQuery = channelBreakdownQuery
            .where('messages.timestamp', '>=', startDate)
            .where('messages.timestamp', '<=', endDate);
        }
        
        const channelBreakdown = await channelBreakdownQuery
          .groupBy('monitored_channels.id', 'monitored_channels.slack_channel_id', 'monitored_channels.channel_name')
          .select(
            'monitored_channels.slack_channel_id as channelId',
            'monitored_channels.channel_name as channelName',
            db.raw('COALESCE(AVG(sentiment_analysis.sentiment_score), 0) as avgSentiment'),
            db.raw('COUNT(DISTINCT messages.id) as messageCount'),
            db.raw('MAX(messages.timestamp) as lastUpdated')
          );
          
        console.log('Raw channel breakdown query result:', channelBreakdown);

        // Generate burnout warnings based on sentiment data
        const burnoutWarnings = [];
        console.log('Checking for burnout warnings. Channel breakdown:', channelBreakdown.map(c => ({
          name: c.channelName,
          avgSentiment: c.avgSentiment,
          messageCount: c.messageCount
        })));
        
        for (const channel of channelBreakdown) {
          const avgSentiment = parseFloat(channel.avgsentiment || '0');
          const messageCount = parseInt(channel.messagecount || '0');
          
          console.log(`Checking channel ${channel.channelName}: sentiment=${avgSentiment}, messages=${messageCount}`);
          
          // Check for burnout indicators
          if (messageCount > 10) { // Only check channels with sufficient data
            if (avgSentiment < -0.5) {
              console.log(`HIGH burnout alert for ${channel.channelName}: sentiment ${avgSentiment} < -0.5`);
              burnoutWarnings.push({
                id: `burnout-${channel.channelId}-${Date.now()}`,
                channelId: channel.channelId,
                channelName: channel.channelName,
                severity: 'HIGH',
                indicators: ['Very negative sentiment (-0.5 or lower)', `${messageCount} messages analyzed`],
                affectedUsers: [], // Would be populated with actual user analysis
                recommendation: 'Consider team check-in or workload review for this channel',
                detectedAt: new Date()
              });
            } else if (avgSentiment < -0.2) {
              console.log(`MEDIUM burnout alert for ${channel.channelName}: sentiment ${avgSentiment} < -0.2`);
              burnoutWarnings.push({
                id: `burnout-${channel.channelId}-${Date.now()}`,
                channelId: channel.channelId,
                channelName: channel.channelName,
                severity: 'MEDIUM',
                indicators: ['Negative sentiment detected', `${messageCount} messages analyzed`],
                affectedUsers: [],
                recommendation: 'Monitor channel sentiment trends closely',
                detectedAt: new Date()
              });
            } else {
              console.log(`No burnout alert for ${channel.channelName}: sentiment ${avgSentiment} is acceptable`);
            }
          } else {
            console.log(`Skipping burnout check for ${channel.channelName}: only ${messageCount} messages (need >10)`);
          }
        }
        
        console.log(`Generated ${burnoutWarnings.length} burnout warnings:`, burnoutWarnings.map(w => ({
          channel: w.channelName,
          severity: w.severity,
          indicators: w.indicators
        })));

        const result = {
          overallSentiment: {
            avgScore: parseFloat(sentimentData?.avg_score || '0'),
            trend: 'STABLE',
            messageCount: parseInt(sentimentData?.message_count || '0'),
            distribution: {
              positive: parseInt(sentimentData?.positive_count || '0'),
              negative: parseInt(sentimentData?.negative_count || '0'),
              neutral: parseInt(sentimentData?.neutral_count || '0')
            }
          },
          channelBreakdown: channelBreakdown.map(channel => ({
            channelId: channel.channelId,
            channelName: channel.channelName,
            avgSentiment: parseFloat(channel.avgsentiment || '0'),
            messageCount: parseInt(channel.messagecount || '0'),
            trend: 'STABLE',
            lastUpdated: channel.lastupdated || new Date()
          })),
          weeklyTrends: await generateSentimentTrends(db, timeRange),
          burnoutWarnings,
          insights: []
        };
        
        console.log('Dashboard data returned successfully:', {
          messageCount: result.overallSentiment.messageCount,
          avgScore: result.overallSentiment.avgScore,
          channelCount: result.channelBreakdown.length
        });
        return result;
      } catch (error) {
        console.error('Error in getDashboardData:', error);
        throw error;
      }
    },

    getMonitoredChannels: async () => {
      try {
        const channels = await MonitoredChannelModel.findAll();
        return channels.map(channel => ({
          id: channel.id,
          slackChannelId: channel.slack_channel_id,
          channelName: channel.channel_name,
          isActive: channel.is_active,
          createdAt: channel.created_at
        }));
      } catch (error) {
        console.error('Failed to fetch monitored channels:', error);
        return [];
      }
    },

    getAvailableChannels: async () => {
      try {
        const botToken = process.env.SLACK_BOT_TOKEN;
        if (!botToken) {
          throw new Error('SLACK_BOT_TOKEN not configured');
        }
        
        const channels = await SlackService.getChannels(botToken);
        return channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          isMember: channel.is_member,
          isPrivate: channel.is_private
        }));
      } catch (error) {
        console.error('Failed to fetch Slack channels:', error);
        // Return mock data as fallback
        return [
          {
            id: 'C1234567890',
            name: 'general',
            isMember: true,
            isPrivate: false
          },
          {
            id: 'C0987654321',
            name: 'random',
            isMember: true,
            isPrivate: false
          }
        ];
      }
    },

    getChannelSentiment: async (parent: any, { channelId, timeRange }: any) => {
      return {
        channelId,
        avgSentiment: 0.3,
        sentimentHistory: [
          { timestamp: new Date(), score: 0.3, messageCount: 50 }
        ],
        emotionBreakdown: {
          joy: 0.4,
          neutral: 0.4,
          frustration: 0.2
        }
      };
    },

    getDailyMoods: async (parent: any, { channelIds, dateRange }: any) => {
      return channelIds.map((channelId: string) => ({
        id: `mood-${channelId}`,
        channelId,
        date: dateRange.start,
        avgSentiment: 0.3,
        messageCount: 50,
        positiveCount: 25,
        negativeCount: 5,
        neutralCount: 20,
        topEmotions: { joy: 0.4, neutral: 0.6 }
      }));
    },

    getWeeklyReport: async (parent: any, { weekStart }: any) => {
      try {
        // Get actual monitored channels count
        const channels = await MonitoredChannelModel.findAll();
        const totalChannels = channels.length;
        
        return {
          id: '1',
          weekStart,
          weekEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          channelsData: { totalChannels, avgSentiment: 0.35 },
          burnoutWarnings: [],
          insights: [],
          recommendations: [],
          createdAt: new Date()
        };
      } catch (error) {
        console.error('Error in getWeeklyReport:', error);
        // Fallback to default data
        return {
          id: '1',
          weekStart,
          weekEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          channelsData: { totalChannels: 1, avgSentiment: 0.35 },
          burnoutWarnings: [],
          insights: [],
          recommendations: [],
          createdAt: new Date()
        };
      }
    },

    getBurnoutWarnings: async () => {
      return [];
    },

    getUserProfile: async () => {
      return {
        id: '1',
        slackUserId: 'U1234567890',
        email: 'manager@company.com',
        displayName: 'John Manager',
        realName: 'John Manager',
        isManager: true,
        department: 'Engineering',
        timezone: 'America/New_York'
      };
    },

    getTeamMembers: async () => {
      return [
        {
          id: '2',
          slackUserId: 'U0987654321',
          email: 'dev@company.com',
          displayName: 'Jane Developer',
          realName: 'Jane Developer',
          isManager: false,
          department: 'Engineering',
          timezone: 'America/New_York'
        }
      ];
    }
  },

  Mutation: {
    addMonitoredChannel: async (parent: any, { channelId }: any) => {
      try {
        // Get default workspace (since we don't have multi-workspace support yet)
        const workspace = await WorkspaceModel.getDefaultWorkspace();
        if (!workspace) {
          throw new Error('No workspace found');
        }

        // Check if channel is already monitored
        const existing = await MonitoredChannelModel.findBySlackChannelId(channelId);
        if (existing) {
          throw new Error('Channel is already being monitored');
        }

        // Get channel name from Slack
        const botToken = process.env.SLACK_BOT_TOKEN;
        if (!botToken) {
          throw new Error('SLACK_BOT_TOKEN not configured');
        }

        const channels = await SlackService.getChannels(botToken);
        const channelInfo = channels.find(ch => ch.id === channelId);
        if (!channelInfo) {
          throw new Error('Channel not found in Slack');
        }

        // Create monitored channel in database
        const newChannel = await MonitoredChannelModel.create({
          workspace_id: workspace.id,
          slack_channel_id: channelId,
          channel_name: channelInfo.name
        });

        // Queue initial history sync for this channel
        const { jobQueue, JobTypes } = await import('../../jobs');
        await jobQueue.add(JobTypes.SYNC_CHANNEL_HISTORY, {
          channelId: newChannel.id,
          slackChannelId: channelId,
          botToken
        });

        console.log(`Queued history sync for channel: ${channelInfo.name}`);

        return {
          id: newChannel.id,
          slackChannelId: newChannel.slack_channel_id,
          channelName: newChannel.channel_name,
          isActive: newChannel.is_active,
          createdAt: newChannel.created_at
        };
      } catch (error) {
        console.error('Failed to add monitored channel:', error);
        throw error;
      }
    },

    removeMonitoredChannel: async (parent: any, { channelId }: any) => {
      try {
        console.log('Removing channel by ID:', channelId);
        const result = await MonitoredChannelModel.deleteById(channelId);
        console.log('Channel removal result:', result);
        return result;
      } catch (error) {
        console.error('Failed to remove monitored channel:', error);
        throw error;
      }
    },

    updateManagerConfig: async (parent: any, { config }: any) => {
      return {
        id: '1',
        monitoredChannels: config.monitoredChannels || [],
        alertThresholds: config.alertThresholds || {},
        notificationPreferences: config.notificationPreferences || {}
      };
    },

    triggerSentimentAnalysis: async (parent: any, { channelId }: any) => {
      // Queue sentiment analysis job
      return true;
    },

    syncAllChannels: async () => {
      try {
        console.log('Manual sync triggered for all channels');
        const botToken = process.env.SLACK_BOT_TOKEN;
        if (!botToken) {
          throw new Error('SLACK_BOT_TOKEN not configured');
        }

        // Get all monitored channels
        const channels = await MonitoredChannelModel.findAll();
        console.log(`Found ${channels.length} channels to sync:`, channels.map(c => ({ id: c.id, name: c.channel_name, slackId: c.slack_channel_id })));

        let totalNewMessages = 0;
        let totalMessages = 0;
        const errors: string[] = [];

        // Process sync jobs for each channel and wait for completion
        const { jobQueue, JobTypes } = await import('../../jobs');
        const { SlackService } = await import('../../services/SlackService');
        const { MessageService } = await import('../../services/MessageService');
        
        const messageService = new MessageService();
        
        for (const channel of channels) {
          try {
            console.log(`Syncing channel: ${channel.channel_name}`);
            
            // Get message count before sync
            const { db } = await import('../../database/connection');
            const beforeCount = await db('messages')
              .where('channel_id', channel.id)
              .count('id as count')
              .first();
            const initialCount = parseInt(beforeCount?.count || '0');
            
            // Fetch recent messages (last 7 days)
            const messages = await SlackService.getChannelHistory(botToken, channel.slack_channel_id, undefined, 200);
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            let processedCount = 0;
            
            for (const message of messages) {
              // Skip old messages
              const messageTime = parseFloat(message.ts) * 1000;
              if (messageTime < sevenDaysAgo) continue;
              
              // Skip bot messages
              if (message.bot_id || message.subtype) continue;
              
              try {
                // Store message and queue sentiment analysis
                const storedMessage = await messageService.storeMessage({
                  slackMessageId: message.ts,
                  slackUserId: message.user,
                  channelId: channel.id,
                  text: message.text || '',
                  threadTs: message.thread_ts,
                  timestamp: new Date(messageTime),
                  teamId: channel.workspace_id
                });
                
                // Queue sentiment analysis
                await jobQueue.add(JobTypes.ANALYZE_SENTIMENT, {
                  messageId: storedMessage.id,
                  messageText: message.text || ''
                });
                
                processedCount++;
              } catch (msgError) {
                console.error(`Failed to process message in channel ${channel.channel_name}:`, msgError);
              }
            }
            
            // Get message count after sync
            const afterCount = await db('messages')
              .where('channel_id', channel.id)
              .count('id as count')
              .first();
            const finalCount = parseInt(afterCount?.count || '0');
            const newMessages = finalCount - initialCount;
            
            totalNewMessages += newMessages;
            totalMessages += processedCount;
            
            console.log(`Synced ${processedCount} messages for channel ${channel.channel_name}, ${newMessages} new messages added`);
          } catch (channelError) {
            const errorMsg = `Failed to sync channel ${channel.channel_name}: ${channelError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

        return {
          success: errors.length === 0,
          channelCount: channels.length,
          totalMessageCount: totalMessages,
          newMessageCount: totalNewMessages,
          errors
        };
      } catch (error) {
        console.error('Failed to trigger sync:', error);
        return {
          success: false,
          channelCount: 0,
          totalMessageCount: 0,
          newMessageCount: 0,
          errors: [error.message]
        };
      }
    },

    generateWeeklyReport: async () => {
      return {
        id: '1',
        weekStart: new Date(),
        weekEnd: new Date(),
        channelsData: {},
        burnoutWarnings: [],
        insights: [],
        recommendations: [],
        createdAt: new Date()
      };
    }
  },

  Subscription: {
    sentimentUpdates: {
      subscribe: () => {
        // WebSocket subscription implementation would go here
        return {
          [Symbol.asyncIterator]: async function* () {
            yield {
              sentimentUpdates: {
                channelId: 'C1234567890',
                newSentiment: 0.4,
                timestamp: new Date()
              }
            };
          }
        };
      }
    },

    burnoutAlerts: {
      subscribe: () => {
        // WebSocket subscription implementation would go here
        return {
          [Symbol.asyncIterator]: async function* () {
            // Mock subscription
          }
        };
      }
    }
  }
};