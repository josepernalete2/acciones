import { Router } from 'express';
import { BvcController } from '../controllers/bvc.controller';

const router = Router();

router.get('/assets', BvcController.getAssets);
router.get('/assets/:ticker/history', BvcController.getAssetHistory);
router.post('/quotes/sync', BvcController.triggerSyncQuotes);

export default router;
