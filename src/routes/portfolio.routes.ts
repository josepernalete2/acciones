import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolio.controller';
import { ImporterController, uploadExcel } from '../controllers/importer.controller';

const router = Router();

router.post('/transactions', PortfolioController.createTransaction);
router.get('/transactions', PortfolioController.listTransactions);
router.post('/custody', PortfolioController.setCustody);
router.get('/summary', PortfolioController.getSummary);
router.post('/import-excel', uploadExcel.single('file'), ImporterController.importExcel);

export default router;
