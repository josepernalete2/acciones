import { Request, Response } from 'express';
import { ExchangeRateService } from '../services/exchangeRate.service';
import { sendSuccess, sendError } from '../utils';

export class ExchangeRateController {
  /**
   * GET /api/rates/latest
   * Retorna el último registro de tasas cambiarias
   */
  static async getLatest(_req: Request, res: Response) {
    try {
      const latest = await ExchangeRateService.getLatestRate();

      if (!latest) {
        return sendError(res, 'No se encontraron tasas cambiarias registradas en el sistema', 404);
      }

      return sendSuccess(res, latest, 'Última tasa cambiaria obtenida exitosamente');
    } catch (error: any) {
      console.error('[ExchangeRateController.getLatest] Error:', error);
      return sendError(res, error.message || 'Error al obtener la última tasa cambiaria', 500);
    }
  }

  /**
   * GET /api/rates/history
   * Retorna el historial de tasas cambiarias con filtro opcional por fecha (from, to)
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const { from, to } = req.query;

      const history = await ExchangeRateService.getRateHistory(
        typeof from === 'string' ? from : undefined,
        typeof to === 'string' ? to : undefined
      );

      return sendSuccess(
        res,
        history,
        `Se obtuvieron ${history.length} registros de tasas cambiarias`
      );
    } catch (error: any) {
      console.error('[ExchangeRateController.getHistory] Error:', error);
      return sendError(res, error.message || 'Error al consultar el historial de tasas', 500);
    }
  }

  /**
   * POST /api/rates/sync
   * Fuerza la sincronización en tiempo real de las tasas de BCV y Binance P2P
   */
  static async triggerSync(_req: Request, res: Response) {
    try {
      const syncedRate = await ExchangeRateService.syncDailyRates();

      return sendSuccess(
        res,
        syncedRate,
        'Tasas cambiarias (BCV y Binance P2P) sincronizadas y registradas exitosamente',
        201
      );
    } catch (error: any) {
      console.error('[ExchangeRateController.triggerSync] Error:', error);
      return sendError(res, error.message || 'Error al sincronizar las tasas cambiarias', 500);
    }
  }
}
