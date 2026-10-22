import React from 'react';
import { DollarSign, TrendingUp, PiggyBank, Receipt, PlusCircle } from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { ChartsSection } from '../components/ChartsSection';
import { PortfolioTable } from '../components/PortfolioTable';
import type { PortfolioSummary, ExpenseSummary } from '../types';

interface DashboardViewProps {
  portfolio: PortfolioSummary | null;
  expenses: ExpenseSummary | null;
  loading: boolean;
  onOpenTransactionModal: () => void;
  onOpenExpenseModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  portfolio,
  expenses,
  loading,
  onOpenTransactionModal,
  onOpenExpenseModal,
}) => {
  const totalValUsd = portfolio
    ? `$${parseFloat(portfolio.totalPortfolioValueUsd).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '$0.00';

  const totalValVes = portfolio
    ? `Bs. ${parseFloat(portfolio.totalPortfolioValueVes).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Bs. 0.00';

  const totalInvestedUsd = portfolio
    ? `$${parseFloat(portfolio.totalInvestedUsd).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '$0.00';

  const pnlNum = portfolio ? parseFloat(portfolio.totalPnlUsd) : 0;
  const isPnlPositive = pnlNum >= 0;
  const pnlUsd = portfolio
    ? `${isPnlPositive ? '+' : ''}$${pnlNum.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '$0.00';

  const totalExpensesUsd = expenses
    ? `$${parseFloat(expenses.totalSpentUsd).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '$0.00';

  const totalExpensesVes = expenses
    ? `Bs. ${parseFloat(expenses.totalSpentVes).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Bs. 0.00';

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-emerald-950/30 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Resumen General de Inversiones
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Seguimiento financiero consolidado de la Bolsa de Valores de Caracas y flujo de caja
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTransactionModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:brightness-110 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            Nueva Operación
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            <Receipt className="h-4 w-4 text-amber-400" />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Valor Total Cartera"
          valueUsd={totalValUsd}
          valueVes={totalValVes}
          subtitle="A la tasa oficial BCV vigente"
          icon={TrendingUp}
          iconColor="text-emerald-400"
        />

        <KpiCard
          title="P&L Latente Total"
          valueUsd={pnlUsd}
          badge={{
            text: portfolio?.totalPnlPct || '0.00%',
            positive: isPnlPositive,
          }}
          subtitle="Rendimiento neto de posiciones"
          icon={DollarSign}
          iconColor={isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}
        />

        <KpiCard
          title="Inversión Total"
          valueUsd={totalInvestedUsd}
          subtitle="Costo base de compra ponderado"
          icon={PiggyBank}
          iconColor="text-indigo-400"
        />

        <KpiCard
          title="Gastos & Comisiones"
          valueUsd={totalExpensesUsd}
          valueVes={totalExpensesVes}
          subtitle={`${expenses?.totalExpensesCount || 0} gastos registrados`}
          icon={Receipt}
          iconColor="text-amber-400"
        />
      </div>

      {/* Charts Section */}
      <ChartsSection
        positions={portfolio?.positions || []}
        categories={expenses?.byCategory || []}
      />

      {/* Portfolio Table */}
      <PortfolioTable
        positions={portfolio?.positions || []}
        onOpenTransactionModal={onOpenTransactionModal}
      />
    </div>
  );
};
