import { Request, Response } from 'express';
import { ExpenseService } from '../services/expense.service';
import { sendSuccess, sendError } from '../utils';

export class ExpenseController {
  /**
   * POST /api/cashflow/expenses
   * Registra un nuevo gasto multimoneda
   */
  static async create(req: Request, res: Response) {
    try {
      const {
        userId,
        expenseDate,
        description,
        category,
        originalCurrency,
        originalAmount,
        notes,
      } = req.body;

      if (!userId || !expenseDate || !description || !category || !originalCurrency || originalAmount === undefined) {
        return sendError(
          res,
          'Faltan campos obligatorios: userId, expenseDate, description, category, originalCurrency, originalAmount',
          400
        );
      }

      const expense = await ExpenseService.createExpense({
        userId,
        expenseDate,
        description,
        category,
        originalCurrency,
        originalAmount,
        notes,
      });

      return sendSuccess(res, expense, 'Gasto registrado exitosamente', 201);
    } catch (error: any) {
      console.error('[ExpenseController.create] Error:', error);
      return sendError(res, error.message || 'Error al registrar el gasto', 400);
    }
  }

  /**
   * GET /api/cashflow/expenses
   * Consulta el listado cronológico de gastos de un usuario con filtros opcionales
   */
  static async list(req: Request, res: Response) {
    try {
      const { userId, from, to, category, currency } = req.query;

      if (!userId || typeof userId !== 'string') {
        return sendError(res, "El parámetro 'userId' es requerido en la consulta (?userId=...)", 400);
      }

      const expenses = await ExpenseService.getExpenses(userId, {
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        category: typeof category === 'string' ? category : undefined,
        currency: typeof currency === 'string' ? currency : undefined,
      });

      return sendSuccess(
        res,
        expenses,
        `Se obtuvieron ${expenses.length} registros de gastos`
      );
    } catch (error: any) {
      console.error('[ExpenseController.list] Error:', error);
      return sendError(res, error.message || 'Error al consultar gastos', 500);
    }
  }

  /**
   * GET /api/cashflow/expenses/summary
   * Retorna el resumen consolidado de gastos por categoría y moneda
   */
  static async summary(req: Request, res: Response) {
    try {
      const { userId, from, to } = req.query;

      if (!userId || typeof userId !== 'string') {
        return sendError(res, "El parámetro 'userId' es requerido en la consulta (?userId=...)", 400);
      }

      const summary = await ExpenseService.getExpenseSummary(
        userId,
        typeof from === 'string' ? from : undefined,
        typeof to === 'string' ? to : undefined
      );

      return sendSuccess(res, summary, 'Resumen de gastos y flujo de caja obtenido exitosamente');
    } catch (error: any) {
      console.error('[ExpenseController.summary] Error:', error);
      return sendError(res, error.message || 'Error al generar resumen de gastos', 500);
    }
  }

  /**
   * DELETE /api/cashflow/expenses/:id
   * Elimina un gasto verificando pertenencia al usuario
   */
  static async delete(req: Request, res: Response) {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const userId = (req.body.userId || req.query.userId) as string;

      if (!id) {
        return sendError(res, 'El ID del gasto es requerido', 400);
      }

      if (!userId) {
        return sendError(res, "El parámetro 'userId' es requerido para autorizar la eliminación", 400);
      }

      const result = await ExpenseService.deleteExpense(id, userId);

      return sendSuccess(res, result, 'Gasto eliminado exitosamente');
    } catch (error: any) {
      console.error('[ExpenseController.delete] Error:', error);
      const isNotFound = error.message?.includes('no encontrado');
      return sendError(res, error.message || 'Error al eliminar el gasto', isNotFound ? 404 : 500);
    }
  }
}
