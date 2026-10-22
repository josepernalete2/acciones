import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';

const router = Router();

router.post('/expenses', ExpenseController.create);
router.get('/expenses', ExpenseController.list);
router.get('/expenses/summary', ExpenseController.summary);
router.delete('/expenses/:id', ExpenseController.delete);

export default router;
