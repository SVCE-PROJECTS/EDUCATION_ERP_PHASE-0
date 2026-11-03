/**
 * Unified ERP — Server Entry Point
 *
 * Startup sequence:
 *  1. Load environment variables
 *  2. Verify PostgreSQL connection
 *  3. Start Express server
 *  4. Register graceful-shutdown handlers
 */

'use strict';

require('dotenv').config();

const app                             = require('./src/app');
const config                          = require('./src/config');
const { testConnection, closePool }   = require('./src/config/db');
const { initializeDatabase }          = require('./src/config/dbBootstrap');
const { logger }                      = require('./src/utils/logger');
const duckdbService                   = require('./src/services/analytics/duckdbService');
const refreshService                  = require('./src/services/analytics/analyticsRefreshService');

async function start() {
  // 1. Verify PostgreSQL
  logger.info('Checking PostgreSQL connection...');
  const pgOk = await testConnection();
  if (!pgOk) {
    logger.error('❌  Cannot reach PostgreSQL. Check PG_HOST / DB_HOST in .env. Exiting.');
    process.exit(1);
  }

  // 2. Initialize DB bootstrap data if needed
  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Database bootstrap failed; continuing with existing schema state', error);
  }

  // 3. Start HTTP server
  const server = app.listen(config.port, () => {
    logger.info('─────────────────────────────────────────────────');
    logger.info(`🚀  Unified SVCE ERP  [${config.env}]`);
    logger.info(`📡  API    → http://localhost:${config.port}/api`);
    logger.info(`❤️   Health → http://localhost:${config.port}/health`);
    logger.info('─────────────────────────────────────────────────');
  });

  // 4. Initialize DuckDB analytics (non-blocking — PostgreSQL writes are unaffected
  //    even if this fails or DUCKDB_ENABLED=false)
  duckdbService.initialize()
    .then((ready) => {
      if (ready) {
        if (require('./src/config/analytics').refreshOnStart) {
          return refreshService.runRefresh();
        }
      }
    })
    .then(() => refreshService.startScheduledRefresh())
    .catch((err) =>
      logger.error('DuckDB startup error (non-fatal)', { error: err.message }),
    );

  // 4. Graceful Shutdown
  const shutdown = async (signal) => {
    logger.info(`\n${signal} received — shutting down...`);
    server.close(async () => {
      refreshService.stopScheduledRefresh();
      await duckdbService.close();
      await closePool();
      logger.info('✅  PostgreSQL pool and DuckDB closed. Bye!');
      process.exit(0);
    });
    // Force exit if graceful shutdown takes too long
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
    shutdown('unhandledRejection').catch(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

start();
