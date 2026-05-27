import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import {
  LogLevel,
  LogCategory,
  LogEntry,
  LoggerConfig,
  SanitizedLogEntry,
  FileTransportConfig,
  DatabaseTransportConfig,
  ExternalTransportConfig
} from '../types/logger.js';

interface ILoggerService {
  log(level: LogLevel, message: string, category: LogCategory, context?: any, error?: Error): void;
  error(message: string, category: LogCategory, context?: any, error?: Error): void;
  warn(message: string, category: LogCategory, context?: any): void;
  info(message: string, category: LogCategory, context?: any): void;
  debug(message: string, category: LogCategory, context?: any): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}
import { CorrelationContext } from '../types/correlation.js';
import { PerformanceMetrics } from '../types/performance.js';
import { ServerLog } from '../models/ServerLog.model.js';
import { PerformanceLog } from '../models/PerformanceLog.model.js';
import { SecurityLog } from '../models/SecurityLog.model.js';
import { LogShipperManager, ShippingConfig } from './logShipper.service.js';

export class LoggerService extends EventEmitter implements ILoggerService {
  private logger: winston.Logger;
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing = false;
  private logDirectory: string;
  private logShipperManager?: LogShipperManager;
  private static instance: LoggerService;

  constructor(config?: Partial<LoggerConfig>) {
    super();
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.config = this.getDefaultConfig(config);

    this.ensureLogDirectory();
    this.initializeLogger();
    this.initializeExternalShipping();
    this.setupQueueProcessor();

    // Handle process termination
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  public static getInstance(config?: Partial<LoggerConfig>): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(config);
    }
    return LoggerService.instance;
  }

  private getDefaultConfig(config?: Partial<LoggerConfig>): LoggerConfig {
    const env = process.env.NODE_ENV || 'development';

    return {
      level: (process.env.LOG_LEVEL as LogLevel) || (env === 'production' ? 'warn' : 'debug'),
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE !== 'false',
      enableDatabase: process.env.LOG_DATABASE === 'true',
      enableExternal: process.env.LOG_EXTERNAL_ENABLED === 'true',
      fileConfig: {
        name: 'file',
        level: 'info',
        enabled: true,
        filename: path.join(this.logDirectory, 'combined-%DATE%.log'),
        maxsize: process.env.LOG_MAX_SIZE || '50m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
        format: 'json'
      },
      databaseConfig: {
        name: 'database',
        level: 'info',
        enabled: process.env.LOG_DATABASE === 'true',
        collection: 'serverlogs',
        bufferSize: parseInt(process.env.LOG_DB_BUFFER_SIZE || '100'),
        flushInterval: parseInt(process.env.LOG_DB_FLUSH_INTERVAL || '5000'),
        retryAttempts: 3,
        retryDelay: 1000
      },
      externalConfig: {
        name: 'external',
        level: 'warn',
        enabled: process.env.LOG_EXTERNAL_ENABLED === 'true',
        endpoint: process.env.LOG_EXTERNAL_ENDPOINT || '',
        apiKey: process.env.LOG_EXTERNAL_API_KEY,
        batchSize: parseInt(process.env.LOG_EXTERNAL_BATCH_SIZE || '50'),
        flushInterval: parseInt(process.env.LOG_EXTERNAL_FLUSH_INTERVAL || '10000')
      },
      silent: false,
      ...config
    };
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }


    const subDirs = ['archives', 'crash'];
    subDirs.forEach(dir => {
      const subDirPath = path.join(this.logDirectory, dir);
      if (!fs.existsSync(subDirPath)) {
        fs.mkdirSync(subDirPath, { recursive: true });
      }
    });
  }

  private initializeLogger(): void {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.config.level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
            const categoryStr = category ? `[${category.toUpperCase()}]` : '';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} ${level} ${categoryStr} ${message} ${metaStr}`;
          })
        )
      }));
    }

    // File transports
    if (this.config.enableFile && this.config.fileConfig) {
      const fileConfig = this.config.fileConfig;

      // Combined log
      transports.push(new DailyRotateFile({
        filename: 'combined-%DATE%.log',
        dirname: this.logDirectory,
        level: fileConfig.level,
        maxSize: fileConfig.maxsize,
        maxFiles: fileConfig.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));

      // Error log
      transports.push(new DailyRotateFile({
        filename: 'error-%DATE%.log',
        dirname: this.logDirectory,
        level: 'error',
        maxSize: fileConfig.maxsize,
        maxFiles: fileConfig.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));

      // Security log
      transports.push(new DailyRotateFile({
        filename: 'security-%DATE%.log',
        dirname: this.logDirectory,
        level: 'warn',
        maxSize: fileConfig.maxsize,
        maxFiles: fileConfig.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    this.logger = winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false,
      silent: this.config.silent
    });
  }

  private initializeExternalShipping(): void {
    if (this.config.enableExternal && this.config.externalConfig) {
      // Create shipping configurations based on environment variables
      const shippingConfigs: ShippingConfig[] = [];

      // CloudWatch
      if (process.env.LOG_SHIPPER_CLOUDWATCH_ENABLED === 'true') {
        shippingConfigs.push({
          destination: 'cloudwatch',
          enabled: true,
          endpoint: process.env.LOG_SHIPPER_CLOUDWATCH_ENDPOINT,
          logGroup: process.env.LOG_SHIPPER_CLOUDWATCH_LOG_GROUP,
          logStream: process.env.LOG_SHIPPER_CLOUDWATCH_LOG_STREAM,
          batchSize: parseInt(process.env.LOG_SHIPPER_BATCH_SIZE || '50'),
          flushInterval: parseInt(process.env.LOG_SHIPPER_FLUSH_INTERVAL || '10000'),
          retryAttempts: 3
        });
      }

      // ELK
      if (process.env.LOG_SHIPPER_ELK_ENABLED === 'true') {
        shippingConfigs.push({
          destination: 'elk',
          enabled: true,
          endpoint: process.env.LOG_SHIPPER_ELK_ENDPOINT,
          index: process.env.LOG_SHIPPER_ELK_INDEX || 'logs-application',
          batchSize: parseInt(process.env.LOG_SHIPPER_BATCH_SIZE || '50'),
          flushInterval: parseInt(process.env.LOG_SHIPPER_FLUSH_INTERVAL || '10000'),
          retryAttempts: 3
        });
      }

      // DataDog
      if (process.env.LOG_SHIPPER_DATADOG_ENABLED === 'true') {
        shippingConfigs.push({
          destination: 'datadog',
          enabled: true,
          apiKey: process.env.LOG_SHIPPER_DATADOG_API_KEY,
          batchSize: parseInt(process.env.LOG_SHIPPER_BATCH_SIZE || '50'),
          flushInterval: parseInt(process.env.LOG_SHIPPER_FLUSH_INTERVAL || '10000'),
          retryAttempts: 3
        });
      }

      if (shippingConfigs.length > 0) {
        this.logShipperManager = new LogShipperManager(shippingConfigs);
      }
    }
  }

  private setupQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.logQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.logQueue.splice(0, 100); // Process in batches

    try {
      await Promise.allSettled(
        batch.map(entry => this.writeToTransports(entry))
      );
    } catch (error) {
      console.error('Error processing log queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async writeToTransports(entry: LogEntry): Promise<void> {
    // Database transport
    if (this.config.enableDatabase && this.config.databaseConfig) {
      await this.writeToDatabase(entry);
    }

    // External transport
    if (this.config.enableExternal && this.config.externalConfig) {
      await this.writeToExternal(entry);
    }
  }

  private async writeToDatabase(entry: LogEntry): Promise<void> {
    try {
      // Create database log entry
      const dbLog = new ServerLog({
        level: entry.level,
        message: entry.message,
        category: entry.category,
        context: entry.context || {},
        error: entry.error,
        createdAt: entry.timestamp
      });

      await dbLog.save();
      this.emit('database-log', entry);
    } catch (error) {
      // Fallback to console logging if database fails
      console.error('Database logging failed:', error);

      // Don't throw error to prevent logging system from breaking
      this.emit('database-log-error', { entry, error });
    }
  }

  private async writeToExternal(entry: LogEntry): Promise<void> {
    try {
      if (this.logShipperManager) {
        this.logShipperManager.ship(entry);
        this.emit('external-log', entry);
      }
    } catch (error) {
      console.error('External logging failed:', error);
    }
  }

  private sanitizeLogEntry(entry: LogEntry): SanitizedLogEntry {
    const sanitized = { ...entry };

    // Remove sensitive data from context
    if (sanitized.context) {
      const { password, token, apiKey, ...safeContext } = sanitized.context as any;
      sanitized.context = safeContext;
    }

    // Sanitize error stack if present
    if (sanitized.error?.stack && process.env.NODE_ENV === 'production') {
      // In production, we might want to limit stack trace exposure
      sanitized.error.stack = sanitized.error.stack.split('\n').slice(0, 5).join('\n');
    }

    return sanitized as SanitizedLogEntry;
  }

  // Public logging methods
  public log(level: LogLevel, message: string, category: LogCategory, context?: any, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      category,
      context,
      timestamp: new Date(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined
    };

    const sanitizedEntry = this.sanitizeLogEntry(entry);

    // Write to Winston (file/console)
    this.logger.log(level, message, category, {
      ...sanitizedEntry.context,
      error: sanitizedEntry.error
    });

    // Add to queue for async processing (database/external)
    this.logQueue.push(sanitizedEntry);
  }

  public error(message: string, category: LogCategory = 'error', context?: any, error?: Error): void {
    this.log('error', message, category, context, error);
  }

  public warn(message: string, category: LogCategory = 'system', context?: any): void {
    this.log('warn', message, category, context);
  }

  public info(message: string, category: LogCategory = 'system', context?: any): void {
    this.log('info', message, category, context);
  }

  public debug(message: string, category: LogCategory = 'system', context?: any): void {
    this.log('debug', message, category, context);
  }

  // Specialized logging methods
  public logHttpRequest(method: string, url: string, statusCode: number, duration: number, context?: any): void {
    this.info(`${method} ${url} - ${statusCode} (${duration}ms)`, 'http', {
      method,
      url,
      statusCode,
      duration,
      ...context
    });
  }

  public logDatabaseOperation(operation: string, collection: string, duration: number, context?: any): void {
    this.debug(`DB ${operation} on ${collection} (${duration}ms)`, 'database', {
      operation,
      collection,
      duration,
      ...context
    });
  }

  public logBusinessStep(step: string, data?: any, context?: any): void {
    this.info(`Business step: ${step}`, 'business', {
      step,
      data,
      ...context
    });
  }

  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', context?: any): void {
    const level: LogLevel = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this.log(level, `Security: ${event}`, 'security', {
      event,
      severity,
      ...context
    });
  }

  public logPerformance(metrics: PerformanceMetrics, context?: any): void {
    this.info('Performance metrics collected', 'performance', {
      metrics,
      ...context
    });
  }

  public logExternalCall(service: string, endpoint: string, method: string, duration: number, statusCode?: number, error?: Error, context?: any): void {
    const level: LogLevel = error ? 'error' : statusCode && statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `External call to ${service}`, 'external', {
      service,
      endpoint,
      method,
      duration,
      statusCode,
      ...context
    }, error);
  }

  // Utility methods
  public setLevel(level: LogLevel): void {
    this.config.level = level;
    this.logger.level = level;
  }

  public getLevel(): LogLevel {
    return this.config.level;
  }

  public isEnabled(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private async gracefulShutdown(): Promise<void> {
    this.info('Logger service shutting down', 'system');

    // Process remaining queue items
    if (this.logQueue.length > 0) {
      await this.processQueue();
    }

    // Shutdown log shipper
    if (this.logShipperManager) {
      await this.logShipperManager.shutdown();
    }

    // Close Winston transports
    this.logger.end();
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();










































