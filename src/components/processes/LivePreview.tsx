import { Activity, Hourglass, Sparkles } from 'lucide-react';
import type { ProcessEvaluation } from '../../lib/evaluation';
import { formatCurrency, formatMonths, formatNumber, formatSignedCurrency } from '../../lib/format';
import { CopilotVerdictBadge, TierBadge } from '../ai/AiBadges';
import { CategoryBadge, SolutionBadge } from '../ui/DomainBadges';
import { ScoreRing } from '../ui/ScoreRing';

export function LivePreview({ evaluation: e, hasName }: { evaluation: ProcessEvaluation; hasName: boolean }) {
  const eco = e.economics;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-ink-900 px-5 py-3 text-white">
        <Activity className="size-4 text-brand-400" aria-hidden />
        <h2 className="text-sm font-semibold">Live-Bewertung</h2>
        <span className="ml-auto text-[11px] text-slate-400">aktualisiert bei jeder Eingabe</span>
      </div>

      {e.score.criteria.every((c) => c.state === 'missing') ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-ink-900">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">Noch keine Angaben</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Sobald Sie Volumen und erste Bewertungsfragen ausfüllen, erscheinen hier Score, Lösungsansatz und wirtschaftliches Potenzial – live bei jeder Eingabe.
          </p>
        </div>
      ) : (
      <div className="p-5" aria-live="polite">
        <div className="flex items-center gap-4">
          <ScoreRing score={e.score.score} category={e.score.category.key} size={96} stroke={9} />
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Automation Score</p>
            <CategoryBadge category={e.score.category.key} label={e.score.category.label} />
            {e.score.isPreliminary && (
              <p className="text-xs text-amber-700">
                Spanne {e.score.range.min}–{e.score.range.max} je nach offenen Angaben
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-slate-500">Empfohlener Lösungsansatz</p>
          {!e.recommendation.decided ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Erscheint, sobald „Regelbasiert und repetitiv“ und „Unstrukturierte Informationen“ beantwortet sind.
            </p>
          ) : (
            <>
              <div className="mt-1.5">
                <SolutionBadge approach={e.recommendation.approach} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{e.recommendation.reasons[0]}</p>
            </>
          )}
        </div>

        {e.ai.recommendation.llmNeeded && e.recommendation.decided && (
          <div className="mt-5 rounded-lg border border-slate-200 p-3">
            <p className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              Copilot-Check <CopilotVerdictBadge verdict={e.ai.recommendation.copilot.verdict} />
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900">{e.ai.recommendation.copilot.title}</p>
            {e.ai.recommendation.recommended && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                Plattform: <span className="font-medium text-slate-900">{e.ai.recommendation.recommended.option.name}</span>
                <TierBadge tier={e.ai.recommendation.recommended.option.tier} short /> · KI-Kosten{' '}
                <span className="tabular font-medium text-slate-900">{formatCurrency(e.ai.recommendation.recommended.annualCostEur)} p.&nbsp;a.</span>
              </p>
            )}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <dt className="text-slate-500">Eingesparte Stunden p. a.</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-slate-900">{formatNumber(eco.totalAnnualHoursSaved)} h</dd>
          </div>
          <div>
            <dt className="text-slate-500">Kapazitätswert p. a.</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(eco.annualCapacityValue)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Netto-Nutzen Jahr 1</dt>
            <dd className={`tabular mt-0.5 text-sm font-semibold ${eco.firstYearNetBenefit < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {formatSignedCurrency(eco.firstYearNetBenefit)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Amortisation</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-slate-900">{formatMonths(eco.paybackMonths)}</dd>
          </div>
        </dl>

        {e.openPoints.length > 0 && (
          <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <Hourglass className="size-3.5" aria-hidden />
              Vorläufig – {e.openPoints.length} {e.openPoints.length === 1 ? 'offener Punkt' : 'offene Punkte'}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {e.openPoints.slice(0, 4).map((p) => (
                <li key={p}>• {p}</li>
              ))}
              {e.openPoints.length > 4 && <li>• … und {e.openPoints.length - 4} weitere</li>}
            </ul>
          </div>
        )}

        {!hasName && <p className="mt-4 text-xs text-slate-400">Tipp: Vergeben Sie noch einen Prozessnamen und wählen Sie den Fachbereich.</p>}
        <p className="mt-4 text-[11px] leading-snug text-slate-400">Schätzung auf Basis Ihrer Angaben. Kapazitätswert ist wirtschaftliches Potenzial, keine Cash-Einsparung.</p>
      </div>
      )}
    </div>
  );
}
