import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { expenseService } from '../api/services';
import type { CreateExpensePayload, ExchangeRateData } from '../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rates: ExchangeRateData | null;
  userId: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rates,
  userId,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('BROKER_FEE');
  const [originalCurrency, setOriginalCurrency] = useState<'VES' | 'USD' | 'USDT'>('USD');
  const [originalAmount, setOriginalAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const amount = parseFloat(originalAmount) || 0;
  const bcv = rates?.bcvUsd ? parseFloat(String(rates.bcvUsd)) : 0;
  const binance = rates?.binanceP2pUsd ? parseFloat(String(rates.binanceP2pUsd)) : 0;

  // Cálculo de previsualización
  let previewUsd = 0;
  let previewVes = 0;

  if (originalCurrency === 'USD') {
    previewUsd = amount;
    previewVes = amount * bcv;
  } else if (originalCurrency === 'VES') {
    previewVes = amount;
    previewUsd = bcv > 0 ? amount / bcv : 0;
  } else if (originalCurrency === 'USDT') {
    previewVes = binance > 0 ? amount * binance : amount * bcv;
    previewUsd = bcv > 0 ? previewVes / bcv : 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('La descripción del gasto es obligatoria');
      return;
    }
    if (amount <= 0) {
      setError('El monto del gasto debe ser mayor a cero');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateExpensePayload = {
        userId,
        expenseDate,
        description: description.trim(),
        category,
        originalCurrency,
        originalAmount: amount,
        notes,
      };

      await expenseService.createExpense(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'BROKER_FEE', label: 'Comisiones de Intermediación' },
    { value: 'CVV_CUSTODY', label: 'Mantenimiento Custodia CVV' },
    { value: 'TAX_IGTF', label: 'Impuestos / Retenciones IGTF' },
    { value: 'SUBSCRIPTION', label: 'Suscripciones y Terminales' },
    { value: 'OPERATIONAL', label: 'Gastos Operativos' },
    { value: 'PERSONAL', label: 'Gastos Personales o Retiros' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-white">Registrar Gasto Multimoneda</h3>
            <p className="text-xs text-slate-400">
              Control de flujo de caja en VES, USD o Binance USDT
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

          {/* Currency Toggle */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Moneda de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['USD', 'VES', 'USDT'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setOriginalCurrency(curr)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    originalCurrency === curr
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'border border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Descripción */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Descripción del Gasto
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Mantenimiento mensual cuenta custodia CVV"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Monto */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Monto ({originalCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Fecha del Gasto
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Categoría de Gasto
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas opcionales */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Notas / Referencia (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Factura #1042 o transacción Pago Móvil"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Preview Box */}
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Equivalente Estimado en USD (BCV):</span>
              <span className="font-mono font-bold text-emerald-400">
                ${previewUsd.toFixed(2)} USD
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">Equivalente Estimado en Bs:</span>
              <span className="font-mono font-bold text-slate-200">
                Bs. {previewVes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
