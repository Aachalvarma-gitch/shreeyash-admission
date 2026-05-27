import { logger } from '../services/logger.service.js';
import { performanceUtils } from '../middlewares/performanceMonitor.js';

export interface ExternalCallOptions {
  service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  correlationId?: string;
  userId?: string;
  timeout?: number;
  retryAttempts?: number;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  sensitiveHeaders?: string[];
}

export interface ExternalCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  statusCode?: number;
  responseTime: number;
  retryCount: number;
  correlationId?: string;
}

/**
 * Wrapper for external API calls with comprehensive logging
 */
export async function logExternalCall<T = any>(
  options: ExternalCallOptions,
  callFn: () => Promise<T>
): Promise<ExternalCallResult<T>> {
  const {
    service,
    endpoint,
    method,
    correlationId,
    userId,
    timeout = 30000,
    retryAttempts = 0,
    logRequestBody = false,
    logResponseBody = false,
    sensitiveHeaders = ['authorization', 'x-api-key', 'x-auth-token']
  } = options;

  let retryCount = 0;
  const startTime = Date.now();
  let lastError: Error | null = null;

  // Sanitize headers for logging
  const safeHeaders = sanitizeHeaders(options.headers || {}, sensitiveHeaders);

  // Log external call start
  logger.logExternalCall(service, endpoint, method, 0, undefined, undefined, {
    correlationId,
    userId,
    headers: safeHeaders,
    timeout,
    retryAttempts
  });

  while (retryCount <= retryAttempts) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const result = await Promise.race([
        callFn(),
        timeoutPromise
      ]);

      const responseTime = Date.now() - startTime;

      // Log successful external call
      logger.logExternalCall(service, endpoint, method, responseTime, 200, undefined, {
        correlationId,
        userId,
        retryCount,
        success: true,
        responseTime,
        result: logResponseBody ? result : undefined
      });

      return {
        success: true,
        data: result,
        responseTime,
        retryCount,
        correlationId
      };

    } catch (error) {
      lastError = error as Error;
      retryCount++;

      const responseTime = Date.now() - startTime;
      const statusCode = (error as any).statusCode || (error as any).status || 500;

      // Log failed attempt
      logger.logExternalCall(service, endpoint, method, responseTime, statusCode, error as Error, {
        correlationId,
        userId,
        retryCount,
        attempt: retryCount,
        totalAttempts: retryAttempts + 1,
        willRetry: retryCount <= retryAttempts
      });

      // Don't retry on client errors (4xx) or if this was the last attempt
      if (statusCode >= 400 && statusCode < 500 || retryCount > retryAttempts) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (retryCount <= retryAttempts) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  const totalResponseTime = Date.now() - startTime;

  logger.logExternalCall(service, endpoint, method, totalResponseTime, 500, lastError!, {
    correlationId,
    userId,
    retryCount: retryCount - 1,
    totalAttempts: retryAttempts + 1,
    finalFailure: true
  });

  return {
    success: false,
    error: lastError!,
    responseTime: totalResponseTime,
    retryCount: retryCount - 1,
    correlationId
  };
}

/**
 * HTTP client wrapper with logging
 */
export class ExternalApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private correlationId?: string;
  private userId?: string;

  constructor(options: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    correlationId?: string;
    userId?: string;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = options.headers || {};
    this.timeout = options.timeout || 30000;
    this.correlationId = options.correlationId;
    this.userId = options.userId;
  }

  /**
   * Set correlation ID for all subsequent requests
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Set user ID for all subsequent requests
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options: Partial<ExternalCallOptions> = {}): Promise<ExternalCallResult<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T = any>(endpoint: string, data?: any, options: Partial<ExternalCallOptions> = {}): Promise<ExternalCallResult<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options: Partial<ExternalCallOptions> = {}): Promise<ExternalCallResult<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, options: Partial<ExternalCallOptions> = {}): Promise<ExternalCallResult<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options: Partial<ExternalCallOptions> = {}): Promise<ExternalCallResult<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * Generic request method
   */
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    options: Partial<ExternalCallOptions> = {}
  ): Promise<ExternalCallResult<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    // Extract service name from URL
    const service = extractServiceName(url);

    const callOptions: ExternalCallOptions = {
      service,
      endpoint: url,
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      correlationId: this.correlationId,
      userId: this.userId,
      timeout: this.timeout,
      ...options
    };

    return logExternalCall(callOptions, async () => {
      // Here you would make the actual HTTP request
      // For now, we'll throw an error since we don't have the actual HTTP client
      throw new Error('HTTP client not implemented - use with actual fetch/axios');
    });
  }
}

/**
 * Extract service name from URL
 */
function extractServiceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Extract service name from common patterns
    if (hostname.includes('cloudinary')) return 'cloudinary';
    if (hostname.includes('email') || hostname.includes('sendgrid') || hostname.includes('mailgun')) return 'email';
    if (hostname.includes('ocr') || hostname.includes('tesseract')) return 'ocr';
    if (hostname.includes('api')) return hostname.split('.')[0];

    return hostname;
  } catch {
    return 'external-api';
  }
}

/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(headers: Record<string, string>, sensitiveHeaders: string[]): Record<string, string> {
  const sanitized = { ...headers };

  sensitiveHeaders.forEach(header => {
    if (sanitized[header.toLowerCase()]) {
      sanitized[header.toLowerCase()] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Circuit breaker for external calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 60000 // 1 minute
  ) { }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened after ${this.failures} failures`, 'external');
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

/**
 * Rate limiter for external calls
 */
export class ExternalCallRateLimiter {
  private calls: number[] = [];
  private windowMs: number;
  private maxCalls: number;

  constructor(windowMs: number = 60000, maxCalls: number = 100) {
    this.windowMs = windowMs;
    this.maxCalls = maxCalls;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old calls outside the window
    this.calls = this.calls.filter(call => now - call < this.windowMs);

    if (this.calls.length >= this.maxCalls) {
      const oldestCall = Math.min(...this.calls);
      const waitTime = this.windowMs - (now - oldestCall);

      logger.warn(`Rate limit exceeded, waiting ${waitTime}ms`, 'external');
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.calls.push(now);
  }
}










































