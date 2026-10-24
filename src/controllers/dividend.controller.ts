import { Request, Response } from 'express';
import { DividendService } from '../services/dividend.service';
import { sendSuccess, sendError } from '../utils';

export class DividendController {
  /**
   * Registra un nuevo dividendo (acciones liberadas o efectivo VES/USD)
   * POST /api/dividends
   */
  static async registerDividend(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        ticker,
        assetId,
        type,
        declarationDate,
        paymentDate,
        sharesReceived,
        grossAmount,
        taxWithheld,
        notes,
      } = req.body;

      if (!userId || !type || !paymentDate || (!ticker && !assetId)) {
        sendError(
          res,
          'Faltan campos obligatorios: userId, type, paymentDate y ticker/assetId',
          400
        );
        return;
      }

      const dividend = await DividendService.registerDividend({
        userId,
        ticker,
        assetId,
        type,
        declarationDate,
        paymentDate,
        sharesReceived,
        grossAmount,
        taxWithheld,
        notes,
      });

      sendSuccess(res, dividend, 'Dividendo registrado exitosamente', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Error al registrar dividendo', 400);
    }
  }

  /**
   * Obtiene la lista de dividendos de un usuario
   * GET /api/dividends?userId=user-123&assetId=...
   */
  static async listDividends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.query.userId as string) || 'user-123';
      const assetId = req.query.assetId as string | undefined;

      const dividends = await DividendService.listDividends(userId, assetId);
      sendSuccess(res, dividends, 'Dividendos consultados exitosamente', 200);
    } catch (error: any) {
      sendError(res, error.message || 'Error al consultar dividendos', 500);
    }
  }
}
