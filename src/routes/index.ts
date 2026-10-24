import { Router } from 'express';
import healthRoutes from './health.routes';
import exchangeRateRoutes from './exchangeRate.routes';
import bvcRoutes from './bvc.routes';
import portfolioRoutes from './portfolio.routes';
import expenseRoutes from './expense.routes';
import dividendRoutes from './dividend.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/rates', exchangeRateRoutes);
router.use('/bvc', bvcRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/cashflow', expenseRoutes);
router.use('/dividends', dividendRoutes);
router.use('/reports', reportRoutes);

export default router;
