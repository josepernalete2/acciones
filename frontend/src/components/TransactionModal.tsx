import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { portfolioService } from '../api/services';
import type { AssetQuote, CreateTransactionPayload, ExchangeRateData } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assets: AssetQuote[];
  rates: ExchangeRateData | null;
  userId: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assets,
  rates,
  userId,
}) => {
  const [ticker, setTicker] = useState('BPV');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [operationDate, setOperationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [sharesCount, setSharesCount] = useState<string>('100');
  const [pricePerShareVes, setPricePerShareVes] = useState<string>('');
  const [brokerFeeVes, setBrokerFeeVes] = useState<string>('0');
  const [cvvFeeVes, setCvvFeeVes] = useState<string>('0');
  const [brokerName, setBrokerName] = useState('Mercantil Merinvest');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Cálculos en tiempo real
  const shares = parseFloat(sharesCount) || 0;
  const priceVes = parseFloat(pricePerShareVes) || 0;
  const feeBroker = parseFloat(brokerFeeVes) || 0;
  const feeCvv = parseFloat(cvvFeeVes) || 0;
  const totalVes = shares * priceVes + feeBroker + feeCvv;

  const bcv = rates?.bcvUsd ? parseFloat(String(rates.bcvUsd)) : 0;
  const estimatedUsd = bcv > 0 ? totalVes / bcv : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) {
      setError('Selecciona un activo bursátil');
      return;
    }
    if (shares <= 0 || priceVes <= 0) {
      setError('La cantidad de acciones y el precio en Bs deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateTransactionPayload = {
        userId,
        ticker,
        type,
        operationDate,
        sharesCount: shares,
        pricePerShareVes: priceVes,
        brokerFeeVes: feeBroker,
        cvvFeeVes: feeCvv,
        brokerName,
        notes,
      };

      await portfolioService.createTransaction(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la transacción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-white">Registrar Operación Bursátil</h3>
            <p className="text-xs text-slate-400">
              Compra o venta de títulos en la Bolsa de Valores de Caracas
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (BUY / SELL) */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                type === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'border border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              COMPRA (BUY)
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                type === 'SELL'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'border border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              VENTA (SELL)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Ticker Dropdown */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Activo / Ticker
              </label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {assets.length === 0 ? (
                  <option value="BPV">BPV - Banco Provincial</option>
                ) : (
                  assets.map((a) => (
                    <option key={a.id || a.ticker} value={a.ticker}>
                      {a.ticker} - {a.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Fecha Operación */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Fecha de Operación
              </label>
              <input
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Cantidad de Acciones */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Cantidad de Acciones
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={sharesCount}
                onChange={(e) => setSharesCount(e.target.value)}
                placeholder="Ej: 100"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Precio por Acción (VES) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Precio Unitario (Bs.)
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={pricePerShareVes}
                onChange={(e) => setPricePerShareVes(e.target.value)}
                placeholder="Ej: 9280.00"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Comisión Casa de Bolsa */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Comisión Corretaje (Bs.)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={brokerFeeVes}
                onChange={(e) => setBrokerFeeVes(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Tarifa CVV */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Tarifa CVV Custodia (Bs.)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={cvvFeeVes}
                onChange={(e) => setCvvFeeVes(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Casa de Bolsa */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Casa de Bolsa / Intermediario
              </label>
              <input
                type="text"
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                placeholder="Ej: Mercantil Merinvest, Rendivalores, etc."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Notas / Referencia (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Confirmación #8921"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Summary Box */}
          <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Liquidado en Bs:</span>
              <span className="font-mono font-bold text-white">
                Bs. {totalVes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimado en USD (Tasa BCV {bcv.toFixed(2)}):</span>
              <span className="font-mono font-bold text-emerald-400">
                ${estimatedUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:brightness-110 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Registrar Operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
