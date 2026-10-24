import React, { useState } from 'react';
import { Search, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertCircle, Gift } from 'lucide-react';
import type { PortfolioPosition } from '../types';

interface PortfolioTableProps {
  positions: PortfolioPosition[];
  onOpenTransactionModal?: () => void;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ positions, onOpenTransactionModal }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = positions.filter(
    (pos) =>
      pos.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Posiciones del Portafolio BVC</h3>
          <p className="text-xs text-slate-400">
            Cálculo en tiempo real con costo promedio ponderado y última cotización bursátil
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ticker o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Ticker / Activo</th>
              <th className="px-5 py-3.5 font-semibold text-right">Acciones</th>
              <th className="px-5 py-3.5 font-semibold text-right">PPP Compra ($)</th>
              <th className="px-5 py-3.5 font-semibold text-right">Último Precio ($ / Bs)</th>
              <th className="px-5 py-3.5 font-semibold text-right">Valor Mercado ($)</th>
              <th className="px-5 py-3.5 font-semibold text-right">Ganancia / Pérdida ($)</th>
              <th className="px-5 py-3.5 font-semibold text-right">Rendimiento (%)</th>
              <th className="px-5 py-3.5 font-semibold text-center">Custodia CVV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">No se encontraron posiciones activas</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Registra tu primera compra para ver el rendimiento en tiempo real
                  </p>
                  {onOpenTransactionModal && (
                    <button
                      onClick={onOpenTransactionModal}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Registrar Operación
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((pos) => {
                const pnlNumber = parseFloat(pos.pnlUsd);
                const isPositive = pnlNumber >= 0;
                const custodyDiff = parseFloat(pos.custodyDifference);
                const isCustodyOk = custodyDiff === 0;
                const divShares = parseFloat(pos.totalDividendShares || '0');

                return (
                  <tr
                    key={pos.assetId}
                    className="transition-colors hover:bg-slate-800/30"
                  >
                    {/* Ticker & Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 font-bold text-slate-200">
                          {pos.ticker.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{pos.ticker}</p>
                            {divShares > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300">
                                <Gift className="h-2.5 w-2.5" />
                                Liberadas
                              </span>
                            )}
                          </div>
                          <p className="max-w-[180px] truncate text-[11px] text-slate-400">
                            {pos.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Shares */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-medium text-slate-200">
                        {parseFloat(pos.currentShares).toLocaleString()}
                      </p>
                      {divShares > 0 && (
                        <p className="text-[10px] text-indigo-400 font-medium flex items-center justify-end gap-1">
                          +{divShares.toLocaleString()} liberadas
                        </p>
                      )}
                    </td>

                    {/* PPP USD */}
                    <td className="px-5 py-4 text-right font-mono text-slate-300">
                      ${parseFloat(pos.averageBuyPriceUsd).toFixed(4)}
                    </td>

                    {/* Latest Price */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-mono font-bold text-slate-100">
                        {pos.latestPriceUsd ? `$${parseFloat(pos.latestPriceUsd).toFixed(4)}` : '---'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {pos.latestPriceVes ? `Bs. ${parseFloat(pos.latestPriceVes).toLocaleString()}` : ''}
                      </p>
                    </td>

                    {/* Current Value USD */}
                    <td className="px-5 py-4 text-right font-mono font-bold text-white">
                      ${parseFloat(pos.currentValueUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* P&L USD */}
                    <td className="px-5 py-4 text-right font-mono font-bold">
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPositive ? '+' : ''}${parseFloat(pos.pnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* P&L % */}
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {pos.pnlPct}
                      </span>
                    </td>

                    {/* Custody CVV */}
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1">
                        {isCustodyOk ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-[11px] font-medium text-emerald-400">
                              {parseFloat(pos.cvvShares).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-[11px] font-medium text-amber-400">
                              {custodyDiff > 0 ? `+${custodyDiff}` : custodyDiff} dif.
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
