import React, { useState } from 'react';
import { X, Gift, Coins, DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { dividendService } from '../api/services';
import type { AssetQuote, CreateDividendPayload, DividendType, ExchangeRateData } from '../types';

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assets: AssetQuote[];
  rates: ExchangeRateData | null;
  userId: string;
}

export const DividendModal: React.FC<DividendModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assets,
  rates,
  userId,
}) => {
  const [ticker, setTicker] = useState(assets[0]?.ticker || 'BPV');
  const [type, setType] = useState<DividendType>('SHARES');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0]);
  const [sharesReceived, setSharesReceived] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [taxWithheld, setTaxWithheld] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const bcv = rates?.bcvUsd ? parseFloat(String(rates.bcvUsd)) : 0;
  const gross = parseFloat(grossAmount) || 0;
  const tax = parseFloat(taxWithheld) || 0;
  const net = Math.max(0, gross - tax);

  let netUsdEstimated = 0;
  if (type === 'CASH_USD') {
    netUsdEstimated = net;
  } else if (type === 'CASH_VES' && bcv > 0) {
    netUsdEstimated = net / bcv;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ticker) {
      setError('Por favor selecciona un activo bursátil');
      return;
    }

    if (type === 'SHARES') {
      const shares = parseFloat(sharesReceived);
      if (isNaN(shares) || shares <= 0) {
        setError('Ingresa una cantidad válida de acciones liberadas mayor a 0');
        return;
      }
    } else {
      if (gross <= 0) {
        setError('El monto bruto del dividendo debe ser mayor a 0');
        return;
      }
      if (tax < 0 || tax > gross) {
        setError('La retención no puede ser negativa ni superior al monto bruto');
        return;
      }
    }

    try {
      setLoading(true);

      const payload: CreateDividendPayload = {
        userId,
        ticker,
        type,
        declarationDate,
        paymentDate,
        sharesReceived: type === 'SHARES' ? parseFloat(sharesReceived) : undefined,
        grossAmount: type !== 'SHARES' ? gross : undefined,
        taxWithheld: type !== 'SHARES' ? tax : undefined,
        notes: notes.trim() || undefined,
      };

      await dividendService.registerDividend(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || 'Error al registrar el dividendo'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Dividendo Bursátil</h2>
              <p className="text-xs text-slate-400">Acciones liberadas o dividendos en efectivo (VES/USD)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Dividend Type Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Tipo de Dividendo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('SHARES')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'SHARES'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Gift className="h-4 w-4" />
                Acciones Liberadas
              </button>

              <button
                type="button"
                onClick={() => setType('CASH_VES')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'CASH_VES'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Coins className="h-4 w-4" />
                Efectivo (Bs. VES)
              </button>

              <button
                type="button"
                onClick={() => setType('CASH_USD')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'CASH_USD'
                    ? 'border-teal-500 bg-teal-500/20 text-teal-300 shadow-md shadow-teal-500/10'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                Efectivo ($ USD)
              </button>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Activo Bursátil (Ticker)
              </label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.ticker}>
                    {asset.ticker} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Fecha de Pago Efectivo
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Conditional inputs */}
          {type === 'SHARES' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Cantidad de Acciones Liberadas (Títulos Recibidos)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="ej. 500"
                  value={sharesReceived}
                  onChange={(e) => setSharesReceived(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                💡 Estas acciones incrementarán tu posición neta, ajustarán a la baja el costo promedio ponderado y sincronizarán el saldo en custodia CVV.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Monto Bruto Recibido ({type === 'CASH_VES' ? 'Bs. VES' : '$ USD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="ej. 1500.00"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Retención ISLR ({type === 'CASH_VES' ? 'Bs.' : '$'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={taxWithheld}
                    onChange={(e) => setTaxWithheld(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Monto Neto a Percibir: </span>
                  <span className="font-bold text-white">
                    {type === 'CASH_VES' ? `Bs. ${net.toFixed(2)}` : `$${net.toFixed(2)}`}
                  </span>
                </div>
                {type === 'CASH_VES' && (
                  <div>
                    <span className="text-slate-400">Equivalente BCV: </span>
                    <span className="font-bold text-emerald-400">
                      ≈ ${netUsdEstimated.toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Observaciones / Decreto de Asamblea (Opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Asamblea General Ordinaria marzo 2026, 1 acción por cada 5"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Guardar Dividendo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
