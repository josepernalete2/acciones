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
