 // Performance monitoring types

export interface PerformanceMetrics {
    responseTime: number;
    memoryUsage: MemoryUsage;
    cpuUsage: CpuUsage;
    databaseQueryTime?: number;
    externalApiTime?: number;
    throughput?: number;
    errorRate?: number;
    timestamp: Date;
  }
  
  export interface MemoryUsage {
    rss: number; // Resident Set Size
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers?: number;
  }
  
  export interface CpuUsage {
    user: number;
    system: number;
    percentage?: number;
  }
  
  export interface PerformanceThresholds {
    responseTime: number; // in milliseconds
    memoryUsage: number; // in MB
    cpuUsage: number; // percentage
    errorRate: number; // percentage
  }
  
  export interface SlowQueryInfo {
    query: string;
    executionTime: number;
    collection: string;
    timestamp: Date;
    correlationId?: string;
  }
  
  export interface PerformanceAlert {
    type: 'response_time' | 'memory_usage' | 'cpu_usage' | 'error_rate' | 'slow_query';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
    correlationId?: string;
    timestamp: Date;
  }
  
  export interface PerformanceReport {
    period: {
      start: Date;
      end: Date;
    };
    metrics: {
      averageResponseTime: number;
      maxResponseTime: number;
      minResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalRequests: number;
      errorCount: number;
      errorRate: number;
      memoryPeak: number;
      cpuAverage: number;
    };
    alerts: PerformanceAlert[];
    slowQueries: SlowQueryInfo[];
  }
  
  // Performance monitoring configuration
  export interface PerformanceConfig {
    enabled: boolean;
    thresholds: PerformanceThresholds;
    samplingRate: number; // 0-1, percentage of requests to monitor
    retentionPeriod: number; // in days
    alertEnabled: boolean;
    slowQueryThreshold: number; // in milliseconds
  }
  
  // Health check types
  export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    checks: {
      database: HealthCheckResult;
      memory: HealthCheckResult;
      cpu: HealthCheckResult;
      disk: HealthCheckResult;
      logging: HealthCheckResult;
    };
  }
  
  export interface HealthCheckResult {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    value?: any;
    timestamp: Date;
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  