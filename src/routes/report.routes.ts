import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();

router.get('/portfolio/excel', ReportController.downloadExcel);
router.get('/portfolio/pdf', ReportController.downloadPdf);

export default router;
