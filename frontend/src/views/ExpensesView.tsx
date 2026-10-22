import React, { useState, useEffect } from 'react';
import { PlusCircle, Receipt, Trash2, Filter, DollarSign, Tag } from 'lucide-react';
import { expenseService } from '../api/services';
import type { ExpenseSummary, ExpenseItem } from '../types';
import { KpiCard } from '../components/KpiCard';

interface ExpensesViewProps {
  summary: ExpenseSummary | null;
  userId: string;
  onOpenExpenseModal: () => void;
  onRefresh: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  BROKER_FEE: 'Comisión de Intermediación',
  CVV_CUSTODY: 'Mantenimiento Custodia CVV',
  TAX_IGTF: 'Impuestos / Retenciones IGTF',
  SUBSCRIPTION: 'Suscripciones y Terminales',
  OPERATIONAL: 'Gastos Operativos',
  PERSONAL: 'Gastos Personales o Retiros',
};

const CATEGORY_COLORS: Record<string, string> = {
  BROKER_FEE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CVV_CUSTODY: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TAX_IGTF: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  SUBSCRIPTION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPERATIONAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PERSONAL: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  summary,
  userId,
  onOpenExpenseModal,
  onRefresh,
}) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const list = await expenseService.getExpensesList(userId);
      setExpenses(list);
    } catch (err) {
      console.error('Error al cargar lista de gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
    try {
      await expenseService.deleteExpense(id, userId);
      await loadExpenses();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el gasto');
    }
  };

  const filteredExpenses =
    selectedCategory === 'ALL'
      ? expenses
      : expenses.filter((e) => e.category === selectedCategory);

  const totalUsd = summary
    ? `$${parseFloat(summary.totalSpentUsd).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '$0.00';

  const totalVes = summary
    ? `Bs. ${parseFloat(summary.totalSpentVes).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Bs. 0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Control de Gastos Multimoneda y Flujo de Caja
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Registro y conversión automática en VES, USD y USDT según la tasa oficial de la fecha
          </p>
        </div>
        <button
          onClick={onOpenExpenseModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          Registrar Gasto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Total Gastos (USD)"
          valueUsd={totalUsd}
          subtitle="Tasa oficial BCV histórica calculada"
          icon={DollarSign}
          iconColor="text-emerald-400"
        />

        <KpiCard
          title="Total Gastos (Bs)"
          valueUsd={totalVes}
          subtitle="Equivalente en moneda local"
          icon={Receipt}
          iconColor="text-amber-400"
        />

        <KpiCard
          title="Registros de Gastos"
          valueUsd={String(summary?.totalExpensesCount || expenses.length)}
          subtitle="Operaciones de flujo de caja"
          icon={Tag}
          iconColor="text-indigo-400"
        />
      </div>

      {/* Category breakdown cards */}
      {summary && summary.byCategory.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
          <h4 className="mb-4 text-sm font-bold text-white">Desglose por Categoría</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.byCategory.map((cat) => (
              <div
                key={cat.category}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {cat.percentage}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-bold text-white">
                    ${parseFloat(cat.totalUsd).toFixed(2)} USD
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bs. {parseFloat(cat.totalVes).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-md">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-bold text-white">Historial Cronológico de Gastos</h3>
            <p className="text-xs text-slate-400">
              Detalle de cada erogación con contravalores multimoneda
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Todas las Categorías</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Fecha</th>
                <th className="px-5 py-3.5 font-semibold">Descripción</th>
                <th className="px-5 py-3.5 font-semibold">Categoría</th>
                <th className="px-5 py-3.5 font-semibold text-right">Monto Original</th>
                <th className="px-5 py-3.5 font-semibold text-right">Equiv. Bs (VES)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Equiv. BCV ($)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Equiv. USDT</th>
                <th className="px-5 py-3.5 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No hay gastos registrados en esta categoría</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const dateStr = exp.expenseDate
                    ? new Date(exp.expenseDate).toISOString().split('T')[0]
                    : '---';

                  return (
                    <tr key={exp.id} className="transition-colors hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-slate-400">
                        {dateStr}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{exp.description}</p>
                        {exp.notes && (
                          <p className="text-[11px] text-slate-400">{exp.notes}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                            CATEGORY_COLORS[exp.category] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-200">
                        {parseFloat(exp.originalAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[10px] text-amber-400">{exp.originalCurrency}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-300">
                        Bs. {parseFloat(exp.equivalentVes).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                        ${parseFloat(exp.equivalentBcvUsd).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-400">
                        {exp.equivalentBinanceUsdt
                          ? `${parseFloat(exp.equivalentBinanceUsdt).toFixed(2)} USDT`
                          : '---'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
