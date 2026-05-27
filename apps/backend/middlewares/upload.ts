import multer, { FileFilterCallback, MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const UPLOAD_FIELD_NAME = 'file';

// Storage configuration - using memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only JPEG, PNG, and PDF files are allowed. Received: ${file.mimetype}`));
  }
};

// Multer configuration
const multerConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

// Create multer instance
const upload = multer(multerConfig);

// Export configured upload middlewares for different use cases
export const uploadSingle = upload.single(UPLOAD_FIELD_NAME);
export const uploadMultiple = upload.array(UPLOAD_FIELD_NAME, 5); // Max 5 files
export const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
]);

// Export the base upload instance for custom configurations
export { upload, UPLOAD_FIELD_NAME, MAX_FILE_SIZE, ALLOWED_MIMES };

// Wrapper function that handles multer errors properly
export const uploadSingleWithErrorHandling = (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: any) => {
    if (err instanceof MulterError) {
      // Multer-specific errors
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            success: false,
            error: 'Too many files uploaded',
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            success: false,
            error: `Unexpected field name. Use '${UPLOAD_FIELD_NAME}' for file uploads`,
          });
        default:
          return res.status(400).json({
            success: false,
            error: err.message,
          });
      }
    } else if (err) {
      // Other errors (like file filter)
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    // No error, proceed
    next();
  });
};
