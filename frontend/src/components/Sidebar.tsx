import React, { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Receipt,
  PlusCircle,
  ShieldCheck,
  FileSpreadsheet,
  Gift,
  Download,
  FileText,
  ChevronDown,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'portfolio' | 'expenses';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenTransactionModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenImportModal: () => void;
  onOpenDividendModal: () => void;
  onExportReport: (format: 'pdf' | 'excel') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenTransactionModal,
  onOpenExpenseModal,
  onOpenImportModal,
  onOpenDividendModal,
  onExportReport,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard General',
      icon: LayoutDashboard,
      description: 'KPIs, gráficos y balance global',
    },
    {
      id: 'portfolio' as NavTab,
      label: 'Portafolio Bursátil',
      icon: Briefcase,
      description: 'Acciones BVC, precios y P&L',
    },
    {
      id: 'expenses' as NavTab,
      label: 'Flujo de Gastos',
      icon: Receipt,
      description: 'Control multimoneda y caja',
    },
  ];

  return (
    <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-950/60 p-4 lg:w-64 lg:border-r lg:border-b-0 lg:min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-6">
        {/* Navigation Items */}
        <nav className="flex flex-row justify-around gap-1 lg:flex-col lg:justify-start lg:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                  isActive
                    ? 'border border-indigo-500/30 bg-indigo-600/10 text-white shadow-lg shadow-indigo-500/10'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Action Buttons */}
        <div className="hidden flex-col gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 lg:flex">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Acciones Rápidas
          </p>
          <button
            onClick={onOpenTransactionModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            Nueva Operación BVC
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
          >
            <Receipt className="h-4 w-4 text-amber-400" />
            Registrar Gasto
          </button>
          <button
            onClick={onOpenDividendModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 hover:text-white active:scale-[0.98]"
          >
            <Gift className="h-4 w-4 text-indigo-400" />
            Registrar Dividendo
          </button>
          <button
            onClick={onOpenImportModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 hover:text-white active:scale-[0.98]"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            📥 Importar Excel Solfin
          </button>

          {/* Export Report Dropdown */}
          <div className="relative pt-1 border-t border-slate-800/80">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-sky-400" />
                Exportar Reporte
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-xl">
                <button
                  onClick={() => {
                    onExportReport('pdf');
                    setIsExportOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-400" />
                  Estado de Cuenta (PDF)
                </button>
                <button
                  onClick={() => {
                    onExportReport('excel');
                    setIsExportOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors text-left"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  Balance Posiciones (Excel)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custody Info Badge */}
        <div className="hidden items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 lg:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">Auditoría CVV</p>
            <p className="text-[10px] text-slate-500">Caja Venezolana de Valores</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
