import { Response } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { AuthRequest } from '../types/index.js';

/**
 * Common validation rules
 */

export const emailValidation = (): ValidationChain =>
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail();

export const mobileValidation = (): ValidationChain =>
  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit mobile number');

export const passwordValidation = (): ValidationChain =>
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

export const nameValidation = (field: string = 'name'): ValidationChain =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} must be between 2 and 50 characters`);

export const idValidation = (field: string = 'id'): ValidationChain =>
  param(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isMongoId()
    .withMessage('Invalid ID format');

export const paginationValidation = (): ValidationChain[] => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Sanitize object to remove undefined and null values
 */
export const sanitizeObject = (obj: any): any => {
  return Object.entries(obj).reduce((acc: any, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file: any, allowedTypes: string[], maxSize: number = 10485760): boolean => {
  if (!file) {
    throw new Error('No file uploaded');
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1048576}MB`);
  }

  return true;
};

/**
 * Validate request and return errors if any
 */
export const validateRequest = (req: AuthRequest, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: 'path' in err ? err.path : ('param' in err ? err.param : 'unknown'),
        message: err.msg,
      })),
    });
    return false;
  }
  return true;
};

