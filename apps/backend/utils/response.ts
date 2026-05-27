import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/index.js';

/**
 * Standard success response
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  } as ApiResponse<T>);
};

/**
 * Standard error response
 */
export const errorResponse = (
  res: Response,
  message: string = 'Error',
  statusCode: number = 500,
  errors: any = null
): Response => {
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 */
export const paginatedResponse = <T>(
  res: Response,
  data: T,
  page: number,
  limit: number,
  total: number,
  message: string = 'Success',
  meta?: Record<string, any>
): Response => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString()),
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    ...(meta ? { meta } : {}),
  } as PaginatedResponse<T>);
};
