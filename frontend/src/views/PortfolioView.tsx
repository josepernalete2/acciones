import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { bvcService } from '../api/services';
import type { PortfolioPosition, AssetQuote } from '../types';
import { PortfolioTable } from '../components/PortfolioTable';

interface PortfolioViewProps {
  positions: PortfolioPosition[];
  onOpenTransactionModal: () => void;
  onRefresh: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  positions,
  onOpenTransactionModal,
  onRefresh,
}) => {
  const [bvcAssets, setBvcAssets] = useState<AssetQuote[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'bvcCatalog'>('positions');
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingAssets(true);
        const data = await bvcService.getAssets();
        setBvcAssets(data);
      } catch (err) {
        console.error('Error al cargar catálogo BVC:', err);
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredCatalog = bvcAssets.filter(
    (a) =>
      a.ticker.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Portafolio Bursátil - Bolsa de Valores de Caracas
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Control de títulos valores, custodia CVV, cotizaciones diarias y P&L en tiempo real
          </p>
        </div>
        <button
          onClick={onOpenTransactionModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:brightness-110 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva Operación BVC
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('positions')}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeSubTab === 'positions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Mis Posiciones Abiertas ({positions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('bvcCatalog')}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeSubTab === 'bvcCatalog'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cotizaciones del Corro BVC ({bvcAssets.length})
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'positions' ? (
        <PortfolioTable positions={positions} onOpenTransactionModal={onOpenTransactionModal} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-md">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold text-white">Catálogo y Cotizaciones Oficiales BVC</h3>
              <p className="text-xs text-slate-400">
                Resumen de renta variable extraído directamente del corro bursátil
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por ticker o empresa..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Ticker</th>
                  <th className="px-5 py-3.5 font-semibold">Empresa / Emisor</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Cierre (Bs.)</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Cierre Estimado ($)</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Variación Diaria</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Títulos Negociados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {loadingAssets ? 'Cargando cotizaciones BVC...' : 'No se encontraron títulos'}
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((asset) => {
                    const varPct = asset.latestQuote?.variationPct
                      ? parseFloat(asset.latestQuote.variationPct)
                      : 0;
                    const isPositive = varPct >= 0;

                    return (
                      <tr key={asset.id} className="transition-colors hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-bold text-white">
                          <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                            {asset.ticker}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-200">{asset.name}</td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-100">
                          {asset.latestQuote?.closingPriceVes
                            ? `Bs. ${parseFloat(asset.latestQuote.closingPriceVes).toLocaleString()}`
                            : '---'}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                          {asset.latestPriceUsd
                            ? `$${parseFloat(asset.latestPriceUsd).toFixed(4)}`
                            : '---'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {asset.latestQuote?.variationPct ? (
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
                              {varPct > 0 ? `+${varPct.toFixed(2)}` : varPct.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">0.00%</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-slate-400">
                          {asset.latestQuote?.volumeTitles
                            ? parseFloat(asset.latestQuote.volumeTitles).toLocaleString()
                            : '0'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
