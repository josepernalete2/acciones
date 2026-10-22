import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  valueUsd: string;
  valueVes?: string;
  badge?: {
    text: string;
    positive: boolean;
  };
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  valueUsd,
  valueVes,
  badge,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-400',
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/80 p-5 shadow-xl transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {valueUsd}
            </h3>
            {badge && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                  badge.positive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {badge.positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {badge.text}
              </span>
            )}
          </div>
          {valueVes && (
            <p className="mt-1 text-xs font-medium text-slate-400">
              ≈ {valueVes}
            </p>
          )}
          {subtitle && (
            <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/40 shadow-inner">
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};
