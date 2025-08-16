import { db } from '../connection';

export interface MonitoredChannel {
  id: string;
  workspace_id: string;
  slack_channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
}

export class MonitoredChannelModel {
  static async findAll(): Promise<MonitoredChannel[]> {
    return await db('monitored_channels')
      .select('id', 'workspace_id', 'slack_channel_id', 'channel_name', 'is_active', 'created_by', 'created_at')
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async findBySlackChannelId(slackChannelId: string): Promise<MonitoredChannel | null> {
    const result = await db('monitored_channels')
      .select('id', 'workspace_id', 'slack_channel_id', 'channel_name', 'is_active', 'created_by', 'created_at')
      .where('slack_channel_id', slackChannelId)
      .where('is_active', true)
      .first();
    
    return result || null;
  }

  static async create(data: {
    workspace_id: string;
    slack_channel_id: string;
    channel_name: string;
    created_by?: string;
  }): Promise<MonitoredChannel> {
    const [result] = await db('monitored_channels')
      .insert({
        workspace_id: data.workspace_id,
        slack_channel_id: data.slack_channel_id,
        channel_name: data.channel_name,
        created_by: data.created_by
      })
      .returning(['id', 'workspace_id', 'slack_channel_id', 'channel_name', 'is_active', 'created_by', 'created_at']);
    
    return result;
  }

  static async remove(slackChannelId: string): Promise<boolean> {
    const result = await db('monitored_channels')
      .where('slack_channel_id', slackChannelId)
      .update({ is_active: false });
    
    return result > 0;
  }

  static async delete(slackChannelId: string): Promise<boolean> {
    const trx = await db.transaction();
    
    try {
      // First get the monitored channel ID
      const channel = await trx('monitored_channels')
        .select('id')
        .where('slack_channel_id', slackChannelId)
        .first();

      if (!channel) {
        await trx.rollback();
        return false;
      }

      // Delete sentiment analysis records for messages in this channel
      await trx('sentiment_analysis')
        .whereIn('message_id', function() {
          this.select('id')
            .from('messages')
            .where('channel_id', channel.id);
        })
        .del();

      // Delete messages for this channel
      await trx('messages')
        .where('channel_id', channel.id)
        .del();

      // Delete daily mood records for this channel
      await trx('daily_moods')
        .where('channel_id', channel.id)
        .del();

      // Delete the monitored channel
      const result = await trx('monitored_channels')
        .where('slack_channel_id', slackChannelId)
        .del();

      await trx.commit();
      return result > 0;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async deleteById(id: string): Promise<boolean> {
    const trx = await db.transaction();
    
    try {
      // Delete sentiment analysis records for messages in this channel
      await trx('sentiment_analysis')
        .whereIn('message_id', function() {
          this.select('id')
            .from('messages')
            .where('channel_id', id);
        })
        .del();

      // Delete messages for this channel
      await trx('messages')
        .where('channel_id', id)
        .del();

      // Delete daily mood records for this channel
      await trx('daily_moods')
        .where('channel_id', id)
        .del();

      // Delete the monitored channel
      const result = await trx('monitored_channels')
        .where('id', id)
        .del();

      await trx.commit();
      return result > 0;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}