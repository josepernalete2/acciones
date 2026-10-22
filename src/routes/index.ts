import { Router } from 'express';
import healthRoutes from './health.routes';
import exchangeRateRoutes from './exchangeRate.routes';
import bvcRoutes from './bvc.routes';
import portfolioRoutes from './portfolio.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/rates', exchangeRateRoutes);
router.use('/bvc', bvcRoutes);
router.use('/portfolio', portfolioRoutes);

export default router;
