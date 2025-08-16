import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger';
import { MessageService } from './MessageService';

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  is_admin: boolean;
  is_owner: boolean;
}

export interface SlackEvent {
  type: string;
  event: {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
  };
  team_id: string;
}

export class SlackService {
  private static clients: Map<string, WebClient> = new Map();
  private static messageService = new MessageService();

  static getClient(token: string): WebClient {
    if (!this.clients.has(token)) {
      this.clients.set(token, new WebClient(token));
    }
    return this.clients.get(token)!;
  }

  static async setupWebhooks(teamId: string, botToken: string): Promise<void> {
    try {
      const client = this.getClient(botToken);
      
      // Subscribe to message events
      await client.apps.event.authorizations.list();
      logger.info(`Webhooks setup completed for team ${teamId}`);
    } catch (error) {
      logger.error(`Failed to setup webhooks for team ${teamId}:`, error);
      throw error;
    }
  }

  static async getChannels(botToken: string): Promise<SlackChannel[]> {
    try {
      const client = this.getClient(botToken);
      const result = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000
      });

      return result.channels?.map(channel => ({
        id: channel.id!,
        name: channel.name!,
        is_member: channel.is_member || false,
        is_private: channel.is_private || false
      })) || [];
    } catch (error) {
      logger.error('Failed to fetch channels:', error);
      throw error;
    }
  }

  static async getChannelHistory(
    botToken: string,
    channelId: string,
    cursor?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const client = this.getClient(botToken);
      const result = await client.conversations.history({
        channel: channelId,
        cursor,
        limit,
        include_all_metadata: true
      });

      return result.messages || [];
    } catch (error) {
      logger.error(`Failed to fetch history for channel ${channelId}:`, error);
      throw error;
    }
  }

  static async getUserInfo(botToken: string, userId: string): Promise<SlackUser> {
    try {
      const client = this.getClient(botToken);
      const result = await client.users.info({ user: userId });
      
      const user = result.user!;
      return {
        id: user.id!,
        name: user.name!,
        real_name: user.real_name!,
        email: user.profile?.email,
        is_admin: user.is_admin || false,
        is_owner: user.is_owner || false
      };
    } catch (error) {
      logger.error(`Failed to fetch user info for ${userId}:`, error);
      throw error;
    }
  }

  static async handleSlackEvent(event: SlackEvent): Promise<void> {
    try {
      logger.info('Processing Slack event:', event.type);

      if (event.type === 'event_callback' && event.event.type === 'message') {
        await this.processMessage(event);
      }
    } catch (error) {
      logger.error('Error handling Slack event:', error);
      throw error;
    }
  }

  private static async processMessage(event: SlackEvent): Promise<void> {
    const messageData = {
      slackMessageId: event.event.ts,
      slackUserId: event.event.user,
      channelId: event.event.channel,
      text: event.event.text,
      threadTs: event.event.thread_ts,
      timestamp: new Date(parseFloat(event.event.ts) * 1000),
      teamId: event.team_id
    };

    await this.messageService.storeMessage(messageData);
  }
}