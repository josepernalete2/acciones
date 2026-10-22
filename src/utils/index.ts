import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operación exitosa',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  } as ApiResponse<T>);
};

export const sendError = (
  res: Response,
  error = 'Ocurrió un error interno en el servidor',
  statusCode = 500
): Response => {
  return res.status(statusCode).json({
    success: false,
    error,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
};
