import { Router } from 'express';
import healthRoutes from './health.routes';
import exchangeRateRoutes from './exchangeRate.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/rates', exchangeRateRoutes);

export default router;
