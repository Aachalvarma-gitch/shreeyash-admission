import { EventEmitter } from 'events';
import { logger } from './logger.service.js';
import { LogEntry } from '../types/logger.js';
import { logExternalCall } from '../utils/externalCallLogger.js';

export type ShippingDestination = 'cloudwatch' | 'elk' | 'datadog' | 'sumologic' | 'custom';

export interface ShippingConfig {
  destination: ShippingDestination;
  endpoint?: string;
  apiKey?: string;
  index?: string;
  logGroup?: string;
  logStream?: string;
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  enabled: boolean;
  headers?: Record<string, string>;
}

export class LogShipper extends EventEmitter {
  private config: ShippingConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isShipping = false;

  constructor(config: ShippingConfig) {
    super();
    this.config = config;

    if (this.config.enabled) {
      this.startFlushTimer();
      logger.info('Log shipper initialized', 'system', { destination: config.destination });
    }
  }

  /**
   * Add log entry to shipping buffer
   */
  public ship(entry: LogEntry): void {
    if (!this.config.enabled) return;

    this.logBuffer.push(entry);

    // Flush immediately if buffer is full
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush logs to external destination
   */
  private async flush(): Promise<void> {
    if (this.isShipping || this.logBuffer.length === 0) return;

    this.isShipping = true;
    const batch = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.sendBatch(batch);
      this.emit('batch-sent', { count: batch.length, destination: this.config.destination });
    } catch (error) {
      logger.error('Failed to ship log batch', 'system', {
        destination: this.config.destination,
        batchSize: batch.length,
        error: (error as Error).message
      });

      // Re-queue failed logs
      this.logBuffer.unshift(...batch);
      this.emit('batch-failed', { error, batch, destination: this.config.destination });
    } finally {
      this.isShipping = false;
    }
  }

  /**
   * Send batch of logs to external service
   */
  private async sendBatch(batch: LogEntry[]): Promise<void> {
    switch (this.config.destination) {
      case 'cloudwatch':
        await this.sendToCloudWatch(batch);
        break;
      case 'elk':
        await this.sendToELK(batch);
        break;
      case 'datadog':
        await this.sendToDataDog(batch);
        break;
      case 'sumologic':
        await this.sendToSumoLogic(batch);
        break;
      case 'custom':
        await this.sendToCustom(batch);
        break;
      default:
        throw new Error(`Unknown shipping destination: ${this.config.destination}`);
    }
  }

  /**
   * Send logs to AWS CloudWatch
   */
  private async sendToCloudWatch(batch: LogEntry[]): Promise<void> {
    if (!this.config.logGroup) throw new Error('CloudWatch logGroup is required');

    const events = batch.map(entry => ({
      message: JSON.stringify({
        timestamp: entry.timestamp?.toISOString(),
        level: entry.level,
        category: entry.category,
        message: entry.message,
        context: entry.context,
        error: entry.error
      }),
      timestamp: entry.timestamp?.getTime() || Date.now()
    }));

    const payload = {
      logGroupName: this.config.logGroup,
      logStreamName: this.config.logStream || 'application-logs',
      logEvents: events
    };

    await logExternalCall({
      service: 'cloudwatch',
      endpoint: 'https://logs.us-east-1.amazonaws.com/',
      method: 'POST',
      headers: {
        'X-Amz-Target': 'Logs_20140328.PutLogEvents',
        ...this.config.headers
      }
    }, async () => {
      // This would use AWS SDK in a real implementation
      // For now, we'll simulate the call
      if (!this.config.endpoint) {
        throw new Error('CloudWatch endpoint is required');
      }
      // Simulate external call
      return { success: true };
    });
  }

  /**
   * Send logs to ELK Stack
   */
  private async sendToELK(batch: LogEntry[]): Promise<void> {
    const index = this.config.index || 'logs-application';

    const documents = batch.map(entry => ({
      '@timestamp': entry.timestamp?.toISOString(),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      context: entry.context,
      error: entry.error
    }));

    const payload = ([] as any[]).concat(
      documents.map(doc => ({ index: { _index: index } })),
      documents
    );

    await logExternalCall({
      service: 'elasticsearch',
      endpoint: this.config.endpoint || 'http://localhost:9200/_bulk',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        ...this.config.headers
      }
    }, async () => {
      // This would make actual HTTP call to Elasticsearch
      // For now, we'll simulate the call
      if (!this.config.endpoint) {
        throw new Error('ELK endpoint is required');
      }
      return { success: true };
    });
  }

  /**
   * Send logs to DataDog
   */
  private async sendToDataDog(batch: LogEntry[]): Promise<void> {
    const logs = batch.map(entry => ({
      timestamp: entry.timestamp?.getTime(),
      level: entry.level.toUpperCase(),
      message: entry.message,
      service: 'newra-grids',
      tags: [`category:${entry.category}`],
      ...entry.context,
      error: entry.error
    }));

    await logExternalCall({
      service: 'datadog',
      endpoint: 'https://http-intake.logs.datadoghq.com/v1/input',
      method: 'POST',
      headers: {
        'DD-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    }, async () => {
      // This would make actual HTTP call to DataDog
      if (!this.config.apiKey) {
        throw new Error('DataDog API key is required');
      }
      return { success: true };
    });
  }

  /**
   * Send logs to Sumo Logic
   */
  private async sendToSumoLogic(batch: LogEntry[]): Promise<void> {
    const logLines = batch.map(entry =>
      JSON.stringify({
        timestamp: entry.timestamp?.toISOString(),
        level: entry.level,
        category: entry.category,
        message: entry.message,
        context: entry.context,
        error: entry.error
      })
    ).join('\n');

    await logExternalCall({
      service: 'sumologic',
      endpoint: this.config.endpoint || '',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...this.config.headers
      }
    }, async () => {
      // This would make actual HTTP call to Sumo Logic
      if (!this.config.endpoint) {
        throw new Error('Sumo Logic endpoint is required');
      }
      return { success: true };
    });
  }

  /**
   * Send logs to custom endpoint
   */
  private async sendToCustom(batch: LogEntry[]): Promise<void> {
    const payload = {
      logs: batch.map(entry => ({
        timestamp: entry.timestamp?.toISOString(),
        level: entry.level,
        category: entry.category,
        message: entry.message,
        context: entry.context,
        error: entry.error
      }))
    };

    await logExternalCall({
      service: 'custom-logging',
      endpoint: this.config.endpoint || '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    }, async () => {
      // This would make actual HTTP call to custom endpoint
      if (!this.config.endpoint) {
        throw new Error('Custom endpoint is required');
      }
      return { success: true };
    });
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop shipping and flush remaining logs
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining logs
    if (this.logBuffer.length > 0) {
      logger.info('Flushing remaining logs before shutdown', 'system', {
        remainingCount: this.logBuffer.length
      });
      await this.flush();
    }

    logger.info('Log shipper shut down', 'system', {
      destination: this.config.destination
    });
  }

  /**
   * Get current buffer size
   */
  public getBufferSize(): number {
    return this.logBuffer.length;
  }

  /**
   * Force immediate flush
   */
  public forceFlush(): Promise<void> {
    return this.flush();
  }
}

// Factory function to create shipper instances
export const createLogShipper = (config: ShippingConfig): LogShipper => {
  return new LogShipper(config);
};

// Multiple shipper manager
export class LogShipperManager {
  private shippers: Map<string, LogShipper> = new Map();

  constructor(shipperConfigs: ShippingConfig[]) {
    shipperConfigs.forEach(config => {
      if (config.enabled) {
        const shipper = createLogShipper(config);
        this.shippers.set(config.destination, shipper);
      }
    });
  }

  /**
   * Ship log to all enabled destinations
   */
  public ship(entry: LogEntry): void {
    this.shippers.forEach(shipper => {
      shipper.ship(entry);
    });
  }

  /**
   * Shutdown all shippers
   */
  public async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.shippers.values()).map(shipper =>
      shipper.shutdown()
    );
    await Promise.all(shutdownPromises);
  }

  /**
   * Get shipper statistics
   */
  public getStats(): Record<string, { bufferSize: number }> {
    const stats: Record<string, { bufferSize: number }> = {};
    this.shippers.forEach((shipper, name) => {
      stats[name] = { bufferSize: shipper.getBufferSize() };
    });
    return stats;
  }
}










































