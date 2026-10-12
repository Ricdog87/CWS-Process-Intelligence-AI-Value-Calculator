import type { ScoreCategoryKey } from '../../config/scoringConfig';
import { CATEGORY_STYLE } from './DomainBadges';

interface ScoreRingProps {
  score: number;
  category: ScoreCategoryKey;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ScoreRing({ score, category, size = 120, stroke = 10, label = 'von 100' }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const color = CATEGORY_STYLE[category].ring;
  const small = size < 80;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Automation Score ${score} von 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray 400ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-semibold tracking-tight text-slate-900 ${small ? 'text-base' : 'text-3xl'}`}>{score}</span>
        {!small && <span className="text-[11px] text-slate-500">{label}</span>}
      </div>
    </div>
  );
}

/** Thin horizontal score bar for tables. */
export function ScoreBar({ score, category }: { score: number; category: ScoreCategoryKey }) {
  return (
    <div className="flex items-center gap-2">
      <span className="tabular w-7 text-right text-sm font-semibold text-slate-900">{score}</span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className={`block h-full rounded-full ${CATEGORY_STYLE[category].bar}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </span>
    </div>
  );
}
