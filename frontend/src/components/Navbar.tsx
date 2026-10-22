import React from 'react';
import { RefreshCw, TrendingUp, DollarSign, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { ExchangeRateData } from '../types';

interface NavbarProps {
  rates: ExchangeRateData | null;
  loadingRates: boolean;
  onSyncRates: () => Promise<void>;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  rates,
  loadingRates,
  onSyncRates,
  isSyncing,
}) => {
  const bcv = rates?.bcvUsd ? parseFloat(String(rates.bcvUsd)).toFixed(2) : '---';
  const binance = rates?.binanceP2pUsd
    ? parseFloat(String(rates.binanceP2pUsd)).toFixed(2)
    : '---';
  const spread = rates?.spreadBcvParalelo
    ? parseFloat(String(rates.spreadBcvParalelo)).toFixed(2)
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                BVC <span className="text-emerald-400">Portfolio</span>
              </span>
              <span className="hidden rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 sm:inline-block">
                Bolsa de Caracas
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Control Multimoneda & P&L</p>
          </div>
        </div>

        {/* Live Exchange Rates Ticker */}
        <div className="hidden items-center gap-3 md:flex">
          {/* BCV Rate */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 shadow-inner">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Tasa BCV
              </p>
              <p className="text-xs font-bold text-slate-100">
                {loadingRates ? 'Cargando...' : `Bs. ${bcv}`}
              </p>
            </div>
          </div>

          {/* Binance P2P Rate */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 shadow-inner">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Binance P2P
              </p>
              <p className="text-xs font-bold text-slate-100">
                {loadingRates ? 'Cargando...' : `Bs. ${binance}`}
              </p>
            </div>
          </div>

          {/* Spread */}
          {spread !== null && (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Brecha {spread}%</span>
            </div>
          )}
        </div>

        {/* Sync Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSyncRates}
            disabled={isSyncing}
            className="group flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 transition-all hover:border-indigo-500/60 hover:bg-indigo-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Sincronizar cotizaciones BCV y Binance P2P en tiempo real"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-indigo-400 transition-transform ${
                isSyncing ? 'animate-spin' : 'group-hover:rotate-180'
              }`}
            />
            <span className="hidden sm:inline">
              {isSyncing ? 'Sincronizando...' : 'Actualizar Tasas'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
