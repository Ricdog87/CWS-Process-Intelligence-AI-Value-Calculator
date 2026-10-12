import { Calculator, Pencil } from 'lucide-react';
import { departmentLabel } from '../../config/options';
import type { ProcessEvaluation } from '../../lib/evaluation';
import { formatCurrency, formatDate, formatNumber } from '../../lib/format';
import { paths } from '../../state/router';
import type { BusinessProcess } from '../../types/process';
import { LinkButton } from '../ui/Button';
import { CategoryBadge, DemoTag, PreliminaryBadge, PriorityBadge, SolutionBadge, StatusBadge } from '../ui/DomainBadges';
import { ScoreRing } from '../ui/ScoreRing';
import { DeleteProcessButton } from './DeleteProcessButton';

export function ProcessCard({ process: p, evaluation: e }: { process: BusinessProcess; evaluation: ProcessEvaluation }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-pop">
      <a href={paths.processDetail(p.id)} className="flex flex-1 gap-4 p-5" aria-label={`${p.name} – Details öffnen`}>
        <ScoreRing score={e.score.score} category={e.score.category.key} size={68} stroke={7} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">{departmentLabel(p.department)}</span>
            {p.isDemo && <DemoTag />}
            {e.isPreliminary && <PreliminaryBadge />}
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{p.name}</h3>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <CategoryBadge category={e.score.category.key} label={e.score.category.label} />
            <SolutionBadge approach={e.recommendation.approach} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Stunden p. a.</dt>
              <dd className="tabular mt-0.5 font-semibold text-slate-900">{formatNumber(e.economics.totalAnnualHoursSaved)} h</dd>
            </div>
            <div>
              <dt className="text-slate-500">Kapazitätswert</dt>
              <dd className="tabular mt-0.5 font-semibold text-slate-900">{formatCurrency(e.economics.annualCapacityValue)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Priorität</dt>
              <dd className="mt-0.5">
                <PriorityBadge level={e.priority.level} label={e.priority.label} />
              </dd>
            </div>
          </dl>
        </div>
      </a>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <StatusBadge status={p.status} />
          <span className="hidden 2xl:inline">Aktualisiert {formatDate(p.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <LinkButton size="sm" variant="ghost" icon={Calculator} href={paths.calculator(p.id)}>
            Wertrechner
          </LinkButton>
          <LinkButton size="sm" variant="ghost" icon={Pencil} href={paths.processEdit(p.id)}>
            Bearbeiten
          </LinkButton>
          <DeleteProcessButton process={p} size="sm" iconOnly />
        </div>
      </footer>
    </article>
  );
}
