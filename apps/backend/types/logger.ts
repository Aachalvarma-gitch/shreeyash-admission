// Logging types and interfaces

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogCategory = 'http' | 'database' | 'business' | 'security' | 'performance' | 'external' | 'system' | 'error';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  duration?: number;
  statusCode?: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  timestamp?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  category: LogCategory;
  context?: LogContext;
  timestamp?: Date;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
}

export interface LoggerTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
}

export interface FileTransportConfig extends LoggerTransport {
  filename: string;
  maxsize: string;
  maxFiles: number;
  format: 'json' | 'simple';
}

export interface DatabaseTransportConfig extends LoggerTransport {
  collection: string;
  bufferSize: number;
  flushInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ExternalTransportConfig extends LoggerTransport {
  endpoint: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableExternal: boolean;
  fileConfig?: FileTransportConfig;
  databaseConfig?: DatabaseTransportConfig;
  externalConfig?: ExternalTransportConfig;
  silent: boolean;
}

export interface SanitizedLogEntry {
  level: LogLevel;
  message: string;
  category: LogCategory;
  context: LogContext;
  timestamp: Date;
  error?: {
    name: string;
    message: string;
    code?: string | number;
  };
}

// Log analysis types
export interface LogQuery {
  level?: LogLevel;
  category?: LogCategory;
  correlationId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  averageResponseTime?: number;
  errorRate?: number;
}










































