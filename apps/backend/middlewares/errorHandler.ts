import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service.js';
import { TracedRequest } from '../types/correlation.js';
import { AuthRequest } from '../types/index.js';

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: any;
  errors?: any;
  isOperational?: boolean;
  correlationId?: string;
}

interface ErrorContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  headers?: Record<string, any>;
  body?: any;
  query?: any;
  params?: any;
  timestamp: string;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  let error = { ...err };
  error.message = err.message;
  error.isOperational = err.isOperational || false;


  const tracedReq = req as TracedRequest & AuthRequest;
  const correlationId = tracedReq.correlationId || error.correlationId || 'unknown';

  const errorContext: ErrorContext = {
    correlationId,
    userId: tracedReq.user?._id?.toString() || tracedReq.user?.id,
    sessionId: tracedReq.session?._id?.toString(),
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl || req.url,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  };


  const errorInfo = categorizeError(error);


  const logLevel = determineLogLevel(errorInfo);


  logger.log(logLevel, `Error ${errorInfo.statusCode}: ${error.message}`, 'error', {
    ...errorContext,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: errorInfo.statusCode,
      category: errorInfo.category,
      isOperational: error.isOperational
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: errorContext.headers,
      body: errorContext.body,
      query: req.query,
      params: req.params
    },
    user: tracedReq.user ? {
      id: tracedReq.user._id,
      email: tracedReq.user.email,
      role: tracedReq.user.role
    } : undefined,
    session: tracedReq.session ? {
      id: tracedReq.session._id,
      deviceInfo: tracedReq.session.deviceInfo
    } : undefined
  }, error);


  if (errorInfo.category === 'security' || errorInfo.category === 'authentication') {
    logger.logSecurityEvent(errorInfo.eventType || 'unauthorized_access', 'medium', {
      correlationId,
      userId: errorContext.userId,
      ipAddress: errorContext.ipAddress,
      error: error.message,
      userAgent: errorContext.userAgent
    });
  }


  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(errorInfo.statusCode).json({
    success: false,
    error: errorInfo.message,
    correlationId,
    ...(isDevelopment && {
      stack: error.stack,
      details: {
        name: error.name,
        code: error.code,
        keyValue: error.keyValue,
        errors: error.errors
      }
    })
  });
};


function categorizeError(error: CustomError): {
  statusCode: number;
  message: string;
  category: string;
  eventType?: string;
} {

  if (error.name === 'CastError') {
    return {
      statusCode: 404,
      message: 'Resource not found',
      category: 'validation'
    };
  }


  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    return {
      statusCode: 409,
      message: `${field} already exists`,
      category: 'validation'
    };
  }


  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors || {}).map((val: any) => val.message).join(', ');
    return {
      statusCode: 400,
      message: `Validation Error: ${message}`,
      category: 'validation'
    };
  }


  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid authentication token',
      category: 'authentication',
      eventType: 'login_failure'
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Authentication token has expired',
      category: 'authentication',
      eventType: 'login_failure'
    };
  }

  // Custom application errors with status codes
  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      category: categorizeByStatusCode(error.statusCode)
    };
  }


  return {
    statusCode: 500,
    message: 'Internal Server Error',
    category: 'system'
  };
}


function determineLogLevel(errorInfo: { statusCode: number; category: string }): 'error' | 'warn' | 'info' {
  if (errorInfo.statusCode >= 500) return 'error';
  if (errorInfo.statusCode >= 400) return 'warn';
  if (errorInfo.category === 'security' || errorInfo.category === 'authentication') return 'warn';
  return 'info';
}


function categorizeByStatusCode(statusCode: number): string {
  if (statusCode >= 500) return 'system';
  if (statusCode >= 400) return 'client';
  if (statusCode >= 300) return 'redirection';
  return 'system';
}


function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
    'x-csrf-token'
  ];

  const sanitized = { ...headers };

  sensitiveHeaders.forEach(header => {
    const lowerHeader = header.toLowerCase();
    if (sanitized[lowerHeader]) {
      sanitized[lowerHeader] = '[REDACTED]';
    }
  });

  return sanitized;
}


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
    'socialSecurityNumber',
    'pin',
    'otp'
  ];

  const sanitized = { ...body };

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


export class OperationalError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'OperationalError';

    Error.captureStackTrace(this, this.constructor);
  }
}


export class ValidationError extends OperationalError {
  constructor(message: string, details?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    if (details) {
      (this as any).details = details;
    }
  }
}


export class AuthenticationError extends OperationalError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}


export class AuthorizationError extends OperationalError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}


export class NotFoundError extends OperationalError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

