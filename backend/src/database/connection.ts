import knex from 'knex';
import { logger } from '../utils/logger';

const config = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'engagement_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: '../../../database/migrations',
    extension: 'sql'
  }
};

export const db = knex(config);

export async function initializeDatabase(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await db.destroy();
  logger.info('Database connection closed');
}