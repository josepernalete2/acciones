import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { sendError } from '../utils';

export class ReportController {
  /**
   * Genera y descarga el reporte de portafolio en formato Excel (.xlsx)
   * GET /api/reports/portfolio/excel?userId=user-123
   */
  static async downloadExcel(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.query.userId as string) || 'user-123';
      const buffer = await ReportService.generatePortfolioExcel(userId);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Portafolio_BVC_${userId}_${timestamp}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length.toString());

      res.end(buffer);
    } catch (error: any) {
      sendError(res, error.message || 'Error al generar reporte Excel del portafolio', 500);
    }
  }

  /**
   * Genera y descarga el estado de cuenta formal en formato PDF
   * GET /api/reports/portfolio/pdf?userId=user-123
   */
  static async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.query.userId as string) || 'user-123';
      const buffer = await ReportService.generatePortfolioPdf(userId);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Estado_Cuenta_${userId}_${timestamp}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length.toString());

      res.end(buffer);
    } catch (error: any) {
      sendError(res, error.message || 'Error al generar estado de cuenta en PDF', 500);
    }
  }
}
