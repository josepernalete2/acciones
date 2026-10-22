import { Request, Response } from 'express';
import { BvcService } from '../services/bvc.service';
import { sendSuccess, sendError } from '../utils';

export class BvcController {
  /**
   * GET /api/bvc/assets
   * Lista todos los activos BVC con su última cotización y precio estimado en USD
   */
  static async getAssets(_req: Request, res: Response) {
    try {
      const assets = await BvcService.getAllAssetsWithLatestQuote();
      return sendSuccess(
        res,
        assets,
        `Se obtuvieron ${assets.length} activos de la Bolsa de Valores de Caracas`
      );
    } catch (error: any) {
      console.error('[BvcController.getAssets] Error:', error);
      return sendError(res, error.message || 'Error al obtener activos BVC', 500);
    }
  }

  /**
   * GET /api/bvc/assets/:ticker/history
   * Obtiene el histórico cronológico de cotizaciones para un ticker específico
   */
  static async getAssetHistory(req: Request, res: Response) {
    try {
      const rawTicker = req.params.ticker;
      const ticker = Array.isArray(rawTicker) ? rawTicker[0] : rawTicker;
      const { limit } = req.query;

      if (!ticker) {
        return sendError(res, 'El parámetro ticker es requerido', 400);
      }

      const history = await BvcService.getAssetQuoteHistory(
        ticker,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return sendSuccess(
        res,
        history,
        `Historial de cotizaciones para ${ticker.toUpperCase()} obtenido con éxito`
      );
    } catch (error: any) {
      console.error('[BvcController.getAssetHistory] Error:', error);
      const statusCode = error.message?.includes('no encontrado') ? 404 : 500;
      return sendError(res, error.message || 'Error al consultar historial de activo', statusCode);
    }
  }

  /**
   * POST /api/bvc/quotes/sync
   * Sincroniza en tiempo real las cotizaciones de la jornada de la BVC
   */
  static async triggerSyncQuotes(_req: Request, res: Response) {
    try {
      const syncResult = await BvcService.syncDailyQuotes();

      return sendSuccess(
        res,
        syncResult,
        `Sincronización BVC completada: ${syncResult.totalUpdated} títulos actualizados`,
        201
      );
    } catch (error: any) {
      console.error('[BvcController.triggerSyncQuotes] Error:', error);
      return sendError(res, error.message || 'Error al sincronizar cotizaciones BVC', 500);
    }
  }
}
