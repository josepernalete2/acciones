import { Router } from 'express';
import { ExchangeRateController } from '../controllers/exchangeRate.controller';

const router = Router();

router.get('/latest', ExchangeRateController.getLatest);
router.get('/history', ExchangeRateController.getHistory);
router.post('/sync', ExchangeRateController.triggerSync);

export default router;
