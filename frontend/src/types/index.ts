export interface SentimentSummary {
  avgScore: number
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  messageCount: number
  distribution: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface ChannelSentiment {
  channelId: string
  channelName: string
  avgSentiment: number
  messageCount: number
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  lastUpdated: string
}

export interface WeeklyTrend {
  date: string
  avgSentiment: number
  messageCount: number
}

export interface BurnoutWarning {
  id: string
  channelId: string
  channelName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  indicators: string[]
  affectedUsers: string[]
  recommendation: string
  detectedAt: string
}

export interface Insight {
  id: string
  type: 'TREND' | 'ANOMALY' | 'PATTERN'
  title: string
  description: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
  channelIds: string[]
  createdAt: string
}

export interface DashboardData {
  overallSentiment: SentimentSummary
  channelBreakdown: ChannelSentiment[]
  weeklyTrends: WeeklyTrend[]
  burnoutWarnings: BurnoutWarning[]
  insights: Insight[]
}

export interface MonitoredChannel {
  id: string
  slackChannelId: string
  channelName: string
  isActive: boolean
  createdAt: string
}

export interface SlackChannel {
  id: string
  name: string
  isMember: boolean
  isPrivate: boolean
}

export interface User {
  id: string
  slackUserId: string
  email?: string
  displayName: string
  realName?: string
  isManager: boolean
  department?: string
  timezone?: string
}

export interface WeeklyReportData {
  id: string
  weekStart: string
  weekEnd: string
  channelsData: {
    totalChannels: number
    avgSentiment: number
    trendDirection: string
  }
  burnoutWarnings: BurnoutWarning[]
  insights: Insight[]
  recommendations: Recommendation[]
  createdAt: string
}

export interface Recommendation {
  type: 'ACTION' | 'MONITORING' | 'INVESTIGATION'
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  actionItems: string[]
}