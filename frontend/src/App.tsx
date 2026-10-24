import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { PortfolioView } from './views/PortfolioView';
import { ExpensesView } from './views/ExpensesView';
import { TransactionModal } from './components/TransactionModal';
import { ExpenseModal } from './components/ExpenseModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { DividendModal } from './components/DividendModal';
import {
  exchangeRateService,
  portfolioService,
  expenseService,
  bvcService,
  reportService,
} from './api/services';
import type {
  ExchangeRateData,
  PortfolioSummary,
  ExpenseSummary,
  AssetQuote,
} from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [userId] = useState('user-123'); // Usuario predeterminado del sistema

  const [rates, setRates] = useState<ExchangeRateData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
  const [assets, setAssets] = useState<AssetQuote[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar tasas
      try {
        const ratesData = await exchangeRateService.getLatestRates();
        setRates(ratesData);
      } catch (err) {
        console.warn('Tasas aún no inicializadas o en proceso de carga');
      }

      // Cargar portafolio
      try {
        const portData = await portfolioService.getPortfolioSummary(userId);
        setPortfolio(portData);
      } catch (err) {
        console.warn('Portafolio vacío o sin transacciones');
      }

      // Cargar gastos
      try {
        const expData = await expenseService.getExpenseSummary(userId);
        setExpenses(expData);
      } catch (err) {
        console.warn('Gastos vacíos');
      }

      // Cargar catálogo BVC
      try {
        const assetList = await bvcService.getAssets();
        setAssets(assetList);
      } catch (err) {
        console.warn('Catálogo de activos BVC pendiente');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleSyncRates = async () => {
    try {
      setIsSyncing(true);
      const updatedRates = await exchangeRateService.syncRates();
      setRates(updatedRates);
      showToast('Tasas cambiarias (BCV y Binance P2P) sincronizadas exitosamente');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al sincronizar tasas cambiarias', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      showToast(`Generando reporte ${format.toUpperCase()}...`);
      await reportService.downloadPortfolioReport(userId, format);
      showToast(`Reporte ${format.toUpperCase()} descargado exitosamente`);
    } catch (err: any) {
      showToast(err.message || `Error al exportar reporte ${format.toUpperCase()}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        rates={rates}
        loadingRates={loading}
        onSyncRates={handleSyncRates}
        isSyncing={isSyncing}
        onExportReport={handleExportReport}
      />

      {/* Main Body */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenDividendModal={() => setIsDividendModalOpen(true)}
          onExportReport={handleExportReport}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {currentTab === 'dashboard' && (
              <DashboardView
                portfolio={portfolio}
                expenses={expenses}
                loading={loading}
                onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              />
            )}

            {currentTab === 'portfolio' && (
              <PortfolioView
                positions={portfolio?.positions || []}
                onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesView
                summary={expenses}
                userId={userId}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onRefresh={loadData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => {
          showToast('Operación bursátil registrada exitosamente');
          loadData();
        }}
        assets={assets}
        rates={rates}
        userId={userId}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          showToast('Gasto multimoneda registrado exitosamente');
          loadData();
        }}
        rates={rates}
        userId={userId}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          showToast('Portafolio y custodia importados desde Excel exitosamente');
          loadData();
        }}
        userId={userId}
      />

      <DividendModal
        isOpen={isDividendModalOpen}
        onClose={() => setIsDividendModalOpen(false)}
        onSuccess={() => {
          showToast('Dividendo registrado exitosamente');
          loadData();
        }}
        assets={assets}
        rates={rates}
        userId={userId}
      />
    </div>
  );
};

export default App;
