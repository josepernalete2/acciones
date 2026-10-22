import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { Currency, ExpenseCategory, Prisma } from '@prisma/client';
import { ExchangeRateService } from './exchangeRate.service';

export interface CreateExpenseDTO {
  userId: string;
  expenseDate: string; // YYYY-MM-DD
  description: string;
  category: ExpenseCategory | string;
  originalCurrency: Currency | string;
  originalAmount: number | string;
  notes?: string;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: string;
  currency?: string;
}

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  totalUsd: string;
  totalVes: string;
  percentage: string;
  count: number;
}

export interface CurrencyBreakdown {
  currency: Currency;
  originalTotal: string;
  equivalentUsd: string;
  count: number;
}

export interface ExpenseSummaryResponse {
  userId: string;
  totalSpentUsd: string;
  totalSpentVes: string;
  totalExpensesCount: number;
  period: {
    from: string | null;
    to: string | null;
  };
  byCategory: ExpenseCategoryBreakdown[];
  byOriginalCurrency: CurrencyBreakdown[];
}

export class ExpenseService {
  /**
   * Registra un nuevo gasto calculando automáticamente sus contravalores
   * en VES, BCV USD y Binance USDT según la fecha del gasto.
   */
  static async createExpense(data: CreateExpenseDTO) {
    if (!data.userId || !data.expenseDate || !data.description || !data.category || !data.originalCurrency) {
      throw new Error('Faltan campos obligatorios para registrar el gasto');
    }

    const amount = new Decimal(data.originalAmount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new Error('El monto del gasto debe ser mayor a cero');
    }

    const currencyKey = data.originalCurrency.toUpperCase() as Currency;
    if (!Object.values(Currency).includes(currencyKey)) {
      throw new Error(`Moneda '${data.originalCurrency}' no válida. Opciones: VES, USD, USDT`);
    }

    const categoryKey = data.category.toUpperCase() as ExpenseCategory;
    if (!Object.values(ExpenseCategory).includes(categoryKey)) {
      throw new Error(`Categoría '${data.category}' no válida`);
    }

    const rawDate = new Date(data.expenseDate);
    if (isNaN(rawDate.getTime())) {
      throw new Error(`Fecha de gasto '${data.expenseDate}' no es válida`);
    }
    const expenseDate = new Date(
      Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    );

    // 1. Obtener tasas BCV y Binance P2P aplicables
    let rateRecord = await prisma.exchangeRate.findUnique({
      where: { rateDate: expenseDate },
    });

    if (!rateRecord) {
      rateRecord = await prisma.exchangeRate.findFirst({
        where: { rateDate: { lte: expenseDate } },
        orderBy: { rateDate: 'desc' },
      });
    }

    if (!rateRecord) {
      rateRecord = await ExchangeRateService.getLatestRate();
    }

    let bcvRate: Decimal;
    let binanceRate: Decimal | null = null;

    if (rateRecord?.bcvUsd) {
      bcvRate = new Decimal(rateRecord.bcvUsd.toString());
      if (rateRecord.binanceP2pUsd) {
        binanceRate = new Decimal(rateRecord.binanceP2pUsd.toString());
      }
    } else {
      const liveBcv = await ExchangeRateService.fetchBcvRate();
      bcvRate = liveBcv.rate;
      try {
        const liveBinance = await ExchangeRateService.fetchBinanceP2pRate();
        binanceRate = liveBinance;
      } catch (err: any) {
        console.warn('[ExpenseService] No se pudo obtener tasa Binance P2P en vivo:', err.message);
      }
    }

    // 2. Conversión Multimoneda Inteligente
    let equivalentVes: Decimal;
    let equivalentBcvUsd: Decimal;
    let equivalentBinanceUsdt: Decimal | null = null;

    switch (currencyKey) {
      case Currency.VES:
        equivalentVes = amount;
        equivalentBcvUsd = amount.dividedBy(bcvRate).toDecimalPlaces(4);
        equivalentBinanceUsdt = binanceRate
          ? amount.dividedBy(binanceRate).toDecimalPlaces(4)
          : null;
        break;

      case Currency.USD:
        equivalentBcvUsd = amount;
        equivalentVes = amount.times(bcvRate).toDecimalPlaces(4);
        equivalentBinanceUsdt = binanceRate
          ? equivalentVes.dividedBy(binanceRate).toDecimalPlaces(4)
          : null;
        break;

      case Currency.USDT:
        equivalentBinanceUsdt = amount;
        // Si hay tasa Binance P2P, convertimos a VES usando Binance, de lo contrario usamos BCV
        equivalentVes = binanceRate
          ? amount.times(binanceRate).toDecimalPlaces(4)
          : amount.times(bcvRate).toDecimalPlaces(4);
        equivalentBcvUsd = equivalentVes.dividedBy(bcvRate).toDecimalPlaces(4);
        break;
    }

    // 3. Guardar en base de datos
    return prisma.expense.create({
      data: {
        userId: data.userId,
        expenseDate,
        description: data.description.trim(),
        category: categoryKey,
        originalCurrency: currencyKey,
        originalAmount: amount.toFixed(4),
        bcvRateUsed: bcvRate.toFixed(4),
        binanceRateUsed: binanceRate ? binanceRate.toFixed(4) : null,
        equivalentVes: equivalentVes.toFixed(4),
        equivalentBcvUsd: equivalentBcvUsd.toFixed(4),
        equivalentBinanceUsdt: equivalentBinanceUsdt ? equivalentBinanceUsdt.toFixed(4) : null,
        notes: data.notes || null,
      },
    });
  }

  /**
   * Retorna el listado cronológico de gastos con filtros opcionales
   */
  static async getExpenses(userId: string, filters?: ExpenseFilters) {
    const where: Prisma.ExpenseWhereInput = {
      userId,
    };

    if (filters?.from || filters?.to) {
      where.expenseDate = {};
      if (filters.from) {
        where.expenseDate.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.expenseDate.lte = new Date(filters.to);
      }
    }

    if (filters?.category) {
      const cat = filters.category.toUpperCase() as ExpenseCategory;
      if (Object.values(ExpenseCategory).includes(cat)) {
        where.category = cat;
      }
    }

    if (filters?.currency) {
      const cur = filters.currency.toUpperCase() as Currency;
      if (Object.values(Currency).includes(cur)) {
        where.originalCurrency = cur;
      }
    }

    return prisma.expense.findMany({
      where,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Genera el consolidado de flujo de caja y gastos:
   * Total en USD/VES, distribución por categoría y por moneda original
   */
  static async getExpenseSummary(
    userId: string,
    from?: string,
    to?: string
  ): Promise<ExpenseSummaryResponse> {
    const expenses = await this.getExpenses(userId, { from, to });

    let totalSpentUsd = new Decimal(0);
    let totalSpentVes = new Decimal(0);

    const categoryMap = new Map<
      ExpenseCategory,
      { totalUsd: Decimal; totalVes: Decimal; count: number }
    >();

    const currencyMap = new Map<
      Currency,
      { originalTotal: Decimal; equivalentUsd: Decimal; count: number }
    >();

    for (const exp of expenses) {
      const usdVal = new Decimal(exp.equivalentBcvUsd.toString());
      const vesVal = new Decimal(exp.equivalentVes.toString());
      const origVal = new Decimal(exp.originalAmount.toString());

      totalSpentUsd = totalSpentUsd.plus(usdVal);
      totalSpentVes = totalSpentVes.plus(vesVal);

      // Por categoría
      if (!categoryMap.has(exp.category)) {
        categoryMap.set(exp.category, {
          totalUsd: new Decimal(0),
          totalVes: new Decimal(0),
          count: 0,
        });
      }
      const catEntry = categoryMap.get(exp.category)!;
      catEntry.totalUsd = catEntry.totalUsd.plus(usdVal);
      catEntry.totalVes = catEntry.totalVes.plus(vesVal);
      catEntry.count++;

      // Por moneda original
      if (!currencyMap.has(exp.originalCurrency)) {
        currencyMap.set(exp.originalCurrency, {
          originalTotal: new Decimal(0),
          equivalentUsd: new Decimal(0),
          count: 0,
        });
      }
      const curEntry = currencyMap.get(exp.originalCurrency)!;
      curEntry.originalTotal = curEntry.originalTotal.plus(origVal);
      curEntry.equivalentUsd = curEntry.equivalentUsd.plus(usdVal);
      curEntry.count++;
    }

    // Calcular distribución porcentual por categoría
    const byCategory: ExpenseCategoryBreakdown[] = Array.from(categoryMap.entries()).map(
      ([cat, data]) => {
        const pct = totalSpentUsd.greaterThan(0)
          ? data.totalUsd.dividedBy(totalSpentUsd).times(100).toDecimalPlaces(2)
          : new Decimal(0);

        return {
          category: cat,
          totalUsd: data.totalUsd.toFixed(4),
          totalVes: data.totalVes.toFixed(4),
          percentage: `${pct.toFixed(2)}%`,
          count: data.count,
        };
      }
    );

    // Ordenar categorías por mayor gasto
    byCategory.sort((a, b) => parseFloat(b.totalUsd) - parseFloat(a.totalUsd));

    const byOriginalCurrency: CurrencyBreakdown[] = Array.from(currencyMap.entries()).map(
      ([cur, data]) => ({
        currency: cur,
        originalTotal: data.originalTotal.toFixed(4),
        equivalentUsd: data.equivalentUsd.toFixed(4),
        count: data.count,
      })
    );

    return {
      userId,
      totalSpentUsd: totalSpentUsd.toFixed(4),
      totalSpentVes: totalSpentVes.toFixed(4),
      totalExpensesCount: expenses.length,
      period: {
        from: from || null,
        to: to || null,
      },
      byCategory,
      byOriginalCurrency,
    };
  }

  /**
   * Elimina un gasto verificando pertenencia al usuario
   */
  static async deleteExpense(id: string, userId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      throw new Error(`Gasto con ID '${id}' no encontrado o no pertenece al usuario`);
    }

    await prisma.expense.delete({
      where: { id },
    });

    return {
      id,
      deleted: true,
      message: 'Gasto eliminado exitosamente',
    };
  }
}
