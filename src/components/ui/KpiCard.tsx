import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Highlights the card (e.g. headline KPI). */
  accent?: boolean;
  tone?: 'default' | 'positive' | 'negative';
  footnote?: ReactNode;
}

export function KpiCard({ label, value, sub, icon: Icon, hint, accent, tone = 'default', footnote }: KpiCardProps) {
  const valueColor = tone === 'negative' ? 'text-rose-700' : 'text-slate-900';
  return (
    <div
      className={`relative flex min-w-0 flex-col rounded-xl border bg-white p-4 shadow-card ${
        accent ? 'border-brand-400 ring-1 ring-brand-300' : 'border-slate-200'
      }`}
    >
      {accent && <span className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-brand-400" aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-slate-500">
          <span className="truncate">{label}</span>
          {hint && <InfoTip content={hint} label={`Erläuterung: ${label}`} />}
        </div>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      {footnote && <div className="mt-auto pt-3 text-[11px] leading-snug text-slate-400">{footnote}</div>}
    </div>
  );
}
