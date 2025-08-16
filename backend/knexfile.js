const path = require('path');

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'engagement_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    migrations: {
      directory: path.join(__dirname, '..', 'database', 'migrations'),
      extension: 'sql'
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds')
    }
  },

  staging: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.join(__dirname, '..', 'database', 'migrations'),
      extension: 'sql'
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds')
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.join(__dirname, '..', 'database', 'migrations'),
      extension: 'sql'
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds')
    }
  }
};