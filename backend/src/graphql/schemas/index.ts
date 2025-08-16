import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type Query {
    # Dashboard data
    getDashboardData(timeRange: TimeRange): DashboardData!
    
    # Channel management
    getMonitoredChannels: [Channel!]!
    getAvailableChannels: [SlackChannel!]!
    
    # Sentiment data
    getChannelSentiment(channelId: ID!, timeRange: TimeRange!): SentimentData!
    getDailyMoods(channelIds: [ID!]!, dateRange: DateRange!): [DailyMood!]!
    
    # Reports
    getWeeklyReport(weekStart: Date!): WeeklyReport
    getBurnoutWarnings: [BurnoutWarning!]!
    
    # User management
    getUserProfile: User!
    getTeamMembers: [User!]!
  }

  type Mutation {
    # Channel management
    addMonitoredChannel(channelId: String!): Channel!
    removeMonitoredChannel(channelId: ID!): Boolean!
    
    # Configuration
    updateManagerConfig(config: ManagerConfigInput!): ManagerConfig!
    
    # Manual triggers
    triggerSentimentAnalysis(channelId: ID!): Boolean!
    syncAllChannels: SyncResult!
    generateWeeklyReport: WeeklyReport!
  }

  type Subscription {
    # Real-time updates
    sentimentUpdates(channelIds: [ID!]!): SentimentUpdate!
    burnoutAlerts: BurnoutAlert!
  }

  # Input types
  input TimeRange {
    start: Date!
    end: Date!
  }

  input DateRange {
    start: Date!
    end: Date!
  }

  input ManagerConfigInput {
    monitoredChannels: [ID!]
    alertThresholds: JSON
    notificationPreferences: JSON
  }

  # Core types
  type DashboardData {
    overallSentiment: SentimentSummary!
    channelBreakdown: [ChannelSentiment!]!
    weeklyTrends: [WeeklyTrend!]!
    burnoutWarnings: [BurnoutWarning!]!
    insights: [Insight!]!
  }

  type SentimentSummary {
    avgScore: Float!
    trend: TrendDirection!
    messageCount: Int!
    distribution: SentimentDistribution!
  }

  type SentimentDistribution {
    positive: Int!
    negative: Int!
    neutral: Int!
  }

  type ChannelSentiment {
    channelId: ID!
    channelName: String!
    avgSentiment: Float!
    messageCount: Int!
    trend: TrendDirection!
    lastUpdated: Date!
  }

  type WeeklyTrend {
    date: Date!
    avgSentiment: Float!
    messageCount: Int!
  }

  type BurnoutWarning {
    id: ID!
    channelId: ID!
    channelName: String!
    severity: Severity!
    indicators: [String!]!
    affectedUsers: [String!]!
    recommendation: String!
    detectedAt: Date!
  }

  type Insight {
    id: ID!
    type: InsightType!
    title: String!
    description: String!
    impact: Impact!
    channelIds: [ID!]!
    createdAt: Date!
  }

  type Channel {
    id: ID!
    slackChannelId: String!
    channelName: String!
    isActive: Boolean!
    createdAt: Date!
  }

  type SlackChannel {
    id: ID!
    name: String!
    isMember: Boolean!
    isPrivate: Boolean!
  }

  type User {
    id: ID!
    slackUserId: String!
    email: String
    displayName: String!
    realName: String
    isManager: Boolean!
    department: String
    timezone: String
  }

  type ManagerConfig {
    id: ID!
    monitoredChannels: [ID!]!
    alertThresholds: JSON!
    notificationPreferences: JSON!
  }

  type SentimentData {
    channelId: ID!
    avgSentiment: Float!
    sentimentHistory: [SentimentPoint!]!
    emotionBreakdown: JSON!
  }

  type SentimentPoint {
    timestamp: Date!
    score: Float!
    messageCount: Int!
  }

  type DailyMood {
    id: ID!
    channelId: ID!
    date: Date!
    avgSentiment: Float!
    messageCount: Int!
    positiveCount: Int!
    negativeCount: Int!
    neutralCount: Int!
    topEmotions: JSON!
  }

  type WeeklyReport {
    id: ID!
    weekStart: Date!
    weekEnd: Date!
    channelsData: JSON!
    burnoutWarnings: [BurnoutWarning!]!
    insights: [Insight!]!
    recommendations: [Recommendation!]!
    createdAt: Date!
  }

  type Recommendation {
    type: RecommendationType!
    title: String!
    description: String!
    priority: Priority!
    actionItems: [String!]!
  }

  # Subscription types
  type SentimentUpdate {
    channelId: ID!
    newSentiment: Float!
    timestamp: Date!
  }

  type BurnoutAlert {
    warning: BurnoutWarning!
    timestamp: Date!
  }

  # Enums
  enum TrendDirection {
    IMPROVING
    DECLINING
    STABLE
  }

  enum Severity {
    LOW
    MEDIUM
    HIGH
  }

  enum Impact {
    LOW
    MEDIUM
    HIGH
  }

  enum InsightType {
    TREND
    ANOMALY
    PATTERN
  }

  enum RecommendationType {
    ACTION
    MONITORING
    INVESTIGATION
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
  }

  type SyncResult {
    success: Boolean!
    channelCount: Int!
    totalMessageCount: Int!
    newMessageCount: Int!
    errors: [String!]!
  }
`;