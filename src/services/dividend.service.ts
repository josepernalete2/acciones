import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { DividendType } from '@prisma/client';
import { ExchangeRateService } from './exchangeRate.service';

export interface RegisterDividendDTO {
  userId: string;
  ticker?: string;
  assetId?: string;
  type: 'SHARES' | 'CASH_VES' | 'CASH_USD' | DividendType;
  declarationDate: string; // YYYY-MM-DD
  paymentDate: string;     // YYYY-MM-DD
  sharesReceived?: number | string;
  grossAmount?: number | string;
  taxWithheld?: number | string;
  notes?: string;
}

export class DividendService {
  /**
   * Registra un nuevo dividendo (en acciones liberadas o en efectivo VES/USD)
   * calculando automáticamente retenciones, contravalor USD y tasas BCV.
   */
  static async registerDividend(data: RegisterDividendDTO) {
    // 1. Resolver el activo bursátil
    let asset = null;
    if (data.assetId) {
      asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    } else if (data.ticker) {
      asset = await prisma.asset.findUnique({ where: { ticker: data.ticker.trim().toUpperCase() } });
    }

    if (!asset) {
      throw new Error(`Activo bursátil '${data.ticker || data.assetId}' no encontrado`);
    }

    // 2. Normalizar fechas a medianoche UTC
    const rawPayDate = new Date(data.paymentDate);
    if (isNaN(rawPayDate.getTime())) {
      throw new Error(`Fecha de pago '${data.paymentDate}' no es válida`);
    }
    const paymentDate = new Date(
      Date.UTC(rawPayDate.getUTCFullYear(), rawPayDate.getUTCMonth(), rawPayDate.getUTCDate())
    );

    const rawDeclDate = new Date(data.declarationDate || data.paymentDate);
    const declarationDate = new Date(
      Date.UTC(rawDeclDate.getUTCFullYear(), rawDeclDate.getUTCMonth(), rawDeclDate.getUTCDate())
    );

    // 3. Obtener o resolver tasa BCV para la fecha de pago
    let bcvRateDecimal: Decimal | null = null;
    const exactRate = await prisma.exchangeRate.findUnique({
      where: { rateDate: paymentDate },
    });

    if (exactRate?.bcvUsd) {
      bcvRateDecimal = new Decimal(exactRate.bcvUsd.toString());
    } else {
      const priorRate = await prisma.exchangeRate.findFirst({
        where: { rateDate: { lte: paymentDate } },
        orderBy: { rateDate: 'desc' },
      });

      if (priorRate?.bcvUsd) {
        bcvRateDecimal = new Decimal(priorRate.bcvUsd.toString());
      } else {
        const latestDbRate = await ExchangeRateService.getLatestRate();
        if (latestDbRate?.bcvUsd) {
          bcvRateDecimal = new Decimal(latestDbRate.bcvUsd.toString());
        } else {
          const liveBcv = await ExchangeRateService.fetchBcvRate();
          bcvRateDecimal = liveBcv.rate;
        }
      }
    }

    // 4. Procesar según tipo de dividendo
    const dividendType = data.type as DividendType;

    let sharesReceived: Decimal | null = null;
    let grossAmount: Decimal | null = null;
    let taxWithheld: Decimal = new Decimal(data.taxWithheld || 0);
    let netAmount: Decimal | null = null;
    let bcvRateUsed: Decimal | null = null;
    let netAmountUsd: Decimal | null = null;

    if (dividendType === DividendType.SHARES) {
      if (!data.sharesReceived || new Decimal(data.sharesReceived).lessThanOrEqualTo(0)) {
        throw new Error('Para dividendos en acciones liberadas, sharesReceived debe ser mayor a 0');
      }
      sharesReceived = new Decimal(data.sharesReceived);
      grossAmount = null;
      taxWithheld = new Decimal(0);
      netAmount = null;
      bcvRateUsed = null;
      netAmountUsd = null;
    } else if (dividendType === DividendType.CASH_VES) {
      if (!data.grossAmount || new Decimal(data.grossAmount).lessThanOrEqualTo(0)) {
        throw new Error('Para dividendos en efectivo (VES), grossAmount debe ser mayor a 0');
      }
      grossAmount = new Decimal(data.grossAmount);
      netAmount = grossAmount.minus(taxWithheld);
      if (netAmount.lessThan(0)) {
        throw new Error('La retención no puede exceder el monto bruto del dividendo');
      }

      if (!bcvRateDecimal || bcvRateDecimal.lessThanOrEqualTo(0)) {
        throw new Error('No se pudo determinar una tasa de cambio BCV válida para la fecha del dividendo');
      }

      bcvRateUsed = bcvRateDecimal;
      netAmountUsd = netAmount.dividedBy(bcvRateUsed).toDecimalPlaces(4);
    } else if (dividendType === DividendType.CASH_USD) {
      if (!data.grossAmount || new Decimal(data.grossAmount).lessThanOrEqualTo(0)) {
        throw new Error('Para dividendos en efectivo (USD), grossAmount debe ser mayor a 0');
      }
      grossAmount = new Decimal(data.grossAmount);
      netAmount = grossAmount.minus(taxWithheld);
      if (netAmount.lessThan(0)) {
        throw new Error('La retención no puede exceder el monto bruto del dividendo');
      }

      bcvRateUsed = bcvRateDecimal || null;
      netAmountUsd = netAmount.toDecimalPlaces(4);
    } else {
      throw new Error(`Tipo de dividendo '${data.type}' no reconocido`);
    }

    // 5. Guardar en base de datos
    const record = await prisma.dividend.create({
      data: {
        userId: data.userId,
        assetId: asset.id,
        type: dividendType,
        declarationDate,
        paymentDate,
        sharesReceived: sharesReceived ? sharesReceived.toFixed(4) : null,
        grossAmount: grossAmount ? grossAmount.toFixed(4) : null,
        taxWithheld: taxWithheld.toFixed(4),
        netAmount: netAmount ? netAmount.toFixed(4) : null,
        bcvRateUsed: bcvRateUsed ? bcvRateUsed.toFixed(4) : null,
        netAmountUsd: netAmountUsd ? netAmountUsd.toFixed(4) : null,
        notes: data.notes || null,
      },
      include: {
        asset: true,
      },
    });

    return record;
  }

  /**
   * Obtiene el listado de dividendos cobrados por un usuario
   */
  static async listDividends(userId: string, assetId?: string) {
    return prisma.dividend.findMany({
      where: {
        userId,
        ...(assetId ? { assetId } : {}),
      },
      include: {
        asset: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
