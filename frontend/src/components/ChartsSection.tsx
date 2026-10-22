import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { PortfolioPosition, ExpenseCategoryBreakdown } from '../types';

interface ChartsSectionProps {
  positions: PortfolioPosition[];
  categories: ExpenseCategoryBreakdown[];
}

const ASSET_COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
];

const CATEGORY_NAMES: Record<string, string> = {
  BROKER_FEE: 'Corretaje',
  CVV_CUSTODY: 'Custodia CVV',
  TAX_IGTF: 'IGTF / Impuestos',
  SUBSCRIPTION: 'Suscripciones',
  OPERATIONAL: 'Operativos',
  PERSONAL: 'Personales',
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({ positions, categories }) => {
  // Datos para gráfico de distribución de activos (Donut)
  const assetData = positions
    .filter((p) => parseFloat(p.currentValueUsd) > 0)
    .map((p) => ({
      name: p.ticker,
      value: parseFloat(p.currentValueUsd),
      percentage: parseFloat(p.allocationPct) || 0,
    }));

  // Datos para gráfico de barras de gastos
  const categoryData = categories.map((cat) => ({
    name: CATEGORY_NAMES[cat.category] || cat.category,
    amount: parseFloat(cat.totalUsd),
    pct: cat.percentage,
  }));

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
          <p className="font-bold text-white">{data.name}</p>
          <p className="text-xs text-emerald-400">
            ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[11px] text-slate-400">Asignación: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
          <p className="font-bold text-white">{data.name}</p>
          <p className="text-xs text-amber-400">
            ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[11px] text-slate-400">Representa: {data.pct}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Donut Chart: Asset Allocation */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
        <div className="mb-4">
          <h4 className="text-base font-bold text-white">Distribución de Activos</h4>
          <p className="text-xs text-slate-400">Porcentaje de asignación sobre el valor total de la cartera</p>
        </div>

        {assetData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Sin posiciones activas para graficar
          </div>
        ) : (
          <div className="flex flex-col items-center sm:flex-row">
            <div className="h-64 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assetData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ASSET_COLORS[index % ASSET_COLORS.length]}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex w-full flex-wrap gap-2 sm:mt-0 sm:w-1/2 sm:flex-col">
              {assetData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: ASSET_COLORS[index % ASSET_COLORS.length] }}
                  />
                  <span className="font-bold text-slate-200">{item.name}</span>
                  <span className="text-slate-400">({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart: Expenses by Category */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl backdrop-blur-md">
        <div className="mb-4">
          <h4 className="text-base font-bold text-white">Gastos y Salidas por Categoría</h4>
          <p className="text-xs text-slate-400">Consolidado en USD de comisiones, custodia e impuestos</p>
        </div>

        {categoryData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Sin gastos registrados para graficar
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
