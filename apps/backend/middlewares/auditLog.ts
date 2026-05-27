import { Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog.model.js';
import { AuthRequest } from '../types/index.js';


export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

    const originalJson = res.json.bind(res);


    res.json = function (data: any) {

      if (req.user) {

        AuditLog.create({
          userId: req.user._id,
          action,
          resource,
          resourceId: req.params.id || data.data?._id,
          details: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
            query: req.query,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          userRole: (req.user.role as any)?.name || 'Unknown',
          status: data.success !== false ? 'success' : 'failure',
          errorMessage: data.success === false ? data.message || data.error : undefined,
        }).catch(err => {
          console.error('Audit log error:', err);
        });
      }


      return originalJson(data);
    };

    next();
  };
};


const sanitizeBody = (body: any): any => {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'otp'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

