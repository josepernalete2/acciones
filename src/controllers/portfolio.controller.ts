import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolio.service';
import { sendSuccess, sendError } from '../utils';

export class PortfolioController {
  /**
   * POST /api/portfolio/transactions
   * Registra una transacción bursátil de compra o venta
   */
  static async createTransaction(req: Request, res: Response) {
    try {
      const {
        userId,
        ticker,
        type,
        operationDate,
        sharesCount,
        pricePerShareVes,
        brokerFeeVes,
        cvvFeeVes,
        brokerName,
        notes,
      } = req.body;

      // Validar campos obligatorios
      if (
        !userId ||
        !ticker ||
        !type ||
        !operationDate ||
        sharesCount === undefined ||
        pricePerShareVes === undefined
      ) {
        return sendError(
          res,
          'Faltan campos obligatorios: userId, ticker, type, operationDate, sharesCount, pricePerShareVes',
          400
        );
      }

      const upperType = String(type).toUpperCase();
      if (upperType !== 'BUY' && upperType !== 'SELL') {
        return sendError(res, "El tipo de transacción debe ser 'BUY' o 'SELL'", 400);
      }

      const transaction = await PortfolioService.createTransaction({
        userId,
        ticker,
        type: upperType as 'BUY' | 'SELL',
        operationDate,
        sharesCount,
        pricePerShareVes,
        brokerFeeVes,
        cvvFeeVes,
        brokerName,
        notes,
      });

      return sendSuccess(res, transaction, 'Transacción registrada exitosamente', 201);
    } catch (error: any) {
      console.error('[PortfolioController.createTransaction] Error:', error);
      const isNotFound = error.message?.includes('no encontrado');
      return sendError(res, error.message || 'Error al registrar transacción', isNotFound ? 404 : 500);
    }
  }

  /**
   * GET /api/portfolio/transactions
   * Lista el histórico de transacciones del usuario, opcionalmente filtrado por ticker
   */
  static async listTransactions(req: Request, res: Response) {
    try {
      const { userId, ticker } = req.query;

      if (!userId || typeof userId !== 'string') {
        return sendError(res, "El parámetro 'userId' es requerido en la consulta (?userId=...)", 400);
      }

      const tickerStr = typeof ticker === 'string' ? ticker : undefined;
      const transactions = await PortfolioService.getTransactions(userId, tickerStr);

      return sendSuccess(
        res,
        transactions,
        `Se obtuvieron ${transactions.length} transacciones registradas`
      );
    } catch (error: any) {
      console.error('[PortfolioController.listTransactions] Error:', error);
      return sendError(res, error.message || 'Error al consultar transacciones', 500);
    }
  }

  /**
   * POST /api/portfolio/custody
   * Registra o actualiza la auditoría de títulos en custodia (CVV) para un activo
   */
  static async setCustody(req: Request, res: Response) {
    try {
      const { userId, ticker, cvvShares, auditDate } = req.body;

      if (!userId || !ticker || cvvShares === undefined) {
        return sendError(
          res,
          'Faltan campos obligatorios: userId, ticker, cvvShares',
          400
        );
      }

      const finalAuditDate = auditDate || new Date().toISOString().split('T')[0];

      const holding = await PortfolioService.updateCustodyAudit({
        userId,
        ticker,
        cvvShares,
        auditDate: finalAuditDate,
      });

      return sendSuccess(res, holding, 'Auditoría de custodia CVV actualizada exitosamente');
    } catch (error: any) {
      console.error('[PortfolioController.setCustody] Error:', error);
      const isNotFound = error.message?.includes('no encontrado');
      return sendError(res, error.message || 'Error al actualizar custodia CVV', isNotFound ? 404 : 500);
    }
  }

  /**
   * GET /api/portfolio/summary
   * Retorna la consolidación del portafolio con P&L, costos y contraste de custodia
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return sendError(res, "El parámetro 'userId' es requerido en la consulta (?userId=...)", 400);
      }

      const summary = await PortfolioService.getPortfolioSummary(userId);

      return sendSuccess(res, summary, 'Resumen consolidado de portafolio generado exitosamente');
    } catch (error: any) {
      console.error('[PortfolioController.getSummary] Error:', error);
      return sendError(res, error.message || 'Error al calcular resumen de portafolio', 500);
    }
  }
}
