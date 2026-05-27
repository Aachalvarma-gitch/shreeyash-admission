import { Request, Response, NextFunction } from 'express';
import * as os from 'os';
import { logger } from '../services/logger.service.js';
import { PerformanceLog } from '../models/PerformancelLog.model.js';
import { PerformanceMetrics, PerformanceThresholds } from '../types/perfrormance.js';
import { TracedRequest } from '../types/correlation.js';

export interface PerformanceMonitorOptions {
  enabled: boolean;
  samplingRate: number;
  thresholds: PerformanceThresholds;
  enableDatabaseLogging: boolean;
  slowQueryThreshold: number;
}

const defaultOptions: PerformanceMonitorOptions = {
  enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
  samplingRate: parseFloat(process.env.PERFORMANCE_SAMPLING_RATE || '0.1'), // 10% sampling
  thresholds: {
    responseTime: parseInt(process.env.PERFORMANCE_RESPONSE_TIME_THRESHOLD || '5000'), // 5 seconds
    memoryUsage: parseInt(process.env.PERFORMANCE_MEMORY_THRESHOLD || '512'), // 512MB
    cpuUsage: parseInt(process.env.PERFORMANCE_CPU_THRESHOLD || '80'), // 80%
    errorRate: parseInt(process.env.PERFORMANCE_ERROR_RATE_THRESHOLD || '5') // 5%
  },
  enableDatabaseLogging: process.env.PERFORMANCE_DB_LOGGING === 'true',
  slowQueryThreshold: parseInt(process.env.PERFORMANCE_SLOW_QUERY_THRESHOLD || '1000') // 1 second
};


export const performanceMonitor = (options: Partial<PerformanceMonitorOptions> = {}) => {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!opts.enabled) {
      return next();
    }

    // Sampling: only monitor a percentage of requests
    if (Math.random() > opts.samplingRate) {
      return next();
    }

    const startTime = process.hrtime.bigint();
    const startMemoryUsage = process.memoryUsage();
    const startCpuUsage = process.cpuUsage();

    // Store performance monitoring data
    (req as any)._performanceStart = {
      time: startTime,
      memory: startMemoryUsage,
      cpu: startCpuUsage,
      timestamp: Date.now()
    };

    // Override response end to capture metrics
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const endTime = process.hrtime.bigint();
      const endMemoryUsage = process.memoryUsage();
      const endCpuUsage = process.cpuUsage();

      // Calculate metrics
      const responseTimeNs = Number(endTime - startTime);
      const responseTimeMs = responseTimeNs / 1_000_000; // Convert to milliseconds

      const memoryUsage = {
        rss: Number(endMemoryUsage.rss),
        heapTotal: Number(endMemoryUsage.heapTotal),
        heapUsed: Number(endMemoryUsage.heapUsed),
        external: Number(endMemoryUsage.external),
        arrayBuffers: endMemoryUsage.arrayBuffers ? Number(endMemoryUsage.arrayBuffers) : undefined
      };

      const cpuUsage = {
        user: endCpuUsage.user - startCpuUsage.user,
        system: endCpuUsage.system - startCpuUsage.system,
        percentage: calculateCpuPercentage(endCpuUsage, startCpuUsage)
      };

      const tracedReq = req as TracedRequest;
      const correlationId = tracedReq.correlationId;
      const userId = (req as any).user?.id || (req as any).user?._id?.toString();

      const metrics: PerformanceMetrics = {
        responseTime: responseTimeMs,
        memoryUsage,
        cpuUsage,
        timestamp: new Date()
      };


      const issues = checkPerformanceThresholds(metrics, opts.thresholds);


      const logData = {
        correlationId,
        userId,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        statusCode: res.statusCode,
        ...metrics,
        issues
      };

      if (issues.length > 0) {
        logger.warn(`Performance issue detected: ${issues.join(', ')}`, 'performance', logData);
      } else {
        logger.debug('Performance metrics collected', 'performance', logData);
      }


      if (opts.enableDatabaseLogging) {
        storePerformanceMetrics(logData).catch(error => {
          logger.error('Failed to store performance metrics', 'performance', {
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }


      checkPerformanceAlerts(metrics, opts.thresholds, correlationId);


      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};


function calculateCpuPercentage(endCpu: NodeJS.CpuUsage, startCpu: NodeJS.CpuUsage): number {
  const totalEnd = endCpu.user + endCpu.system;
  const totalStart = startCpu.user + startCpu.system;
  const diff = totalEnd - totalStart;

  if (diff === 0) return 0;


  const elapsedUs = process.hrtime.bigint() - (process as any)._performanceStart?.time || BigInt(1);
  const elapsedMs = Number(elapsedUs) / 1_000_000;


  const cpuCount = os.cpus().length;
  const percentage = (diff / 1000 / elapsedMs) * 100 * cpuCount;

  return Math.min(percentage, 100);
}


function checkPerformanceThresholds(metrics: PerformanceMetrics, thresholds: PerformanceThresholds): string[] {
  const issues: string[] = [];

  if (metrics.responseTime > thresholds.responseTime) {
    issues.push(`slow response (${metrics.responseTime.toFixed(2)}ms > ${thresholds.responseTime}ms)`);
  }

  const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
  if (memoryMB > thresholds.memoryUsage) {
    issues.push(`high memory usage (${memoryMB.toFixed(2)}MB > ${thresholds.memoryUsage}MB)`);
  }

  if (metrics.cpuUsage.percentage && metrics.cpuUsage.percentage > thresholds.cpuUsage) {
    issues.push(`high CPU usage (${metrics.cpuUsage.percentage.toFixed(2)}% > ${thresholds.cpuUsage}%)`);
  }

  return issues;
}


async function storePerformanceMetrics(data: any): Promise<void> {
  try {
    const performanceLog = new PerformanceLog({
      correlationId: data.correlationId,
      userId: data.userId,
      endpoint: data.endpoint,
      method: data.method,
      responseTime: data.responseTime,
      statusCode: data.statusCode,
      memoryUsage: data.memoryUsage,
      cpuUsage: data.cpuUsage,
      throughput: data.throughput,
      errorRate: data.errorRate
    });

    await performanceLog.save();
  } catch (error) {
    logger.error('Failed to save performance log to database', 'database', {
      error: error instanceof Error ? error.message : String(error),
      data
    });
  }
}


function checkPerformanceAlerts(metrics: PerformanceMetrics, thresholds: PerformanceThresholds, correlationId?: string): void {
  const alerts: string[] = [];

  if (metrics.responseTime > thresholds.responseTime * 2) {
    alerts.push('CRITICAL_RESPONSE_TIME');
  } else if (metrics.responseTime > thresholds.responseTime) {
    alerts.push('HIGH_RESPONSE_TIME');
  }

  const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
  if (memoryMB > thresholds.memoryUsage * 1.5) {
    alerts.push('CRITICAL_MEMORY_USAGE');
  } else if (memoryMB > thresholds.memoryUsage) {
    alerts.push('HIGH_MEMORY_USAGE');
  }

  if (metrics.cpuUsage.percentage && metrics.cpuUsage.percentage > thresholds.cpuUsage * 1.2) {
    alerts.push('CRITICAL_CPU_USAGE');
  } else if (metrics.cpuUsage.percentage && metrics.cpuUsage.percentage > thresholds.cpuUsage) {
    alerts.push('HIGH_CPU_USAGE');
  }

  if (alerts.length > 0) {
    logger.warn(`Performance alerts triggered: ${alerts.join(', ')}`, 'performance', {
      correlationId,
      alerts,
      metrics,
      thresholds
    });

  }
}


export function getSystemHealthMetrics(): {
  memory: { used: number; total: number; percentage: number };
  cpu: { usage: number; loadAverage: number[] };
  uptime: number;
} {
  const memUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  return {
    memory: {
      used: Number(memUsage.heapUsed),
      total: Number(totalMemory),
      percentage: ((totalMemory - freeMemory) / totalMemory) * 100
    },
    cpu: {
      usage: calculateCpuPercentage(process.cpuUsage(), { user: 0, system: 0 }),
      loadAverage: os.loadavg()
    },
    uptime: process.uptime()
  };
}


export const performanceUtils = {

  measureExecutionTime: async <T>(
    fn: () => Promise<T>,
    label: string,
    correlationId?: string
  ): Promise<{ result: T; executionTime: number }> => {
    const startTime = process.hrtime.bigint();

    try {
      const result = await fn();
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000;

      logger.debug(`Execution time for ${label}: ${executionTime.toFixed(2)}ms`, 'performance', {
        correlationId,
        label,
        executionTime
      });

      return { result, executionTime };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000;

      logger.error(`Execution failed for ${label} after ${executionTime.toFixed(2)}ms`, 'performance', {
        correlationId,
        label,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  },


  monitorMemoryUsage: (label: string, correlationId?: string): (() => void) => {
    const startMemory = process.memoryUsage();

    return () => {
      const endMemory = process.memoryUsage();
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      };

      logger.debug(`Memory usage change for ${label}`, 'performance', {
        correlationId,
        label,
        startMemory,
        endMemory,
        delta: memoryDelta
      });
    };
  }
};










































