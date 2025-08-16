import { logger } from '../utils/logger';
import { jobQueue, JobTypes } from '../jobs';
import { MessageModel } from '../models';

export interface MessageData {
  slackMessageId: string;
  slackUserId: string;
  channelId: string;
  text: string;
  threadTs?: string;
  timestamp: Date;
  teamId: string;
}

export interface StoredMessage {
  id: string;
  workspaceId: string;
  channelId: string;
  slackMessageId: string;
  slackUserId: string;
  threadTs?: string;
  messageText: string;
  messageType: string;
  timestamp: Date;
  createdAt: Date;
}

export class MessageService {
  async storeMessage(messageData: MessageData): Promise<StoredMessage> {
    try {
      const storedMessage = await MessageModel.create({
        workspaceId: messageData.teamId,
        channelId: messageData.channelId,
        slackMessageId: messageData.slackMessageId,
        slackUserId: messageData.slackUserId,
        threadTs: messageData.threadTs,
        messageText: messageData.text,
        messageType: 'message',
        timestamp: messageData.timestamp
      });

      logger.info(`Stored message ${storedMessage.id} from user ${messageData.slackUserId}`);

      // Queue sentiment analysis
      await jobQueue.add(JobTypes.ANALYZE_SENTIMENT, {
        messageId: storedMessage.id,
        messageText: messageData.text
      }, {
        delay: 1000 // Small delay to batch similar messages
      });

      return storedMessage;
    } catch (error) {
      logger.error('Failed to store message:', error);
      throw error;
    }
  }

  async getMessage(messageId: string): Promise<StoredMessage | null> {
    // Database query implementation would go here
    logger.info(`Retrieving message ${messageId}`);
    return null;
  }

  async getChannelMessages(
    channelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StoredMessage[]> {
    // Database query implementation would go here
    logger.info(`Retrieving messages for channel ${channelId} between ${startDate} and ${endDate}`);
    return [];
  }

  async getUserMessages(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StoredMessage[]> {
    // Database query implementation would go here
    logger.info(`Retrieving messages for user ${userId} between ${startDate} and ${endDate}`);
    return [];
  }
}