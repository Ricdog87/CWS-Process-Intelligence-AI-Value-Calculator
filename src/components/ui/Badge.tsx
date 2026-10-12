import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type BadgeTone = 'neutral' | 'brand' | 'green' | 'teal' | 'amber' | 'red' | 'violet' | 'blue' | 'ink' | 'outline';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-100 text-ink-900 ring-brand-300',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-rose-50 text-rose-800 ring-rose-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  ink: 'bg-ink-900 text-white ring-ink-900',
  outline: 'bg-white text-slate-700 ring-slate-300',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ tone = 'neutral', icon: Icon, children, className = '', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}
