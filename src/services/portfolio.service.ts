import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { TransactionType } from '@prisma/client';
import { ExchangeRateService } from './exchangeRate.service';

export interface CreateTransactionDTO {
  userId: string;
  ticker: string;
  type: 'BUY' | 'SELL' | TransactionType;
  operationDate: string; // YYYY-MM-DD
  sharesCount: number | string;
  pricePerShareVes: number | string;
  brokerFeeVes?: number | string;
  cvvFeeVes?: number | string;
  brokerName?: string;
  notes?: string;
}

export interface CustodyAuditDTO {
  userId: string;
  ticker: string;
  cvvShares: number | string;
  auditDate: string; // YYYY-MM-DD
}

export interface AssetPositionSummary {
  assetId: string;
  ticker: string;
  name: string;
  totalSharesBought: string;
  totalSharesSold: string;
  currentShares: string;
  totalInvestedUsd: string;
  averageBuyPriceUsd: string;
  cvvShares: string;
  custodyDifference: string;
  latestPriceVes: string | null;
  latestPriceUsd: string | null;
  currentValueVes: string;
  currentValueUsd: string;
  pnlUsd: string;
  pnlPct: string;
  allocationPct: string;
}

export interface PortfolioSummaryResponse {
  userId: string;
  totalPortfolioValueUsd: string;
  totalPortfolioValueVes: string;
  totalInvestedUsd: string;
  totalPnlUsd: string;
  totalPnlPct: string;
  bcvRateUsed: string | null;
  positionsCount: number;
  positions: AssetPositionSummary[];
}

export class PortfolioService {
  /**
   * Registra una nueva transacción de compra o venta de acciones bursátiles
   * calculando automáticamente contravalor en USD mediante tasa oficial BCV.
   */
  static async createTransaction(data: CreateTransactionDTO) {
    const formattedTicker = data.ticker.trim().toUpperCase();

    // 1. Validar existencia del activo
    const asset = await prisma.asset.findUnique({
      where: { ticker: formattedTicker },
    });

    if (!asset) {
      throw new Error(`Activo bursátil con ticker '${formattedTicker}' no encontrado`);
    }

    // 2. Normalización de montos y cantidades con Decimal.js
    const sharesCount = new Decimal(data.sharesCount);
    const pricePerShareVes = new Decimal(data.pricePerShareVes);
    const brokerFeeVes = new Decimal(data.brokerFeeVes ?? 0);
    const cvvFeeVes = new Decimal(data.cvvFeeVes ?? 0);

    if (sharesCount.lessThanOrEqualTo(0)) {
      throw new Error('La cantidad de acciones debe ser un valor positivo mayor a cero');
    }
    if (pricePerShareVes.lessThanOrEqualTo(0)) {
      throw new Error('El precio por acción en Bs debe ser mayor a cero');
    }

    // 3. Normalizar fecha de operación a medianoche UTC
    const rawDate = new Date(data.operationDate);
    if (isNaN(rawDate.getTime())) {
      throw new Error(`Fecha de operación '${data.operationDate}' no es válida`);
    }
    const operationDate = new Date(
      Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    );

    // 4. Buscar tasa BCV para la fecha o más cercana anterior
    let bcvRateDecimal: Decimal | null = null;

    const exactRate = await prisma.exchangeRate.findUnique({
      where: { rateDate: operationDate },
    });

    if (exactRate?.bcvUsd) {
      bcvRateDecimal = new Decimal(exactRate.bcvUsd.toString());
    } else {
      const priorRate = await prisma.exchangeRate.findFirst({
        where: { rateDate: { lte: operationDate } },
        orderBy: { rateDate: 'desc' },
      });

      if (priorRate?.bcvUsd) {
        bcvRateDecimal = new Decimal(priorRate.bcvUsd.toString());
      } else {
        const latestDbRate = await ExchangeRateService.getLatestRate();
        if (latestDbRate?.bcvUsd) {
          bcvRateDecimal = new Decimal(latestDbRate.bcvUsd.toString());
        } else {
          // Si aún no hay tasas en la base de datos, consulta la tasa oficial actual en vivo
          const liveBcv = await ExchangeRateService.fetchBcvRate();
          bcvRateDecimal = liveBcv.rate;
        }
      }
    }

    if (!bcvRateDecimal || bcvRateDecimal.lessThanOrEqualTo(0)) {
      throw new Error('No se pudo determinar una tasa de cambio BCV válida para la operación');
    }

    // 5. Cálculos financieros
    // totalAmountVes = (sharesCount * pricePerShareVes) + brokerFeeVes + cvvFeeVes
    const grossVes = sharesCount.times(pricePerShareVes);
    const totalAmountVes = grossVes.plus(brokerFeeVes).plus(cvvFeeVes);
    const pricePerShareUsd = pricePerShareVes.dividedBy(bcvRateDecimal).toDecimalPlaces(4);
    const totalAmountUsd = totalAmountVes.dividedBy(bcvRateDecimal).toDecimalPlaces(4);

    const transactionType =
      data.type.toUpperCase() === 'SELL' ? TransactionType.SELL : TransactionType.BUY;

    // 6. Guardar en la base de datos
    const transaction = await prisma.transaction.create({
      data: {
        userId: data.userId,
        assetId: asset.id,
        type: transactionType,
        operationDate,
        sharesCount: sharesCount.toFixed(4),
        pricePerShareVes: pricePerShareVes.toFixed(4),
        totalAmountVes: totalAmountVes.toFixed(4),
        bcvRateUsed: bcvRateDecimal.toFixed(4),
        pricePerShareUsd: pricePerShareUsd.toFixed(4),
        totalAmountUsd: totalAmountUsd.toFixed(4),
        brokerFeeVes: brokerFeeVes.toFixed(4),
        cvvFeeVes: cvvFeeVes.toFixed(4),
        brokerName: data.brokerName || null,
        notes: data.notes || null,
      },
      include: {
        asset: true,
      },
    });

    return transaction;
  }

  /**
   * Obtiene el listado cronológico de transacciones para un usuario
   */
  static async getTransactions(userId: string, ticker?: string) {
    let assetIdFilter: string | undefined = undefined;

    if (ticker) {
      const asset = await prisma.asset.findUnique({
        where: { ticker: ticker.trim().toUpperCase() },
      });
      if (!asset) {
        throw new Error(`Activo con ticker '${ticker}' no encontrado`);
      }
      assetIdFilter = asset.id;
    }

    return prisma.transaction.findMany({
      where: {
        userId,
        ...(assetIdFilter ? { assetId: assetIdFilter } : {}),
      },
      include: {
        asset: true,
      },
      orderBy: [{ operationDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Actualiza el saldo auditado de títulos en la Caja Venezolana de Valores (CVV)
   */
  static async updateCustodyAudit(data: CustodyAuditDTO) {
    const formattedTicker = data.ticker.trim().toUpperCase();

    const asset = await prisma.asset.findUnique({
      where: { ticker: formattedTicker },
    });

    if (!asset) {
      throw new Error(`Activo con ticker '${formattedTicker}' no encontrado`);
    }

    const rawDate = new Date(data.auditDate);
    const lastAuditDate = new Date(
      Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    );

    const cvvShares = new Decimal(data.cvvShares);

    const holding = await prisma.custodyHolding.upsert({
      where: {
        userId_assetId: {
          userId: data.userId,
          assetId: asset.id,
        },
      },
      update: {
        cvvShares: cvvShares.toFixed(4),
        lastAuditDate,
      },
      create: {
        userId: data.userId,
        assetId: asset.id,
        cvvShares: cvvShares.toFixed(4),
        lastAuditDate,
      },
    });

    return {
      ...holding,
      ticker: asset.ticker,
      assetName: asset.name,
    };
  }

  /**
   * Genera el Resumen Consolidado del Portafolio y Métricas de Rendimiento (P&L)
   * Agrupa transacciones, calcula costo promedio ponderado, valor actual de mercado,
   * ganancia/pérdida latente en USD y contraste con custodia CVV.
   */
  static async getPortfolioSummary(userId: string): Promise<PortfolioSummaryResponse> {
    // 1. Obtener todas las transacciones del usuario
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { operationDate: 'asc' },
    });

    // 2. Obtener auditorías de custodia CVV registradas para el usuario
    const custodyRecords = await prisma.custodyHolding.findMany({
      where: { userId },
    });
    const custodyMap = new Map(custodyRecords.map((c) => [c.assetId, new Decimal(c.cvvShares.toString())]));

    // 3. Obtener la tasa oficial BCV más reciente
    const latestRateRecord = await ExchangeRateService.getLatestRate();
    const currentBcvRate = latestRateRecord?.bcvUsd
      ? new Decimal(latestRateRecord.bcvUsd.toString())
      : null;

    // 4. Agrupar transacciones por activo
    const grouped = new Map<string, { asset: any; transactions: typeof transactions }>();

    for (const tx of transactions) {
      if (!grouped.has(tx.assetId)) {
        grouped.set(tx.assetId, { asset: tx.asset, transactions: [] });
      }
      grouped.get(tx.assetId)!.transactions.push(tx);
    }

    // 5. Para cada activo, obtener la última cotización diaria
    const assetIds = Array.from(grouped.keys());
    const latestQuotes = await prisma.dailyQuote.findMany({
      where: { assetId: { in: assetIds } },
      orderBy: { quoteDate: 'desc' },
      distinct: ['assetId'],
    });
    const quoteMap = new Map(latestQuotes.map((q) => [q.assetId, q]));

    // 6. Calcular posiciones individuales
    let totalPortfolioValueUsd = new Decimal(0);
    let totalPortfolioValueVes = new Decimal(0);
    let totalInvestedUsdGlobal = new Decimal(0);

    interface TempPosition {
      assetId: string;
      ticker: string;
      name: string;
      totalSharesBought: Decimal;
      totalSharesSold: Decimal;
      currentShares: Decimal;
      totalInvestedUsd: Decimal;
      averageBuyPriceUsd: Decimal;
      cvvShares: Decimal;
      custodyDifference: Decimal;
      latestPriceVes: Decimal | null;
      latestPriceUsd: Decimal | null;
      currentValueVes: Decimal;
      currentValueUsd: Decimal;
      pnlUsd: Decimal;
      pnlPct: Decimal;
    }

    const tempPositions: TempPosition[] = [];

    for (const [assetId, group] of grouped.entries()) {
      let totalSharesBought = new Decimal(0);
      let totalSharesSold = new Decimal(0);
      let totalBoughtUsd = new Decimal(0);

      for (const tx of group.transactions) {
        const count = new Decimal(tx.sharesCount.toString());
        const amountUsd = new Decimal(tx.totalAmountUsd.toString());

        if (tx.type === TransactionType.BUY) {
          totalSharesBought = totalSharesBought.plus(count);
          totalBoughtUsd = totalBoughtUsd.plus(amountUsd);
        } else if (tx.type === TransactionType.SELL) {
          totalSharesSold = totalSharesSold.plus(count);
        }
      }

      const currentShares = totalSharesBought.minus(totalSharesSold);

      // Precio Promedio Ponderado de compra en USD: averageBuyPriceUsd = totalBoughtUsd / totalSharesBought
      const averageBuyPriceUsd = totalSharesBought.greaterThan(0)
        ? totalBoughtUsd.dividedBy(totalSharesBought).toDecimalPlaces(4)
        : new Decimal(0);

      // Inversión correspondiente a las acciones abiertas actualmente
      const positionCostUsd = currentShares.greaterThan(0)
        ? currentShares.times(averageBuyPriceUsd).toDecimalPlaces(4)
        : new Decimal(0);

      // Custodia CVV
      const cvvShares = custodyMap.get(assetId) || new Decimal(0);
      const custodyDifference = cvvShares.minus(currentShares);

      // Último precio de cierre
      const quote = quoteMap.get(assetId);
      const latestPriceVes = quote ? new Decimal(quote.closingPrice.toString()) : null;
      let latestPriceUsd: Decimal | null = null;

      if (latestPriceVes && currentBcvRate && currentBcvRate.greaterThan(0)) {
        latestPriceUsd = latestPriceVes.dividedBy(currentBcvRate).toDecimalPlaces(4);
      }

      // Valor actual de mercado
      const currentValueVes =
        latestPriceVes && currentShares.greaterThan(0)
          ? currentShares.times(latestPriceVes).toDecimalPlaces(4)
          : new Decimal(0);

      const currentValueUsd =
        latestPriceUsd && currentShares.greaterThan(0)
          ? currentShares.times(latestPriceUsd).toDecimalPlaces(4)
          : new Decimal(0);

      // Ganancia o pérdida latente
      // pnlUsd = currentValueUsd - positionCostUsd
      const pnlUsd = currentValueUsd.minus(positionCostUsd).toDecimalPlaces(4);
      const pnlPct = positionCostUsd.greaterThan(0)
        ? pnlUsd.dividedBy(positionCostUsd).times(100).toDecimalPlaces(2)
        : new Decimal(0);

      totalPortfolioValueUsd = totalPortfolioValueUsd.plus(currentValueUsd);
      totalPortfolioValueVes = totalPortfolioValueVes.plus(currentValueVes);
      totalInvestedUsdGlobal = totalInvestedUsdGlobal.plus(positionCostUsd);

      tempPositions.push({
        assetId,
        ticker: group.asset.ticker,
        name: group.asset.name,
        totalSharesBought,
        totalSharesSold,
        currentShares,
        totalInvestedUsd: positionCostUsd,
        averageBuyPriceUsd,
        cvvShares,
        custodyDifference,
        latestPriceVes,
        latestPriceUsd,
        currentValueVes,
        currentValueUsd,
        pnlUsd,
        pnlPct,
      });
    }

    // 7. Calcular asignación porcentual de cada activo y formatear salida
    const positions: AssetPositionSummary[] = tempPositions.map((p) => {
      const allocationPct = totalPortfolioValueUsd.greaterThan(0)
        ? p.currentValueUsd.dividedBy(totalPortfolioValueUsd).times(100).toDecimalPlaces(2)
        : new Decimal(0);

      return {
        assetId: p.assetId,
        ticker: p.ticker,
        name: p.name,
        totalSharesBought: p.totalSharesBought.toFixed(4),
        totalSharesSold: p.totalSharesSold.toFixed(4),
        currentShares: p.currentShares.toFixed(4),
        totalInvestedUsd: p.totalInvestedUsd.toFixed(4),
        averageBuyPriceUsd: p.averageBuyPriceUsd.toFixed(4),
        cvvShares: p.cvvShares.toFixed(4),
        custodyDifference: p.custodyDifference.toFixed(4),
        latestPriceVes: p.latestPriceVes ? p.latestPriceVes.toFixed(4) : null,
        latestPriceUsd: p.latestPriceUsd ? p.latestPriceUsd.toFixed(4) : null,
        currentValueVes: p.currentValueVes.toFixed(4),
        currentValueUsd: p.currentValueUsd.toFixed(4),
        pnlUsd: p.pnlUsd.toFixed(4),
        pnlPct: `${p.pnlPct.toFixed(2)}%`,
        allocationPct: `${allocationPct.toFixed(2)}%`,
      };
    });

    const totalPnlUsd = totalPortfolioValueUsd.minus(totalInvestedUsdGlobal).toDecimalPlaces(4);
    const totalPnlPct = totalInvestedUsdGlobal.greaterThan(0)
      ? totalPnlUsd.dividedBy(totalInvestedUsdGlobal).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    return {
      userId,
      totalPortfolioValueUsd: totalPortfolioValueUsd.toFixed(4),
      totalPortfolioValueVes: totalPortfolioValueVes.toFixed(4),
      totalInvestedUsd: totalInvestedUsdGlobal.toFixed(4),
      totalPnlUsd: totalPnlUsd.toFixed(4),
      totalPnlPct: `${totalPnlPct.toFixed(2)}%`,
      bcvRateUsed: currentBcvRate ? currentBcvRate.toFixed(4) : null,
      positionsCount: positions.length,
      positions,
    };
  }
}
