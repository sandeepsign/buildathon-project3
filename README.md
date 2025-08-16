# Employee Engagement Pulse

A real-time sentiment analysis platform that monitors team engagement through Slack channel conversations, providing actionable insights to help managers identify burnout risks and improve team well-being.

## 🚀 Features

### Core Functionality
- **Real-time Slack Integration**: Monitors messages from configured Slack channels
- **AI-Powered Sentiment Analysis**: Uses OpenAI GPT-4 with VADER fallback for accurate sentiment scoring
- **Burnout Detection**: Automatically identifies channels with concerning sentiment patterns
- **Interactive Dashboard**: Real-time visualization of team sentiment metrics
- **Channel Management**: Easy addition/removal of monitored Slack channels

### Dashboard Components
- **Overall Team Sentiment**: Aggregate sentiment score with positive/negative/neutral distribution
- **Burnout Alerts**: High/medium severity warnings for channels showing negative patterns
- **Sentiment Trends**: Real-time chart showing last 2 hours with 10-minute intervals
- **Channel Breakdown**: Per-channel sentiment analysis and message counts
- **Sync Notifications**: Toast notifications showing new message processing results

### Technical Features
- **Background Job Processing**: Asynchronous message collection and sentiment analysis
- **Auto-updating Dashboard**: Polls every 30 seconds with manual sync capability
- **Date Range Filtering**: Optional time-based filtering (defaults to all messages)
- **Full-width Responsive Layout**: Optimized for desktop viewing
- **Message Deduplication**: Prevents duplicate message processing

## 🏗️ Architecture

### Backend (Node.js/TypeScript)
- **GraphQL API** with Apollo Server
- **PostgreSQL** database with Knex.js query builder
- **Redis** with Bull Queue for background job processing
- **Docker** containerization for databases
- **Slack Web API** integration for message collection

### Frontend (React/TypeScript)
- **React 18** with TypeScript
- **Apollo Client** for GraphQL state management
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Heroicons** for UI icons

### Key Services
- **SentimentService**: AI-powered message sentiment analysis
- **SlackService**: Slack Web API integration and message fetching
- **MessageService**: Database operations for message storage
- **AnalyticsService**: Burnout detection and trend calculation
- **NotificationService**: Alert management and notifications

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Slack workspace with bot token
- OpenAI API key (optional, falls back to VADER)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd buildathon-project3
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Start databases**
   ```bash
   docker-compose up -d
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=engagement_db
   DB_USER=postgres
   DB_PASSWORD=password
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # Slack Integration
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   
   # AI Services
   OPENAI_API_KEY=your-openai-key
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

5. **Database setup**
   ```bash
   cd backend
   npm run migrate
   ```

## 🚀 Usage

### Development Mode

1. **Start backend server**
   ```bash
   cd backend
   DB_NAME=engagement_db npm run dev
   ```

2. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - GraphQL Playground: http://localhost:3000/graphql

### Slack Bot Setup

1. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Create new app from manifest or scratch
   - Enable Socket Mode

2. **Required Bot Token Scopes**
   ```
   channels:history
   channels:read
   groups:history
   groups:read
   im:history
   im:read
   mpim:history
   mpim:read
   users:read
   ```

3. **Install App to Workspace**
   - Install the app to your Slack workspace
   - Copy the Bot User OAuth Token to your `.env` file

### Adding Channels for Monitoring

1. Navigate to the "Channels" tab
2. Select channels from the available list
3. Click "Add to Monitoring"
4. Use "Sync Messages" to start collecting data

## 📊 How It Works

### Message Collection Flow
1. **Channel Monitoring**: System monitors configured Slack channels
2. **Message Fetching**: Background jobs collect messages via Slack Web API
3. **Sentiment Analysis**: Each message is analyzed using OpenAI GPT-4 or VADER
4. **Data Storage**: Messages and sentiment scores stored in PostgreSQL
5. **Dashboard Updates**: Real-time dashboard reflects latest sentiment data

### Burnout Detection Algorithm
- **HIGH Severity**: Average sentiment < -0.5 with >10 messages
- **MEDIUM Severity**: Average sentiment < -0.2 with >10 messages
- **Recommendations**: Contextual suggestions for team intervention
- **Real-time Alerts**: Immediate visibility into concerning patterns

### Sentiment Scoring
- **Range**: -1.0 (very negative) to +1.0 (very positive)
- **Display**: Converted to 0-100% scale for intuitive understanding
- **Categories**: Positive (>0.1), Neutral (-0.1 to 0.1), Negative (<-0.1)

## 🔧 API Reference

### GraphQL Queries

```graphql
# Get dashboard data
query GetDashboardData($timeRange: TimeRange) {
  getDashboardData(timeRange: $timeRange) {
    overallSentiment {
      avgScore
      messageCount
      distribution {
        positive
        negative
        neutral
      }
    }
    burnoutWarnings {
      id
      channelName
      severity
      indicators
      recommendation
    }
    weeklyTrends {
      date
      avgSentiment
      messageCount
    }
    channelBreakdown {
      channelId
      channelName
      avgSentiment
      messageCount
    }
  }
}

# Sync all monitored channels
mutation SyncAllChannels {
  syncAllChannels {
    success
    channelCount
    newMessageCount
    errors
  }
}
```

### Database Schema

#### Messages Table
```sql
messages (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  channel_id UUID REFERENCES monitored_channels(id),
  slack_message_id VARCHAR UNIQUE,
  slack_user_id VARCHAR,
  message_text TEXT,
  timestamp TIMESTAMP,
  thread_ts VARCHAR
)
```

#### Sentiment Analysis Table
```sql
sentiment_analysis (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  sentiment_score DECIMAL(-1 to 1),
  sentiment_label VARCHAR,
  confidence DECIMAL,
  emotions JSONB,
  processed_by VARCHAR
)
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Docker Production Build

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DB_HOST=your-postgres-host
DB_NAME=engagement_db_prod
SLACK_BOT_TOKEN=xoxb-prod-token
OPENAI_API_KEY=your-prod-key
REDIS_URL=your-redis-url
```

## 📈 Monitoring & Analytics

### Key Metrics Tracked
- **Sentiment Score Trends**: Historical sentiment patterns
- **Message Volume**: Activity levels per channel
- **Burnout Risk Indicators**: Early warning system
- **Channel Health**: Per-channel sentiment breakdown
- **Response Patterns**: Team engagement analysis

### Burnout Indicators
- Consistently negative sentiment (< -0.2)
- Declining sentiment trends
- Reduced positive message frequency
- Increased complaint/frustration keywords

## 🛡️ Security & Privacy

- **Data Retention**: Messages processed for sentiment only, no long-term storage of personal content
- **Access Control**: Manager-only access to sensitive analytics
- **Token Security**: Slack tokens encrypted and securely stored
- **GDPR Compliance**: User data handling follows privacy regulations

## 🔍 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database status
docker-compose ps

# Reset database
docker-compose down -v
docker-compose up -d
```

**Slack Integration Problems**
- Verify bot token has required scopes
- Check if bot is added to monitored channels
- Ensure Socket Mode is enabled

**Sentiment Analysis Errors**
- Verify OpenAI API key is valid
- Check VADER fallback is working
- Monitor job queue for failed sentiment jobs

### Debug Commands

```bash
# Check job queue status
npm run queue:status

# View database logs
docker-compose logs postgres

# Check Redis connection
docker-compose logs redis

# View backend logs with database name
DB_NAME=engagement_db npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 sentiment analysis capabilities
- VADER sentiment analysis as reliable fallback
- Slack API for seamless workspace integration
- React and TypeScript communities for excellent tooling

---

**Built with ❤️ for better team engagement and mental health awareness in the workplace.**