import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import prisma from './config/prisma';
import apiRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck directo
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'bvc-portfolio-backend',
  });
});

// Rutas agrupadas de la API
app.use('/api', apiRoutes);

// Manejador para rutas no encontradas (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    timestamp: new Date().toISOString(),
  });
});

// Middleware global de manejo de errores
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Inicio del servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck disponible en http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});

// Cierre controlado (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
  console.log(`\nSeñal ${signal} recibida. Cerrando servidor y conexiones...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Conexión con Prisma/PostgreSQL cerrada.');
      process.exit(0);
    } catch (error) {
      console.error('Error al desconectar Prisma:', error);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
