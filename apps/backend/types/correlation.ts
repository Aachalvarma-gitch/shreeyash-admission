// Correlation ID and request tracing types

import { Request } from 'express';

export interface CorrelationContext {
  id: string;
  startTime: number;
  requestId?: string;
  parentId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}

export interface TracedRequest extends Request {
  correlationId: string;
  startTime: number;
  traceContext?: CorrelationContext;
}

export interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  parentId?: string;
  tags?: Record<string, any>;
  logs?: LogEntry[];
}

export interface Trace {
  id: string;
  correlationId: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  spans: TraceSpan[];
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  fields?: Record<string, any>;
}

// Correlation ID generator interface
export interface CorrelationIdGenerator {
  generate(): string;
  validate(id: string): boolean;
}

// Distributed tracing interface
export interface Tracer {
  startTrace(name: string, correlationId: string): Trace;
  startSpan(name: string, parentSpanId?: string): TraceSpan;
  endSpan(spanId: string): void;
  addTags(spanId: string, tags: Record<string, any>): void;
  log(spanId: string, level: string, message: string, fields?: Record<string, any>): void;
  getCurrentTrace(): Trace | null;
  getSpan(spanId: string): TraceSpan | null;
}

// Request context interface
export interface RequestContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
  method: string;
  url: string;
  ipAddress: string;
  userAgent: string;
  headers: Record<string, string>;
}










































