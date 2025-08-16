import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger';
import { BurnoutWarning, WeeklyReport } from './AnalyticsService';

export interface User {
  id: string;
  slackUserId: string;
  email: string;
  displayName: string;
  isManager: boolean;
}

export interface NotificationConfig {
  burnoutAlerts: boolean;
  weeklyDigest: boolean;
  slackNotifications: boolean;
  emailNotifications: boolean;
  severity: 'low' | 'medium' | 'high';
}

export class NotificationService {
  private slackClients: Map<string, WebClient> = new Map();

  async sendBurnoutAlert(warning: BurnoutWarning, managers: User[]): Promise<void> {
    try {
      const alertMessage = this.formatAlertMessage(warning);
      
      for (const manager of managers) {
        // Check if manager wants this type of alert
        const config = await this.getManagerConfig(manager.id);
        if (this.shouldSendAlert(warning, config)) {
          await this.sendSlackDM(manager.slackUserId, alertMessage);
          logger.info(`Sent burnout alert to manager ${manager.id}`);
        }
      }
    } catch (error) {
      logger.error('Failed to send burnout alert:', error);
      throw error;
    }
  }

  async sendWeeklyDigest(report: WeeklyReport, recipient: User): Promise<void> {
    try {
      const digestMessage = this.formatWeeklyDigest(report);
      await this.sendSlackDM(recipient.slackUserId, digestMessage);
      logger.info(`Sent weekly digest to ${recipient.id}`);
    } catch (error) {
      logger.error('Failed to send weekly digest:', error);
      throw error;
    }
  }

  async sendSlackNotification(channelId: string, message: string): Promise<void> {
    try {
      // Get appropriate bot token for the workspace
      const botToken = await this.getBotTokenForChannel(channelId);
      const client = this.getSlackClient(botToken);
      
      await client.chat.postMessage({
        channel: channelId,
        text: message,
        as_user: false
      });

      logger.info(`Sent notification to channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send Slack notification to ${channelId}:`, error);
      throw error;
    }
  }

  private async sendSlackDM(userId: string, message: string): Promise<void> {
    try {
      // Get appropriate bot token for the user's workspace
      const botToken = await this.getBotTokenForUser(userId);
      const client = this.getSlackClient(botToken);

      // Open DM channel
      const dmResult = await client.conversations.open({
        users: userId
      });

      if (dmResult.channel?.id) {
        await client.chat.postMessage({
          channel: dmResult.channel.id,
          text: message,
          as_user: false
        });
      }
    } catch (error) {
      logger.error(`Failed to send DM to user ${userId}:`, error);
      throw error;
    }
  }

  private formatAlertMessage(warning: BurnoutWarning): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴'
    };

    return `${severityEmoji[warning.severity]} **Burnout Alert - ${warning.severity.toUpperCase()} Priority**

**Channel**: <#${warning.channelId}>
**Indicators**: ${warning.indicators.join(', ')}
**Affected Team Members**: ${warning.affectedUsers.length} people

**Recommendation**: ${warning.recommendation}

_Detected at ${warning.detectedAt.toLocaleString()}_

💡 Consider reaching out to your team members for a check-in.`;
  }

  private formatWeeklyDigest(report: WeeklyReport): string {
    const weekRange = `${report.weekStart.toLocaleDateString()} - ${report.weekEnd.toLocaleDateString()}`;
    
    return `📊 **Weekly Team Pulse Report** - ${weekRange}

**Overall Sentiment**: ${report.channelsData.avgSentiment > 0 ? '✅ Positive' : report.channelsData.avgSentiment < -0.2 ? '⚠️ Concerning' : '➖ Neutral'}

**Key Insights**:
${report.insights.map(insight => `• ${insight.title}: ${insight.description}`).join('\n')}

**Recommendations**:
${report.recommendations.map(rec => `• ${rec.title} (${rec.priority} priority)`).join('\n')}

${report.burnoutWarnings.length > 0 ? `\n⚠️ **Active Burnout Warnings**: ${report.burnoutWarnings.length}` : ''}

_Generated automatically by Employee Engagement Pulse_`;
  }

  private shouldSendAlert(warning: BurnoutWarning, config: NotificationConfig): boolean {
    if (!config.burnoutAlerts) return false;
    
    const severityLevels = { low: 1, medium: 2, high: 3 };
    const configLevel = severityLevels[config.severity];
    const warningLevel = severityLevels[warning.severity];
    
    return warningLevel >= configLevel;
  }

  private getSlackClient(token: string): WebClient {
    if (!this.slackClients.has(token)) {
      this.slackClients.set(token, new WebClient(token));
    }
    return this.slackClients.get(token)!;
  }

  private async getBotTokenForChannel(channelId: string): Promise<string> {
    // Database query to get bot token for workspace containing this channel
    return process.env.SLACK_BOT_TOKEN || '';
  }

  private async getBotTokenForUser(userId: string): Promise<string> {
    // Database query to get bot token for workspace containing this user
    return process.env.SLACK_BOT_TOKEN || '';
  }

  private async getManagerConfig(managerId: string): Promise<NotificationConfig> {
    // Database query for manager's notification preferences
    return {
      burnoutAlerts: true,
      weeklyDigest: true,
      slackNotifications: true,
      emailNotifications: false,
      severity: 'medium'
    };
  }
}