import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to validate request using express-validator
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: 'path' in err ? err.path : ('param' in err ? err.param : 'unknown'),
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

