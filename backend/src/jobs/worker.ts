import dotenv from 'dotenv';
import { setupJobs } from './index';
import { initializeDatabase } from '../database/connection';
import { logger } from '../utils/logger';

dotenv.config({ path: '../.env' });

async function startWorker() {
  try {
    logger.info('Starting background worker...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Setup job processors
    await setupJobs();
    
    logger.info('✅ Background worker started successfully');
    
    // Keep the process alive
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    const { jobQueue } = await import('./index');
    await jobQueue.close();
    
    const { closeDatabase } = await import('../database/connection');
    await closeDatabase();
    
    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

startWorker();