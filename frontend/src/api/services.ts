import apiClient from './client';
import type {
  ApiResponse,
  ExchangeRateData,
  PortfolioSummary,
  CreateTransactionPayload,
  ExpenseSummary,
  CreateExpensePayload,
  AssetQuote,
  ExpenseItem,
  CreateDividendPayload,
  DividendItem,
} from '../types';

export const exchangeRateService = {
  getLatestRates: async (): Promise<ExchangeRateData> => {
    const response = await apiClient.get<ApiResponse<ExchangeRateData>>('/rates/latest');
    return response.data.data;
  },

  syncRates: async (): Promise<ExchangeRateData> => {
    const response = await apiClient.post<ApiResponse<ExchangeRateData>>('/rates/sync');
    return response.data.data;
  },
};

export const bvcService = {
  getAssets: async (): Promise<AssetQuote[]> => {
    const response = await apiClient.get<ApiResponse<AssetQuote[]>>('/bvc/assets');
    return response.data.data;
  },

  syncQuotes: async (): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>('/bvc/quotes/sync');
    return response.data.data;
  },
};

export const portfolioService = {
  getPortfolioSummary: async (userId: string): Promise<PortfolioSummary> => {
    const response = await apiClient.get<ApiResponse<PortfolioSummary>>('/portfolio/summary', {
      params: { userId },
    });
    return response.data.data;
  },

  createTransaction: async (data: CreateTransactionPayload): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>('/portfolio/transactions', data);
    return response.data.data;
  },

  getTransactions: async (userId: string, ticker?: string): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/portfolio/transactions', {
      params: { userId, ticker },
    });
    return response.data.data;
  },

  importExcelPortfolio: async (file: File, userId: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    const response = await apiClient.post('/portfolio/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const expenseService = {
  getExpenseSummary: async (
    userId: string,
    from?: string,
    to?: string
  ): Promise<ExpenseSummary> => {
    const response = await apiClient.get<ApiResponse<ExpenseSummary>>('/cashflow/expenses/summary', {
      params: { userId, from, to },
    });
    return response.data.data;
  },

  getExpensesList: async (userId: string): Promise<ExpenseItem[]> => {
    const response = await apiClient.get<ApiResponse<ExpenseItem[]>>('/cashflow/expenses', {
      params: { userId },
    });
    return response.data.data;
  },

  createExpense: async (data: CreateExpensePayload): Promise<ExpenseItem> => {
    const response = await apiClient.post<ApiResponse<ExpenseItem>>('/cashflow/expenses', data);
    return response.data.data;
  },

  deleteExpense: async (id: string, userId: string): Promise<any> => {
    const response = await apiClient.delete<ApiResponse<any>>(`/cashflow/expenses/${id}`, {
      data: { userId },
    });
    return response.data.data;
  },
};

export const dividendService = {
  registerDividend: async (data: CreateDividendPayload): Promise<DividendItem> => {
    const response = await apiClient.post<ApiResponse<DividendItem>>('/dividends', data);
    return response.data.data;
  },

  getDividends: async (userId: string, assetId?: string): Promise<DividendItem[]> => {
    const response = await apiClient.get<ApiResponse<DividendItem[]>>('/dividends', {
      params: { userId, assetId },
    });
    return response.data.data;
  },
};

export const reportService = {
  downloadPortfolioReport: async (userId: string, format: 'pdf' | 'excel'): Promise<void> => {
    const endpoint = `/reports/portfolio/${format}`;
    const response = await apiClient.get(endpoint, {
      params: { userId },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type:
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download =
      format === 'pdf'
        ? `Estado_Cuenta_${userId}_${dateStr}.pdf`
        : `Portafolio_BVC_${userId}_${dateStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

