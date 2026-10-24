import * as xlsx from 'xlsx';
import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { TransactionType, MarketType, Currency } from '@prisma/client';
import { parseVenezuelanNumber } from './bvc.service';
import { ExchangeRateService } from './exchangeRate.service';

export interface ImportResult {
  assetsProcessed: number;
  transactionsImported: number;
  transactionsSkipped: number;
  custodyUpdated: number;
  details: string[];
}

/**
 * Normaliza fechas provenientes de Excel (Date, seriales o strings) a UTC medianoche
 */
function parseExcelDate(val: any): Date | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
  }

  if (typeof val === 'number') {
    // Conversión de fecha serial de Excel (sistema 1900)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return null;

    // Formato DD/MM/YYYY o DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      return new Date(Date.UTC(year, month, day));
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }
  }

  return null;
}

export class ExcelImporterService {
  /**
   * Importa y sincroniza automáticamente el portafolio y custodia desde el archivo Excel de Solfin
   */
  static async importSolfinExcel(fileBuffer: Buffer, userId: string): Promise<ImportResult> {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames;

    let assetsProcessed = 0;
    let custodyUpdated = 0;
    let transactionsImported = 0;
    let transactionsSkipped = 0;
    const details: string[] = [];

    // Helper para asegurar activo en base de datos
    const ensureAsset = async (rawTicker: string) => {
      const ticker = rawTicker.trim().toUpperCase();
      let asset = await prisma.asset.findUnique({ where: { ticker } });
      if (!asset) {
        asset = await prisma.asset.create({
          data: {
            ticker,
            name: `Activo BVC ${ticker}`,
            market: MarketType.BVC,
            baseCurrency: Currency.VES,
            isActive: true,
          },
        });
        details.push(`Activo ${ticker} creado en el catálogo del sistema.`);
      }
      return asset;
    };

    // -------------------------------------------------------------
    // 1. PROCESAR PESTAÑA 'PRECIO - VOLUMEN' (Custodia CVV)
    // -------------------------------------------------------------
    const pvSheetName = sheetNames.find((name) =>
      /precio.*volumen/i.test(name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );

    if (pvSheetName) {
      const pvSheet = workbook.Sheets[pvSheetName];
      const rows: any[][] = xlsx.utils.sheet_to_json(pvSheet, { header: 1, defval: null });
      const today = new Date();
      const auditDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 2) continue;

        // Columna B: Ticker (índice 1)
        const rawTicker = row[1];
        if (!rawTicker || typeof rawTicker !== 'string') continue;

        const cleanTicker = rawTicker.trim().toUpperCase();
        if (
          cleanTicker === 'TICKER' ||
          cleanTicker === 'SIMBOLO' ||
          cleanTicker === 'EMPRESA' ||
          cleanTicker.length > 10 ||
          cleanTicker.length < 2
        ) {
          continue;
        }

        // Columna H: ACCIONES DEPOSITADAS CVV (índice 7)
        const rawCvv = row[7];
        const cvvDecimal = parseVenezuelanNumber(rawCvv);

        if (cvvDecimal && cvvDecimal.greaterThan(0)) {
          const asset = await ensureAsset(cleanTicker);

          await prisma.custodyHolding.upsert({
            where: {
              userId_assetId: {
                userId,
                assetId: asset.id,
              },
            },
            update: {
              cvvShares: cvvDecimal.toFixed(4),
              lastAuditDate: auditDate,
            },
            create: {
              userId,
              assetId: asset.id,
              cvvShares: cvvDecimal.toFixed(4),
              lastAuditDate: auditDate,
            },
          });

          custodyUpdated++;
          assetsProcessed++;
        }
      }
      details.push(`Pestaña '${pvSheetName}': ${custodyUpdated} saldos de custodia CVV actualizados.`);
    } else {
      details.push("Aviso: No se encontró la pestaña 'PRECIO - VOLUMEN' en el archivo.");
    }

    // -------------------------------------------------------------
    // 2. PROCESAR PESTAÑA 'COMPRAS VENTA' (Historial de Transacciones)
    // -------------------------------------------------------------
    const cvSheetName = sheetNames.find((name) =>
      /compras?.*ventas?/i.test(name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );

    if (cvSheetName) {
      const cvSheet = workbook.Sheets[cvSheetName];
      const rows: any[][] = xlsx.utils.sheet_to_json(cvSheet, { header: 1, defval: null });

      // Cache para tasa BCV más reciente
      const latestDbRate = await ExchangeRateService.getLatestRate();
      const fallbackBcvRate = latestDbRate?.bcvUsd
        ? new Decimal(latestDbRate.bcvUsd.toString())
        : new Decimal(884.7496); // Fallback de contingencia

      // Procesar filas de datos a partir de la fila 4 (índice 3 o posterior)
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!Array.isArray(row) || row.length < 10) continue;

        // Columna A (índice 0): Ticker
        const rawTicker = row[0];
        if (!rawTicker || typeof rawTicker !== 'string') continue;

        const cleanTicker = rawTicker.trim().toUpperCase();
        if (
          cleanTicker === 'TICKER' ||
          cleanTicker === 'ACTIVO' ||
          cleanTicker === 'TOTAL' ||
          cleanTicker === 'ACCION' ||
          cleanTicker.length > 10 ||
          cleanTicker.length < 2
        ) {
          continue;
        }

        const asset = await ensureAsset(cleanTicker);

        // Cada operación es un bloque de 8 columnas a partir de Col J (índice 9)
        // Puede haber hasta 14 bloques
        for (let block = 0; block < 14; block++) {
          const startCol = 9 + block * 8;
          if (startCol + 3 >= row.length) break;

          const rawDate = row[startCol + 0];
          const rawShares = row[startCol + 1];
          const rawType = row[startCol + 2];
          const rawPrice = row[startCol + 3];
          const rawBcv = row[startCol + 5];

          const operationDate = parseExcelDate(rawDate);
          if (!operationDate) continue;

          const shares = parseVenezuelanNumber(rawShares);
          if (!shares || shares.lessThanOrEqualTo(0)) continue;

          const price = parseVenezuelanNumber(rawPrice);
          if (!price || price.lessThanOrEqualTo(0)) continue;

          const typeStr = String(rawType || '').trim().toUpperCase();
          const type = typeStr.includes('VENTA') || typeStr === 'SELL'
            ? TransactionType.SELL
            : TransactionType.BUY;

          // Resolver tasa BCV usada
          let bcvRateUsed = parseVenezuelanNumber(rawBcv);
          if (!bcvRateUsed || bcvRateUsed.lessThanOrEqualTo(0)) {
            // Buscar tasa histórica en BD
            const histRate = await prisma.exchangeRate.findFirst({
              where: { rateDate: { lte: operationDate } },
              orderBy: { rateDate: 'desc' },
            });
            bcvRateUsed = histRate?.bcvUsd
              ? new Decimal(histRate.bcvUsd.toString())
              : fallbackBcvRate;
          }

          // Cálculos financieros exactos
          const totalAmountVes = shares.times(price);
          const pricePerShareUsd = price.dividedBy(bcvRateUsed).toDecimalPlaces(4);
          const totalAmountUsd = totalAmountVes.dividedBy(bcvRateUsed).toDecimalPlaces(4);

          // Comprobar duplicados para idempotencia
          const existing = await prisma.transaction.findFirst({
            where: {
              userId,
              assetId: asset.id,
              operationDate,
              sharesCount: shares.toFixed(4),
              pricePerShareVes: price.toFixed(4),
              type,
            },
          });

          if (existing) {
            transactionsSkipped++;
            continue;
          }

          await prisma.transaction.create({
            data: {
              userId,
              assetId: asset.id,
              type,
              operationDate,
              sharesCount: shares.toFixed(4),
              pricePerShareVes: price.toFixed(4),
              totalAmountVes: totalAmountVes.toFixed(4),
              bcvRateUsed: bcvRateUsed.toFixed(4),
              pricePerShareUsd: pricePerShareUsd.toFixed(4),
              totalAmountUsd: totalAmountUsd.toFixed(4),
              brokerFeeVes: '0.0000',
              cvvFeeVes: '0.0000',
              brokerName: 'Solfin Casa de Bolsa (Importado)',
              notes: `Operación bloque ${block + 1} importada desde Excel`,
            },
          });

          transactionsImported++;
        }
      }
      details.push(
        `Pestaña '${cvSheetName}': ${transactionsImported} transacciones creadas (${transactionsSkipped} omitidas por existir previamente).`
      );
    } else {
      details.push("Aviso: No se encontró la pestaña 'COMPRAS VENTA' en el archivo.");
    }

    return {
      assetsProcessed,
      transactionsImported,
      transactionsSkipped,
      custodyUpdated,
      details,
    };
  }
}
