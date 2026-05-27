import dotenv from 'dotenv';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { logger } from './logger.service.js';
import { logExternalCall } from '../utils/externalCallLogger.js';


dotenv.config();

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Check if credentials are valid (not placeholder values)
const isValidCloudName = cloudName && cloudName !== 'your-cloud-name' && !cloudName.includes('your-');
const isValidApiKey = apiKey && apiKey !== 'your-api-key' && !apiKey.includes('your-');
const isValidApiSecret = apiSecret && apiSecret !== 'your-api-secret' && !apiSecret.includes('your-');

if (isValidCloudName && isValidApiKey && isValidApiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else {
  console.warn('Cloudinary not configured - file uploads will fail. Add valid credentials to .env file.');
}

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
}

/**
 * Upload file to Cloudinary with comprehensive logging
 */
export const uploadToCloudinary = async (
  file: any,
  folder: string = 'newra-grids',
  correlationId?: string,
  userId?: string,
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
): Promise<UploadResult> => {
  const fileSize = file.size || file.buffer?.length || 0;
  const fileName = file.originalname || file.filename || 'unknown';

  logger.logBusinessStep('Cloudinary upload started', {
    correlationId,
    userId,
    fileName,
    fileSize,
    folder
  });

  // Check if Cloudinary is configured with real credentials
  if (!isValidCloudName || !isValidApiKey || !isValidApiSecret) {
    const errorMessage = 'Cloudinary service not configured. Please add valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.';

    logger.error('Cloudinary configuration missing', 'external', {
      correlationId,
      userId,
      fileName,
      fileSize,
      folder,
      cloudName: cloudName ? 'SET' : 'NOT_SET',
      apiKey: apiKey ? 'SET' : 'NOT_SET',
      apiSecret: apiSecret ? 'SET' : 'NOT_SET'
    });

    throw new Error(errorMessage);
  }

  try {
    console.log('[Cloudinary] ===== STARTING UPLOAD =====');
    console.log('[Cloudinary] File:', fileName, '| Size:', fileSize, 'bytes');
    console.log('[Cloudinary] Folder:', folder, '| Resource Type:', resourceType);
    console.log('[Cloudinary] Configured:', isValidCloudName && isValidApiKey && isValidApiSecret ? 'YES' : 'NO - CHECK .env FILE!');
    
    const result = await logExternalCall(
      {
        service: 'cloudinary',
        endpoint: 'upload',
        method: 'POST',
        correlationId,
        userId,
        logRequestBody: false,
        logResponseBody: false
      },
      () => new Promise((resolve, reject) => {
        const uploadOptions = {
          folder,
          resource_type: resourceType,
          type: 'upload',
          access_control: [{ access_type: 'anonymous' }],
        };

        if (file.buffer) {
          // If file has buffer (from multer memory storage)
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve(result);
              }
            }
          );
          const bufferStream = Readable.from(file.buffer);
          bufferStream.pipe(uploadStream);
        } else if (file.path) {
          // If file has path (from multer disk storage)
          cloudinary.uploader.upload(file.path, uploadOptions)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Invalid file format'));
        }
      })
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Upload failed');
    }

    const data = result.data as any; // Cloudinary response
    const uploadResult: UploadResult = {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      resourceType: data.resource_type,
    };

    logger.logBusinessStep('Cloudinary upload completed', {
      correlationId,
      userId,
      fileName,
      fileSize,
      folder,
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      responseTime: result.responseTime
    });

    return uploadResult;
  } catch (error) {
    const errorDetails = error as any;
    logger.error('Cloudinary upload failed', 'external', {
      correlationId,
      userId,
      fileName,
      fileSize,
      folder,
      errorMessage: (error as Error).message,
      errorCode: errorDetails?.error?.code || errorDetails?.code,
      httpCode: errorDetails?.error?.http_code || errorDetails?.http_code,
      cloudinaryError: errorDetails?.error?.message || 'Unknown Cloudinary error'
    }, error as Error);

    throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (files: any[], folder: string = 'newra-grids'): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error('Failed to upload files');
  }
};

/**
 * Delete file from Cloudinary with logging
 */
export const deleteFromCloudinary = async (publicId: string, correlationId?: string, userId?: string): Promise<any> => {
  logger.logBusinessStep('Cloudinary delete started', {
    correlationId,
    userId,
    publicId
  });

  try {
    const result = await logExternalCall(
      {
        service: 'cloudinary',
        endpoint: 'destroy',
        method: 'POST',
        correlationId,
        userId,
        logRequestBody: false,
        logResponseBody: false
      },
      () => cloudinary.uploader.destroy(publicId)
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Delete failed');
    }

    logger.logBusinessStep('Cloudinary delete completed', {
      correlationId,
      userId,
      publicId,
      result: result.data,
      responseTime: result.responseTime
    });

    return result.data;
  } catch (error) {
    logger.error('Cloudinary delete failed', 'external', {
      correlationId,
      userId,
      publicId,
      error: (error as Error).message
    }, error as Error);

    throw new Error('Failed to delete file');
  }
};

/**
 * Delete multiple files from Cloudinary
 */
export const deleteMultipleFromCloudinary = async (publicIds: string[]): Promise<any[]> => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFromCloudinary(publicId));
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    throw new Error('Failed to delete files');
  }
};

/**
 * Get optimized image URL
 */
export const getOptimizedImageUrl = (publicId: string, options: any = {}): string => {
  const {
    width = 800,
    height = 600,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
  });
};

/**
 * Transform image for OCR preprocessing with logging
 */
export const transformImageForOCR = async (publicId: string, correlationId?: string, userId?: string): Promise<string> => {
  logger.logBusinessStep('Cloudinary OCR transformation started', {
    correlationId,
    userId,
    publicId
  });

  try {
    const result = await logExternalCall(
      {
        service: 'cloudinary',
        endpoint: 'explicit',
        method: 'POST',
        correlationId,
        userId,
        logRequestBody: false,
        logResponseBody: false
      },
      () => cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        eager: [
          {
            width: 2000,
            quality: 'auto:best',
            effect: 'sharpen:100',
            flags: 'progressive',
          },
        ],
      })
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Transformation failed');
    }

    const transformedUrl = result.data.eager?.[0]?.secure_url || result.data.secure_url;

    logger.logBusinessStep('Cloudinary OCR transformation completed', {
      correlationId,
      userId,
      publicId,
      transformedUrl,
      responseTime: result.responseTime
    });

    return transformedUrl;
  } catch (error) {
    logger.error('Cloudinary OCR transformation failed', 'external', {
      correlationId,
      userId,
      publicId,
      error: (error as Error).message
    }, error as Error);

    throw new Error('Failed to transform image');
  }
};

export default cloudinary;
