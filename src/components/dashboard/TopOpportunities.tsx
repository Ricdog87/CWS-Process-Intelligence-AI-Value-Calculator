import { ArrowRight } from 'lucide-react';
import { departmentLabel } from '../../config/options';
import type { PortfolioRow } from '../../lib/csv';
import { formatCurrency } from '../../lib/format';
import { paths } from '../../state/router';
import { PriorityBadge, ApproachBadge } from '../ui/DomainBadges';

export function TopOpportunities({ rows }: { rows: PortfolioRow[] }) {
  const top = rows
    // Pilots and implemented processes are already in delivery – the CoE's next decisions lie elsewhere.
    .filter((r) => r.process.status !== 'implemented' && r.process.status !== 'pilot')
    .sort((a, b) => b.evaluation.priority.score - a.evaluation.priority.score)
    .slice(0, 3);

  if (top.length === 0) {
    return <p className="text-sm text-slate-500">Keine offenen Chancen – alle erfassten Prozesse sind bereits im Pilot oder umgesetzt.</p>;
  }

  return (
    <ol className="space-y-3">
      {top.map(({ process: p, evaluation: e }, i) => (
        <li key={p.id}>
          <a
            href={paths.processDetail(p.id)}
            className="group block rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-400 text-sm font-semibold text-ink-900">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium break-words hyphens-auto text-slate-900">{p.name}</p>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-600" aria-hidden />
                </div>
                <p className="text-xs text-slate-500">
                  {departmentLabel(p.department)} · {formatCurrency(e.economics.annualCapacityValue)} Kapazitätswert p. a.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <PriorityBadge level={e.priority.level} label={e.priority.label} score={e.priority.score} />
                  <ApproachBadge recommendation={e.recommendation} short />
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Nächster Schritt: </span>
                  {e.nextStep.title}
                </p>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );
}
