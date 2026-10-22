import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolio.controller';

const router = Router();

router.post('/transactions', PortfolioController.createTransaction);
router.get('/transactions', PortfolioController.listTransactions);
router.post('/custody', PortfolioController.setCustody);
router.get('/summary', PortfolioController.getSummary);

export default router;
