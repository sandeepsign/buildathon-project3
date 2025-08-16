import { db } from '../database/connection';

export interface Workspace {
  id: string;
  slackTeamId: string;
  teamName: string;
  accessToken: string;
  botToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  workspaceId: string;
  slackUserId: string;
  email?: string;
  displayName?: string;
  realName?: string;
  isManager: boolean;
  department?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoredChannel {
  id: string;
  workspaceId: string;
  slackChannelId: string;
  channelName: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  workspaceId: string;
  channelId: string;
  slackMessageId: string;
  slackUserId: string;
  threadTs?: string;
  messageText?: string;
  messageType: string;
  timestamp: Date;
  createdAt: Date;
}

export class WorkspaceModel {
  static async findBySlackTeamId(slackTeamId: string): Promise<Workspace | null> {
    const result = await db('workspaces').where({ slack_team_id: slackTeamId }).first();
    return result || null;
  }

  static async create(data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const [workspace] = await db('workspaces').insert({
      slack_team_id: data.slackTeamId,
      team_name: data.teamName,
      access_token: data.accessToken,
      bot_token: data.botToken
    }).returning('*');
    return workspace;
  }
}

export class UserModel {
  static async findBySlackUserId(workspaceId: string, slackUserId: string): Promise<User | null> {
    const result = await db('users')
      .where({ workspace_id: workspaceId, slack_user_id: slackUserId })
      .first();
    return result || null;
  }

  static async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db('users').insert({
      workspace_id: data.workspaceId,
      slack_user_id: data.slackUserId,
      email: data.email,
      display_name: data.displayName,
      real_name: data.realName,
      is_manager: data.isManager,
      department: data.department,
      timezone: data.timezone
    }).returning('*');
    return user;
  }

  static async getManagers(workspaceId: string): Promise<User[]> {
    return await db('users').where({ workspace_id: workspaceId, is_manager: true });
  }
}

export class ChannelModel {
  static async getActiveChannels(workspaceId: string): Promise<MonitoredChannel[]> {
    return await db('monitored_channels')
      .where({ workspace_id: workspaceId, is_active: true });
  }

  static async addChannel(data: Omit<MonitoredChannel, 'id' | 'createdAt'>): Promise<MonitoredChannel> {
    const [channel] = await db('monitored_channels').insert({
      workspace_id: data.workspaceId,
      slack_channel_id: data.slackChannelId,
      channel_name: data.channelName,
      is_active: data.isActive,
      created_by: data.createdBy
    }).returning('*');
    return channel;
  }

  static async removeChannel(channelId: string): Promise<boolean> {
    const deleted = await db('monitored_channels').where({ id: channelId }).del();
    return deleted > 0;
  }
}

export class MessageModel {
  static async create(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const [message] = await db('messages').insert({
      workspace_id: data.workspaceId,
      channel_id: data.channelId,
      slack_message_id: data.slackMessageId,
      slack_user_id: data.slackUserId,
      thread_ts: data.threadTs,
      message_text: data.messageText,
      message_type: data.messageType,
      timestamp: data.timestamp
    }).returning('*');
    return message;
  }

  static async getChannelMessages(
    channelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Message[]> {
    return await db('messages')
      .where('channel_id', channelId)
      .whereBetween('timestamp', [startDate, endDate])
      .orderBy('timestamp', 'asc');
  }
}