import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
import { typeDefs } from './graphql/schemas';
import { resolvers } from './graphql/resolvers';
import { SlackService } from './services/SlackService';
import { setupJobs } from './jobs';
import { initializeDatabase } from './database/connection';
import { logger } from './utils/logger';

dotenv.config({ path: '../.env' });

const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api', limiter);

  // Logging
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Slack webhooks
  app.post('/webhooks/slack/events', async (req, res) => {
    try {
      await SlackService.handleSlackEvent(req.body);
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Slack webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // GraphQL server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      user: req.user,
      headers: req.headers
    }),
    formatError: (error) => {
      logger.error('GraphQL Error:', error);
      return error;
    }
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  // Initialize database
  await initializeDatabase();

  // Initialize background jobs
  await setupJobs();

  app.listen(PORT, () => {
    logger.info(`🚀 Server ready at http://localhost:${PORT}`);
    logger.info(`📊 GraphQL playground at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});