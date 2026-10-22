import { Request, Response } from 'express';
import { sendSuccess } from '../utils';

export const getHealth = (_req: Request, res: Response) => {
  const healthData = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'bvc-portfolio-backend',
  };

  return sendSuccess(res, healthData, 'Servicio activo y funcionando');
};
