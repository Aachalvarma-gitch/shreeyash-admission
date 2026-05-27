import mongoose from 'mongoose';
import { logger } from '../services/logger.service.js';

interface DatabaseConfig {
  uri: string;
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  serverSelectionTimeout: number;
  maxPoolSize: number;
  minPoolSize: number;
}

const getDatabaseConfig = (): DatabaseConfig => ({
  uri: process.env.MONGODB_URI as string,
  maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
  serverSelectionTimeout: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '30000'),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2')
});

export const connectDB = async (): Promise<void> => {
  const config = getDatabaseConfig();
  let retries = 0;

  while (retries <= config.maxRetries) {
    try {
      logger.info('Attempting to connect to MongoDB', 'database', {
        attempt: retries + 1,
        maxRetries: config.maxRetries + 1,
        uri: config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });

      const conn = await mongoose.connect(config.uri, {
        maxPoolSize: config.maxPoolSize,
        minPoolSize: config.minPoolSize,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: config.serverSelectionTimeout,
        connectTimeoutMS: config.connectionTimeout
      });

      logger.info('MongoDB connected successfully', 'database', {
        host: conn.connection.host,
        port: conn.connection.port,
        name: conn.connection.name,
        poolSize: config.maxPoolSize
      });


      setupConnectionEventHandlers();


      setupQueryLogging();

      return;
    } catch (error) {
      retries++;
      const isLastAttempt = retries > config.maxRetries;

      logger.error('MongoDB connection failed', 'database', {
        attempt: retries,
        maxRetries: config.maxRetries + 1,
        error: (error as Error).message,
        isLastAttempt,
        nextRetryIn: isLastAttempt ? null : config.retryDelay
      });

      if (isLastAttempt) {
        logger.error('Max MongoDB connection retries exceeded', 'system');
        process.exit(1);
      }


      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
};

const setupConnectionEventHandlers = (): void => {
  mongoose.connection.on('error', (err: Error) => {
    logger.error('MongoDB runtime connection error', 'database', {
      error: err.message,
      stack: err.stack
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected', 'database');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected', 'database');
  });

  mongoose.connection.on('reconnectFailed', () => {
    logger.error('MongoDB reconnection failed', 'database');
  });


  process.on('SIGINT', async () => {
    try {
      logger.info('Received SIGINT, closing MongoDB connection', 'system');
    } catch (error) {

    }
    try {
      await mongoose.connection.close();
      try {
        logger.info('MongoDB connection closed gracefully', 'database');
      } catch (error) {

      }
    } catch (error) {
      try {
        logger.error('Error closing MongoDB connection', 'database', {
          error: (error as Error).message
        });
      } catch (logError) {

      }
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    try {
      logger.info('Received SIGTERM, closing MongoDB connection', 'system');
    } catch (error) {

    }
    try {
      await mongoose.connection.close();
      try {
        logger.info('MongoDB connection closed gracefully', 'database');
      } catch (error) {

      }
    } catch (error) {
      try {
        logger.error('Error closing MongoDB connection', 'database', {
          error: (error as Error).message
        });
      } catch (logError) {

      }
    }
    process.exit(0);
  });
};

const setupQueryLogging = (): void => {

  const slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000');

  mongoose.set('debug', (collection: string, method: string, query: any, doc: any, options?: any) => {
    const startTime = Date.now();


    logger.debug('Database operation', 'database', {
      collection,
      method,
      query: JSON.stringify(query).substring(0, 200),
      doc: doc ? JSON.stringify(doc).substring(0, 100) : undefined
    });
  });
};


export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {

    if (mongoose.connection.readyState === 1) {

      const latency = Date.now() - startTime;
      logger.debug('Database health check passed', 'database', { latency });
      return { status: 'healthy', latency };
    } else {
      throw new Error('Database not connected');
    }
  } catch (error) {
    const latency = Date.now() - startTime;

    logger.error('Database health check failed', 'database', {
      error: (error as Error).message,
      latency
    });

    return {
      status: 'unhealthy',
      latency,
      error: (error as Error).message
    };
  }
};


export const getDatabaseStats = async () => {
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database not connected');
    }
    const stats = await mongoose.connection.db.stats();
    logger.info('Database statistics retrieved', 'database', { stats });
    return stats;
  } catch (error) {
    logger.error('Failed to get database statistics', 'database', {
      error: (error as Error).message
    });
    throw error;
  }
};

