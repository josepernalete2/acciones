import { Request, Response } from 'express';
import multer from 'multer';
import { ExcelImporterService } from '../services/excelImporter.service';
import { sendSuccess, sendError } from '../utils';

// Configuración de Multer para recibir el archivo en memoria (Buffer)
const storage = multer.memoryStorage();
export const uploadExcel = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Límite de 15 MB
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de hoja de cálculo (.xlsx o .xls)'));
    }
  },
});

export class ImporterController {
  /**
   * POST /api/portfolio/import-excel
   * Ingesta y procesa el archivo Excel de Solfin actualizando transacciones y custodia CVV
   */
  static async importExcel(req: Request, res: Response) {
    try {
      if (!req.file || !req.file.buffer) {
        return sendError(res, 'Debe adjuntar un archivo Excel válido con el campo "file"', 400);
      }

      const userId = (req.body.userId || 'user-123') as string;

      const result = await ExcelImporterService.importSolfinExcel(req.file.buffer, userId);

      return sendSuccess(
        res,
        result,
        `Importación completada: ${result.transactionsImported} transacciones creadas y ${result.custodyUpdated} saldos de custodia actualizados.`,
        200
      );
    } catch (error: any) {
      console.error('[ImporterController.importExcel] Error:', error);
      return sendError(res, error.message || 'Error al procesar el archivo Excel', 500);
    }
  }
}
