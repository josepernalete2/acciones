import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { portfolioService } from '../api/services';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

interface ImportSummaryResult {
  assetsProcessed: number;
  transactionsImported: number;
  transactionsSkipped: number;
  custodyUpdated: number;
  details: string[];
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummaryResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setResult(null);
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Formato no válido. Debe ser un archivo Excel (.xlsx o .xls)');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona un archivo Excel primero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await portfolioService.importExcelPortfolio(selectedFile, userId);
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Importador de Excel Solfin</h3>
              <p className="text-xs text-slate-400">
                Migración automática de compras, ventas y saldos de custodia CVV
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            /* Success State */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4 className="text-sm font-bold">¡Importación Completada con Éxito!</h4>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <p className="text-[10px] text-slate-400">Transacciones</p>
                    <p className="text-base font-black text-emerald-400">
                      +{result.transactionsImported}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <p className="text-[10px] text-slate-400">Custodia CVV</p>
                    <p className="text-base font-black text-blue-400">
                      +{result.custodyUpdated}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <p className="text-[10px] text-slate-400">Omitidas (Duplicadas)</p>
                    <p className="text-base font-black text-slate-400">
                      {result.transactionsSkipped}
                    </p>
                  </div>
                </div>
              </div>

              {result.details && result.details.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                  <p className="mb-1 font-semibold text-slate-300">Detalle del procesamiento:</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {result.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                >
                  Ver Portafolio Actualizado
                </button>
              </div>
            </div>
          ) : (
            /* Upload State */
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : selectedFile
                    ? 'border-indigo-500/50 bg-indigo-950/20'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-300">
                      Haz clic para cambiar archivo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">
                        Arrastra tu archivo Excel aquí o{' '}
                        <span className="text-indigo-400 underline">examina</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Soporta archivos .xlsx (DASHBOARD SOLFIN)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Pestañas procesadas automáticamente:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px]">
                  <li>
                    <strong className="text-slate-300">PRECIO - VOLUMEN:</strong> Extrae acciones depositadas en CVV para auditoría.
                  </li>
                  <li>
                    <strong className="text-slate-300">COMPRAS VENTA:</strong> Importa bloques históricos con fechas, tasas BCV y precios en Bs.
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Iniciar Importación
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
