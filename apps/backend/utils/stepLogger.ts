import { logger } from '../services/logger.service.js';

export interface StepLoggerOptions {
  operationName: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

export interface StepData {
  step: string;
  duration?: number;
  data?: any;
  timestamp?: Date;
}

export class StepLogger {
  private operationName: string;
  private correlationId?: string;
  private userId?: string;
  private sessionId?: string;
  private startTime: Date;
  private steps: StepData[] = [];
  private completed = false;
  private failed = false;

  constructor(operationName: string, correlationId?: string, userId?: string, sessionId?: string) {
    this.operationName = operationName;
    this.correlationId = correlationId;
    this.userId = userId;
    this.sessionId = sessionId;
    this.startTime = new Date();

    // Log operation start
    logger.logBusinessStep(`${operationName}-started`, {
      correlationId,
      userId,
      sessionId,
      timestamp: this.startTime
    }, {
      correlationId,
      userId,
      sessionId
    });
  }

  /**
   * Log a step in the operation
   */
  step(stepName: string, data?: any): void {
    if (this.completed || this.failed) {
      return; // Don't log steps after completion/failure
    }

    const step: StepData = {
      step: stepName,
      timestamp: new Date(),
      data
    };

    // Calculate duration from start if this is not the first step
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1];
      step.duration = step.timestamp.getTime() - lastStep.timestamp!.getTime();
    } else {
      step.duration = step.timestamp.getTime() - this.startTime.getTime();
    }

    this.steps.push(step);

    // Log the step
    logger.logBusinessStep(`${this.operationName}:${stepName}`, {
      operationName: this.operationName,
      stepName,
      duration: step.duration,
      stepCount: this.steps.length,
      ...data
    }, {
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Mark the operation as successfully completed
   */
  complete(result?: any): void {
    if (this.completed || this.failed) {
      return; // Already finalized
    }

    this.completed = true;
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // Log completion
    logger.logBusinessStep(`${this.operationName}-completed`, {
      operationName: this.operationName,
      totalDuration,
      stepCount: this.steps.length,
      success: true,
      result: this.sanitizeResult(result)
    }, {
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Mark the operation as failed
   */
  fail(error: Error, context?: any): void {
    if (this.completed || this.failed) {
      return; // Already finalized
    }

    this.failed = true;
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // Log failure
    logger.error(`${this.operationName} failed`, 'business', {
      operationName: this.operationName,
      totalDuration,
      stepCount: this.steps.length,
      success: false,
      errorType: error.name,
      errorMessage: error.message,
      ...context
    }, error);

    // Also log as business step for consistency
    logger.logBusinessStep(`${this.operationName}-failed`, {
      operationName: this.operationName,
      totalDuration,
      stepCount: this.steps.length,
      success: false,
      errorType: error.name,
      errorMessage: error.message,
      ...context
    }, {
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Get operation summary for debugging
   */
  getSummary(): {
    operationName: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    startTime: Date;
    completed: boolean;
    failed: boolean;
    stepCount: number;
    totalDuration?: number;
    steps: StepData[];
  } {
    const totalDuration = this.completed || this.failed
      ? new Date().getTime() - this.startTime.getTime()
      : undefined;

    return {
      operationName: this.operationName,
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
      startTime: this.startTime,
      completed: this.completed,
      failed: this.failed,
      stepCount: this.steps.length,
      totalDuration,
      steps: [...this.steps]
    };
  }

  /**
   * Sanitize result data to avoid logging sensitive information
   */
  private sanitizeResult(result: any): any {
    if (!result) return result;

    // Create a copy to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(result));

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'otp', 'otpExpire', 'passwordResetToken'];

    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveFields.includes(key)) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}

// Export a factory function for convenience
export function createStepLogger(operationName: string, correlationId?: string, userId?: string, sessionId?: string): StepLogger {
  return new StepLogger(operationName, correlationId, userId, sessionId);
}