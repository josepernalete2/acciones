import { Router } from 'express';
import { DividendController } from '../controllers/dividend.controller';

const router = Router();

router.post('/', DividendController.registerDividend);
router.get('/', DividendController.listDividends);

export default router;
