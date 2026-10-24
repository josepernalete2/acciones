export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  timestamp: string;
}

export interface ExchangeRateData {
  id?: string;
  rateDate: string;
  bcvUsd: string | number;
  binanceP2pUsd: string | number | null;
  parallelUsd?: string | number | null;
  spreadBcvParalelo: string | number | null;
  createdAt?: string;
  isBcvFallback?: boolean;
}

export interface AssetQuote {
  id: string;
  ticker: string;
  name: string;
  market: 'BVC' | 'US';
  baseCurrency: 'VES' | 'USD' | 'USDT';
  isActive: boolean;
  latestQuote: {
    id: string;
    quoteDate: string;
    closingPriceVes: string;
    volumeTitles: string | null;
    volumeCashVes: string | null;
    variationPct: string | null;
  } | null;
  latestPriceUsd: string | null;
  bcvRateUsed: string | null;
}

export interface PortfolioPosition {
  assetId: string;
  ticker: string;
  name: string;
  totalSharesBought: string;
  totalSharesSold: string;
  totalDividendShares?: string;
  totalDividendsCollectedUsd?: string;
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

export interface PortfolioSummary {
  userId: string;
  totalPortfolioValueUsd: string;
  totalPortfolioValueVes: string;
  totalInvestedUsd: string;
  totalDividendsCollectedUsd?: string;
  totalPnlUsd: string;
  totalPnlPct: string;
  bcvRateUsed: string | null;
  positionsCount: number;
  positions: PortfolioPosition[];
}

export interface ExpenseCategoryBreakdown {
  category: 'BROKER_FEE' | 'CVV_CUSTODY' | 'TAX_IGTF' | 'SUBSCRIPTION' | 'OPERATIONAL' | 'PERSONAL';
  totalUsd: string;
  totalVes: string;
  percentage: string;
  count: number;
}

export interface CurrencyBreakdown {
  currency: 'VES' | 'USD' | 'USDT';
  originalTotal: string;
  equivalentUsd: string;
  count: number;
}

export interface ExpenseSummary {
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

export interface ExpenseItem {
  id: string;
  userId: string;
  expenseDate: string;
  description: string;
  category: string;
  originalCurrency: 'VES' | 'USD' | 'USDT';
  originalAmount: string;
  bcvRateUsed: string;
  binanceRateUsed: string | null;
  equivalentVes: string;
  equivalentBcvUsd: string;
  equivalentBinanceUsdt: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateTransactionPayload {
  userId: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  operationDate: string;
  sharesCount: number | string;
  pricePerShareVes: number | string;
  brokerFeeVes?: number | string;
  cvvFeeVes?: number | string;
  brokerName?: string;
  notes?: string;
}

export interface CreateExpensePayload {
  userId: string;
  expenseDate: string;
  description: string;
  category: string;
  originalCurrency: 'VES' | 'USD' | 'USDT';
  originalAmount: number | string;
  notes?: string;
}

export type DividendType = 'SHARES' | 'CASH_VES' | 'CASH_USD';

export interface DividendItem {
  id: string;
  userId: string;
  assetId: string;
  type: DividendType;
  declarationDate: string;
  paymentDate: string;
  sharesReceived?: string | null;
  grossAmount?: string | null;
  taxWithheld?: string | null;
  netAmount?: string | null;
  bcvRateUsed?: string | null;
  netAmountUsd?: string | null;
  notes?: string | null;
  createdAt: string;
  asset: {
    id: string;
    ticker: string;
    name: string;
  };
}

export interface CreateDividendPayload {
  userId: string;
  ticker: string;
  type: DividendType;
  declarationDate: string;
  paymentDate: string;
  sharesReceived?: number | string;
  grossAmount?: number | string;
  taxWithheld?: number | string;
  notes?: string;
}
