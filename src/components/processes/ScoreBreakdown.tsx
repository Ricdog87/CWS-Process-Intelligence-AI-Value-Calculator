import { CircleHelp } from 'lucide-react';
import type { AutomationScoreResult } from '../../lib/scoring';
import { formatNumber } from '../../lib/format';

export function ScoreBreakdown({ score }: { score: AutomationScoreResult }) {
  return (
    <div className="scrollbar-thin scroll-hint-x relative overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr className="border-b border-slate-200">
            <th scope="col" className="px-5 py-2.5 text-left font-medium">Kriterium</th>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">Angabe</th>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">Punkte</th>
            <th scope="col" className="px-3 py-2.5 pr-5 text-left font-medium">Regel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {score.criteria.map((c) => {
            const share = c.weight > 0 ? c.points / c.weight : 0;
            return (
              <tr key={c.key}>
                <td className="px-5 py-3 font-medium text-slate-800">{c.label}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {c.state === 'missing' ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <CircleHelp className="size-3.5" aria-hidden />
                      Keine Angabe
                    </span>
                  ) : (
                    <span className={c.state === 'unknown' ? 'text-amber-700' : 'text-slate-700'}>{c.answerLabel}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="tabular w-14 text-right whitespace-nowrap text-slate-900">
                      <span className="font-semibold">{formatNumber(c.points, 1)}</span>
                      <span className="text-slate-400"> / {c.weight}</span>
                    </span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <span className="block h-full rounded-full bg-ink-700" style={{ width: `${share * 100}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 pr-5 text-xs text-slate-500">{c.rule}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td className="px-5 py-3 font-semibold text-slate-900" colSpan={2}>
              Automation Score
            </td>
            <td className="tabular px-3 py-3 font-semibold text-slate-900">
              {score.score} <span className="font-normal text-slate-400">/ 100</span>
            </td>
            <td className="px-3 py-3 pr-5 text-xs text-slate-500">
              {score.isPreliminary
                ? `Vorläufig – mögliche Spanne ${score.range.min}–${score.range.max} Punkte, sobald offene Angaben geklärt sind.`
                : 'Alle Kriterien bewertet.'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
