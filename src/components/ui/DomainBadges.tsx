import { Bot, CheckCircle2, CircleDot, CircleHelp, Cog, FlaskConical, GitMerge, Hourglass, Sparkles, Wrench } from 'lucide-react';
import type { ScoreCategoryKey, PriorityKey } from '../../config/scoringConfig';
import { DEMO_DATA_NOTICE, STATUSES, statusLabel } from '../../config/options';
import type { RecommendationResult, SolutionApproach } from '../../lib/recommendation';
import { SOLUTION_APPROACHES } from '../../lib/recommendation';
import type { ProcessStatus } from '../../types/process';
import { Badge, type BadgeTone } from './Badge';
import { InfoTip } from './InfoTip';

export const CATEGORY_STYLE: Record<ScoreCategoryKey, { tone: BadgeTone; ring: string; bar: string }> = {
  high: { tone: 'green', ring: '#059669', bar: 'bg-emerald-600' },
  good: { tone: 'teal', ring: '#0d9488', bar: 'bg-teal-600' },
  further: { tone: 'amber', ring: '#d97706', bar: 'bg-amber-500' },
  low: { tone: 'red', ring: '#e11d48', bar: 'bg-rose-600' },
};

export function CategoryBadge({ category, label }: { category: ScoreCategoryKey; label: string }) {
  return <Badge tone={CATEGORY_STYLE[category].tone}>{label}</Badge>;
}

const SOLUTION_STYLE: Record<SolutionApproach, { tone: BadgeTone; icon: typeof Cog }> = {
  classical: { tone: 'blue', icon: Cog },
  ai: { tone: 'violet', icon: Sparkles },
  hybrid: { tone: 'teal', icon: GitMerge },
  optimization_first: { tone: 'amber', icon: Wrench },
};

export function SolutionBadge({ approach, short }: { approach: SolutionApproach; short?: boolean }) {
  const style = SOLUTION_STYLE[approach];
  const info = SOLUTION_APPROACHES[approach];
  return (
    <Badge tone={style.tone} icon={style.icon} title={short ? info.label : undefined}>
      {short ? info.short : info.label}
    </Badge>
  );
}

/** Solution badge that shows "offen" while the deciding assessment answers are missing. */
export function ApproachBadge({ recommendation, short }: { recommendation: RecommendationResult; short?: boolean }) {
  if (!recommendation.decided) {
    return (
      <Badge tone="outline" icon={CircleHelp} title={`Vorläufige Tendenz auf Basis von Annahmen: ${recommendation.label}`}>
        {short ? 'Offen' : 'Lösungsansatz offen'}
      </Badge>
    );
  }
  return <SolutionBadge approach={recommendation.approach} short={short} />;
}

export function solutionIcon(approach: SolutionApproach) {
  return SOLUTION_STYLE[approach].icon;
}

const PRIORITY_STYLE: Record<PriorityKey, string> = {
  high: 'bg-ink-900 text-white ring-ink-900',
  medium: 'bg-brand-100 text-ink-900 ring-brand-400',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const PRIORITY_DOTS: Record<PriorityKey, number> = { high: 3, medium: 2, low: 1 };

export function PriorityBadge({ level, label, score }: { level: PriorityKey; label: string; score?: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${PRIORITY_STYLE[level]}`}
      title={score !== undefined ? `Prioritätsscore ${score} von 100` : undefined}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`size-1.5 rounded-full ${i <= PRIORITY_DOTS[level] ? 'bg-current' : 'bg-current opacity-25'}`} />
        ))}
      </span>
      {label}
      {score !== undefined && <span className="tabular font-normal opacity-75">{score}</span>}
    </span>
  );
}

const STATUS_TONE: Record<ProcessStatus, { tone: BadgeTone; icon: typeof Cog }> = {
  new: { tone: 'outline', icon: CircleDot },
  under_assessment: { tone: 'amber', icon: Hourglass },
  approved_discovery: { tone: 'blue', icon: FlaskConical },
  pilot: { tone: 'violet', icon: Bot },
  implemented: { tone: 'green', icon: CheckCircle2 },
};

export function StatusBadge({ status }: { status: ProcessStatus }) {
  const s = STATUS_TONE[status];
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {statusLabel(status)}
    </Badge>
  );
}

interface StatusSelectProps {
  value: ProcessStatus;
  onChange: (status: ProcessStatus) => void;
  label?: string;
  compact?: boolean;
}

export function StatusSelect({ value, onChange, label = 'Status ändern', compact }: StatusSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as ProcessStatus)}
      className={`max-w-full rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none ${
        compact ? 'h-8 w-40 px-2 text-xs' : 'h-9 px-2.5 text-sm'
      }`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function DemoTag() {
  return (
    <Badge tone="brand" title={DEMO_DATA_NOTICE} className="tracking-wide uppercase">
      Demo
    </Badge>
  );
}

export function PreliminaryBadge({ points }: { points?: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone="amber" icon={Hourglass}>
        Vorläufig
      </Badge>
      {points && points.length > 0 && (
        <InfoTip
          label="Warum vorläufig?"
          content={
            <span className="block">
              <span className="mb-1 block font-semibold">Fehlende oder unsichere Angaben:</span>
              {points.slice(0, 6).map((p) => (
                <span key={p} className="block">
                  • {p}
                </span>
              ))}
              {points.length > 6 && <span className="block">• … und {points.length - 6} weitere</span>}
            </span>
          }
        />
      )}
    </span>
  );
}
