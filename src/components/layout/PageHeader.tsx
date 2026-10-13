import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, back, meta }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <a href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </a>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="no-print flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
