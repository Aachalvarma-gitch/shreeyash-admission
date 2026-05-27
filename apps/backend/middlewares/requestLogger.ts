import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger.service.js';
import { TracedRequest, CorrelationContext } from '../types/correlation.js';

export interface RequestLoggerOptions {
  includeHeaders?: boolean;
  includeBody?: boolean;
  excludePaths?: string[];
  logLevel?: 'debug' | 'info' | 'warn';
  correlationHeader?: string;
}

const defaultOptions: RequestLoggerOptions = {
  includeHeaders: false,
  includeBody: false,
  excludePaths: ['/health', '/favicon.ico'],
  logLevel: 'info' as const,
  correlationHeader: 'x-correlation-id'
};

/**
 * Middleware to inject correlation ID into requests and log request details
 */
export const requestLogger = (options: RequestLoggerOptions = {}) => {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Generate or extract correlation ID
    const correlationId = req.headers[opts.correlationHeader] as string || uuidv4();
    (req as TracedRequest).correlationId = correlationId;

    // Create correlation context
    const correlationContext: CorrelationContext = {
      id: correlationId,
      startTime,
      requestId: uuidv4(),
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent') || '',
      method: req.method,
      url: req.originalUrl || req.url,
      headers: opts.includeHeaders ? sanitizeHeaders(req.headers) : undefined
    };

    (req as TracedRequest).traceContext = correlationContext;

    // Add correlation ID to response headers
    res.setHeader(opts.correlationHeader, correlationId);

    // Log request start
    if (!opts.excludePaths?.includes(req.path)) {
      const logData = {
        correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        ipAddress: correlationContext.ipAddress,
        userAgent: correlationContext.userAgent,
        headers: opts.includeHeaders ? correlationContext.headers : undefined,
        body: opts.includeBody ? sanitizeBody(req.body) : undefined,
        timestamp: new Date().toISOString()
      };

      logger.log(opts.logLevel!, `Request: ${req.method} ${req.originalUrl}`, 'http', logData);
    }

    // Store start time for response logging
    (res as any).startTime = startTime;
    (res as any).correlationId = correlationId;

    next();
  };
};

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  // Check for forwarded headers (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers['x-real-ip'] as string;
  if (realIP) {
    return realIP;
  }

  // Fall back to connection remote address
  return req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any).socket?.remoteAddress ||
    'unknown';
}

/**
 * Sanitize request headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization'
  ];

  const sanitized = { ...headers };

  sensitiveHeaders.forEach(header => {
    if (sanitized[header.toLowerCase()]) {
      sanitized[header.toLowerCase()] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'oldPassword',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'socialSecurityNumber'
  ];

  const sanitized = { ...body };

  // Recursively sanitize nested objects
  function sanitize(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => typeof item === 'object' ? sanitize(item) : item);
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitize(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return obj;
  }

  return sanitize(sanitized);
}

/**
 * Middleware to log response details
 */
export const responseLogger = (options: RequestLoggerOptions = {}) => {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseBody: any;
    let responseSent = false;

    // Capture response body
    const captureResponse = (data: any) => {
      if (!responseSent && opts.includeBody) {
        try {
          if (typeof data === 'string') {
            responseBody = data.length > 1000 ? `${data.substring(0, 1000)}...` : data;
          } else if (typeof data === 'object') {
            responseBody = JSON.stringify(data).length > 1000
              ? `${JSON.stringify(data).substring(0, 1000)}...`
              : data;
          }
        } catch (error) {
          responseBody = '[UNABLE TO CAPTURE]';
        }
      }
    };

    // Override send method
    res.send = function (data: any) {
      captureResponse(data);
      return originalSend.call(this, data);
    };

    // Override json method
    res.json = function (data: any) {
      captureResponse(data);
      return originalJson.call(this, data);
    };

    // Override end method to log response
    res.end = function (chunk?: any, encoding?: any) {
      if (!responseSent) {
        responseSent = true;

        const startTime = (res as any).startTime || Date.now();
        const duration = Date.now() - startTime;
        const correlationId = (req as TracedRequest).correlationId || (res as any).correlationId;

        // Skip logging for excluded paths
        if (!opts.excludePaths?.includes(req.path)) {
          const logData = {
            correlationId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration,
            contentLength: res.get('Content-Length'),
            contentType: res.get('Content-Type'),
            userAgent: req.get('User-Agent'),
            ipAddress: getClientIP(req),
            body: responseBody,
            timestamp: new Date().toISOString()
          };

          // Determine log level based on status code
          let logLevel: 'error' | 'warn' | 'info' = opts.logLevel || 'info';
          if (res.statusCode >= 500) {
            logLevel = 'error';
          } else if (res.statusCode >= 400) {
            logLevel = 'warn';
          }

          logger.log(logLevel, `Response: ${res.statusCode} (${duration}ms)`, 'http', logData);
        }
      }

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};










































