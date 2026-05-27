import { EventEmitter } from 'events';
import * as os from 'os';
import { logger } from './logger.service.js';
import { ServerLog } from '../models/ServerLog.model.js';
import { PerformanceLog } from '../models/PerformanceLog.model.js';
import { SecurityLog } from '../models/SecurityLog.model.js';
import { getSystemHealthMetrics } from '../middlewares/performanceMonitor.js';
import { checkDatabaseHealth } from '../config/database.js';

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network?: {
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: Date;
  requests: {
    total: number;
    perSecond: number;
    perMinute: number;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<number, number>;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
    recent: any[];
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowRequests: number;
  };
  database: {
    connections: number;
    queryCount: number;
    slowQueries: number;
    connectionPool: {
      used: number;
      available: number;
      pending: number;
    };
  };
  external: {
    totalCalls: number;
    successRate: number;
    averageResponseTime: number;
    failures: Record<string, number>;
  };
}

export interface AlertCondition {
  id: string;
  name: string;
  description: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number; // Prevent alert spam
  lastTriggered?: Date;
}

export class MetricsService extends EventEmitter {
  private systemMetricsHistory: SystemMetrics[] = [];
  private applicationMetricsHistory: ApplicationMetrics[] = [];
  private alertConditions: AlertCondition[] = [];
  private collectionInterval: number;
  private retentionPeriod: number;
  private intervalId?: NodeJS.Timeout;

  constructor(collectionIntervalMs: number = 60000, retentionPeriodHours: number = 24) {
    super();
    this.collectionInterval = collectionIntervalMs;
    this.retentionPeriod = retentionPeriodHours * 60 * 60 * 1000; // Convert to milliseconds

    this.initializeDefaultAlerts();
    this.startCollection();
  }

  /**
   * Initialize default alert conditions
   */
  private initializeDefaultAlerts(): void {
    this.alertConditions = [
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'System memory usage is above 85%',
        metric: 'system.memory.percentage',
        operator: '>',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15
      },
      {
        id: 'critical-memory-usage',
        name: 'Critical Memory Usage',
        description: 'System memory usage is above 95%',
        metric: 'system.memory.percentage',
        operator: '>',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'System CPU usage is above 80%',
        metric: 'system.cpu.usage',
        operator: '>',
        threshold: 80,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Application error rate is above 5%',
        metric: 'application.errors.rate',
        operator: '>',
        threshold: 5,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        description: 'Average response time is above 2000ms',
        metric: 'application.performance.averageResponseTime',
        operator: '>',
        threshold: 2000,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'database-connection-failure',
        name: 'Database Connection Issues',
        description: 'Database health check is failing',
        metric: 'database.status',
        operator: '==',
        threshold: 0, // 0 = unhealthy
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 2
      }
    ];
  }

  /**
   * Start periodic metrics collection
   */
  private startCollection(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.collectionInterval);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();

      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics(timestamp);
      this.systemMetricsHistory.push(systemMetrics);

      // Collect application metrics
      const applicationMetrics = await this.collectApplicationMetrics(timestamp);
      this.applicationMetricsHistory.push(applicationMetrics);

      // Clean up old metrics
      this.cleanupOldMetrics();

      // Check alert conditions
      await this.checkAlerts(systemMetrics, applicationMetrics);

      this.emit('metrics-collected', { systemMetrics, applicationMetrics });

    } catch (error) {
      logger.error('Failed to collect metrics', 'system', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Collect system-level metrics
   */
  private async collectSystemMetrics(timestamp: Date): Promise<SystemMetrics> {
    const healthMetrics = getSystemHealthMetrics();

    // Calculate trends
    const previousMetrics = this.systemMetricsHistory[this.systemMetricsHistory.length - 1];
    const memoryTrend = this.calculateTrend(
      previousMetrics?.memory.percentage || 0,
      healthMetrics.memory.percentage
    );
    const cpuTrend = this.calculateTrend(
      previousMetrics?.cpu.usage || 0,
      healthMetrics.cpu.usage
    );

    // Disk usage (simplified - in production, you'd use a library like 'diskusage')
    const diskMetrics = await this.getDiskUsage();

    return {
      timestamp,
      memory: {
        used: healthMetrics.memory.used,
        total: healthMetrics.memory.total,
        percentage: healthMetrics.memory.percentage,
        trend: memoryTrend
      },
      cpu: {
        usage: healthMetrics.cpu.usage,
        loadAverage: healthMetrics.cpu.loadAverage,
        trend: cpuTrend
      },
      disk: diskMetrics
    };
  }

  /**
   * Collect application-level metrics
   */
  private async collectApplicationMetrics(timestamp: Date): Promise<ApplicationMetrics> {
    const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);

    // Request metrics
    const requestStats = await this.getRequestStats(oneHourAgo, timestamp);

    // Error metrics
    const errorStats = await this.getErrorStats(oneHourAgo, timestamp);

    // Performance metrics
    const performanceStats = await this.getPerformanceStats(oneHourAgo, timestamp);

    // Database metrics
    const databaseStats = await this.getDatabaseStats();

    // External call metrics (placeholder - would need to be implemented)
    const externalStats = await this.getExternalCallStats(oneHourAgo, timestamp);

    return {
      timestamp,
      requests: requestStats,
      errors: errorStats,
      performance: performanceStats,
      database: databaseStats,
      external: externalStats
    };
  }

  /**
   * Get request statistics
   */
  private async getRequestStats(startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          category: 'http',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byEndpoint: {
            $push: {
              endpoint: '$context.url',
              statusCode: '$context.statusCode'
            }
          }
        }
      }
    ];

    const result = await ServerLog.aggregate(pipeline);
    const stats = result[0] || { total: 0, byEndpoint: [] };

    // Calculate rates
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const perSecond = stats.total / (durationHours * 3600);
    const perMinute = stats.total / (durationHours * 60);

    // Group by endpoint and status code
    const byEndpoint: Record<string, number> = {};
    const byStatusCode: Record<number, number> = {};

    stats.byEndpoint.forEach((item: any) => {
      if (item.endpoint) {
        byEndpoint[item.endpoint] = (byEndpoint[item.endpoint] || 0) + 1;
      }
      if (item.statusCode) {
        byStatusCode[item.statusCode] = (byStatusCode[item.statusCode] || 0) + 1;
      }
    });

    return {
      total: stats.total,
      perSecond: Math.round(perSecond * 100) / 100,
      perMinute: Math.round(perMinute * 100) / 100,
      byEndpoint,
      byStatusCode
    };
  }

  /**
   * Get error statistics
   */
  private async getErrorStats(startDate: Date, endDate: Date) {
    const errorLogs = await ServerLog.find({
      level: { $in: ['error', 'warn'] },
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 }).limit(10);

    const totalErrors = await ServerLog.countDocuments({
      level: 'error',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalRequests = await ServerLog.countDocuments({
      category: 'http',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Group errors by type
    const byType: Record<string, number> = {};
    errorLogs.forEach(log => {
      const errorType = log.error?.name || log.category || 'unknown';
      byType[errorType] = (byType[errorType] || 0) + 1;
    });

    return {
      total: totalErrors,
      rate: Math.round(errorRate * 100) / 100,
      byType,
      recent: errorLogs.slice(0, 5)
    };
  }

  /**
   * Get performance statistics
   */
  private async getPerformanceStats(startDate: Date, endDate: Date) {
    const perfLogs = await PerformanceLog.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    if (perfLogs.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowRequests: 0
      };
    }

    const responseTimes = perfLogs.map(log => log.responseTime).sort((a, b) => a - b);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    const slowRequests = perfLogs.filter(log => log.responseTime > 2000).length;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      slowRequests
    };
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats() {
    const dbHealth = await checkDatabaseHealth();

    // This is a simplified version - in production, you'd get more detailed stats
    return {
      connections: 1, // Would need to implement connection counting
      queryCount: 0, // Would need to implement query counting
      slowQueries: 0, // Would need to implement slow query detection
      connectionPool: {
        used: 1,
        available: 9,
        pending: 0
      }
    };
  }

  /**
   * Get external call statistics
   */
  private async getExternalCallStats(startDate: Date, endDate: Date) {
    // Placeholder - would need to implement external call tracking
    return {
      totalCalls: 0,
      successRate: 100,
      averageResponseTime: 0,
      failures: {}
    };
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage() {
    // Simplified disk usage - in production, use a proper library
    try {
      // This is a placeholder - actual implementation would use 'diskusage' or similar
      return {
        used: 0,
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        percentage: 0
      };
    } catch (error) {
      return {
        used: 0,
        total: 0,
        percentage: 0
      };
    }
  }

  /**
   * Calculate trend between two values
   */
  private calculateTrend(previous: number, current: number): 'increasing' | 'decreasing' | 'stable' {
    const difference = current - previous;
    const threshold = Math.abs(previous) * 0.05; // 5% change threshold

    if (Math.abs(difference) < threshold) return 'stable';
    return difference > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Check alert conditions
   */
  private async checkAlerts(systemMetrics: SystemMetrics, applicationMetrics: ApplicationMetrics): Promise<void> {
    const now = new Date();

    for (const condition of this.alertConditions) {
      if (!condition.enabled) continue;

      // Check cooldown period
      if (condition.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - condition.lastTriggered.getTime();
        const cooldownMs = condition.cooldownMinutes * 60 * 1000;
        if (timeSinceLastTrigger < cooldownMs) continue;
      }

      const value = this.getMetricValue(condition.metric, systemMetrics, applicationMetrics);
      const isTriggered = this.evaluateCondition(value, condition.operator, condition.threshold);

      if (isTriggered) {
        condition.lastTriggered = now;

        const alert = {
          id: condition.id,
          name: condition.name,
          description: condition.description,
          severity: condition.severity,
          metric: condition.metric,
          value,
          threshold: condition.threshold,
          timestamp: now
        };

        logger.warn(`Alert triggered: ${condition.name}`, 'system', alert);
        this.emit('alert-triggered', alert);

        // TODO: Send alert notifications (email, Slack, etc.)
      }
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(path: string, systemMetrics: SystemMetrics, applicationMetrics: ApplicationMetrics): number {
    const parts = path.split('.');
    let obj: any = parts[0] === 'system' ? systemMetrics : applicationMetrics;

    for (let i = 1; i < parts.length; i++) {
      obj = obj?.[parts[i]];
    }

    return typeof obj === 'number' ? obj : 0;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Clean up old metrics data
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;

    this.systemMetricsHistory = this.systemMetricsHistory.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );

    this.applicationMetricsHistory = this.applicationMetricsHistory.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get current system metrics
   */
  public getCurrentSystemMetrics(): SystemMetrics | null {
    return this.systemMetricsHistory[this.systemMetricsHistory.length - 1] || null;
  }

  /**
   * Get current application metrics
   */
  public getCurrentApplicationMetrics(): ApplicationMetrics | null {
    return this.applicationMetricsHistory[this.applicationMetricsHistory.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(hours: number = 1): {
    system: SystemMetrics[];
    application: ApplicationMetrics[];
  } {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return {
      system: this.systemMetricsHistory.filter(m => m.timestamp.getTime() > cutoffTime),
      application: this.applicationMetricsHistory.filter(m => m.timestamp.getTime() > cutoffTime)
    };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): AlertCondition[] {
    const now = new Date();
    const recentWindow = 60 * 60 * 1000; // 1 hour

    return this.alertConditions.filter(condition =>
      condition.lastTriggered &&
      (now.getTime() - condition.lastTriggered.getTime()) < recentWindow
    );
  }

  /**
   * Update alert condition
   */
  public updateAlertCondition(conditionId: string, updates: Partial<AlertCondition>): void {
    const condition = this.alertConditions.find(c => c.id === conditionId);
    if (condition) {
      Object.assign(condition, updates);
      logger.info('Alert condition updated', 'system', { conditionId, updates });
    }
  }

  /**
   * Stop metrics collection
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();










































