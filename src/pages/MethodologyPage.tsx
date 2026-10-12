import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { SolutionBadge } from '../components/ui/DomainBadges';
import {
  ANSWER_FACTORS,
  CRITERIA,
  EFFORT_BANDS,
  EFFORT_POINTS_ABOVE,
  EFFORT_POINTS_UNKNOWN,
  FREQUENCY_BANDS,
  FTE_HOURS_PER_YEAR,
  PRIORITY_LEVELS,
  PRIORITY_WEIGHTS,
  SCORE_CATEGORIES,
  VALUE_BANDS,
} from '../config/scoringConfig';
import { levelLabel, yesNoLabel, yesPartialNoLabel, yesUnknownNoLabel } from '../config/options';
import { formatCurrency, formatNumber } from '../lib/format';
import { RECOMMENDATION_RULES } from '../lib/recommendation';
import type { CriterionKey } from '../config/scoringConfig';

const pts = (weight: number, factor: number) => formatNumber(weight * factor, 1);

function answerTable(key: CriterionKey, weight: number): string {
  switch (key) {
    case 'frequency':
      return FREQUENCY_BANDS.map((b) => `≥ ${formatNumber(b.min)}: ${pts(weight, b.factor)}`).join(' · ');
    case 'repetitiveness':
    case 'digitalData': {
      const f = ANSWER_FACTORS[key];
      return (Object.keys(f) as (keyof typeof f)[]).map((a) => `${yesPartialNoLabel(a)}: ${pts(weight, f[a])}`).join(' · ');
    }
    case 'standardization':
    case 'exceptionRate': {
      const f = ANSWER_FACTORS[key];
      return (Object.keys(f) as (keyof typeof f)[]).map((a) => `${levelLabel(a)}: ${pts(weight, f[a])}`).join(' · ');
    }
    case 'integration':
    case 'compliance': {
      const f = ANSWER_FACTORS[key];
      const prefix = key === 'compliance' ? 'Bedenken ' : '';
      return (Object.keys(f) as (keyof typeof f)[]).map((a) => `${prefix}${yesUnknownNoLabel(a)}: ${pts(weight, f[a])}`).join(' · ');
    }
  }
}

const FORMULAS: [string, string][] = [
  ['Manueller Aufwand / Monat', 'Vorgänge × Bearbeitungsminuten ÷ 60'],
  ['Eingesparte Stunden / Monat', 'Manueller Aufwand × erwartete Zeitreduktion'],
  ['Freigesetzte Kapazität p. a.', 'Eingesparte Stunden / Monat × 12'],
  ['Kapazitätswert p. a.', 'Freigesetzte Kapazität × interner Stundensatz'],
  ['Nacharbeit / Monat', 'Vorgänge × Fehlerquote × Nacharbeitsminuten ÷ 60'],
  ['Qualitätsnutzen p. a.', 'Nacharbeit / Monat × erwartete Fehlerreduktion × 12 × Stundensatz'],
  ['Betriebskosten p. a.', 'Monatliche Betriebskosten × 12'],
  ['Netto-Nutzen Jahr 1', 'Kapazitätswert + Qualitätsnutzen + harte Einsparungen − Implementierung − Betriebskosten p. a.'],
  ['ROI Jahr 1', 'Netto-Nutzen Jahr 1 ÷ (Implementierung + Betriebskosten p. a.)'],
  ['Amortisation (Monate)', 'Implementierung ÷ ((Kapazitätswert + Qualitätsnutzen + harte Einsparungen − Betriebskosten p. a.) ÷ 12)'],
];

export function MethodologyPage() {
  return (
    <>
      <PageHeader
        title="Bewertungsmethodik"
        subtitle="Alle Regeln, Gewichte und Formeln dieser Anwendung – direkt aus der Konfiguration erzeugt. Damit bleibt jede Bewertung nachvollziehbar und kalibrierbar."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="1 · Automation Opportunity Score (0–100)" subtitle="Sieben gewichtete Kriterien, transparente Punkteregeln" bodyClassName="">
          <div className="scrollbar-thin relative overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">Kriterium</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Gewicht</th>
                  <th scope="col" className="px-3 py-2.5 pr-5 text-left font-medium">Punkte je Antwort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CRITERIA.map((c) => (
                  <tr key={c.key}>
                    <td className="px-5 py-3 align-top">
                      <p className="font-medium text-slate-900">{c.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.description}</p>
                    </td>
                    <td className="tabular px-3 py-3 text-right align-top font-semibold">{c.weight}</td>
                    <td className="px-3 py-3 pr-5 align-top text-xs text-slate-600">{answerTable(c.key, c.weight)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-5 py-2.5 font-semibold">Summe</td>
                  <td className="tabular px-3 py-2.5 text-right font-semibold">{CRITERIA.reduce((s, c) => s + c.weight, 0)}</td>
                  <td className="px-3 py-2.5 pr-5 text-xs text-slate-500">Frequenz in Vorgängen pro Monat</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Fehlende Angaben</span> erhalten 0 Punkte. „Unbekannt“ wird vorsichtig bewertet. In beiden Fällen
              ist das Ergebnis <span className="font-medium text-slate-900">vorläufig</span> und zeigt die mögliche Spanne (schlechtester bis bester Fall).
            </p>
            <p>
              <span className="font-medium text-slate-900">Unstrukturierte Informationen</span> ({yesNoLabel('yes')}/{yesNoLabel('no')}) fließen nicht in den Score ein, sondern in die Wahl des Lösungsansatzes.
            </p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="2 · Einstufung" subtitle="Score-Klassen">
            <ul className="space-y-2 text-sm">
              {SCORE_CATEGORIES.map((c, i) => {
                const upper = i === 0 ? 100 : SCORE_CATEGORIES[i - 1].min - 1;
                return (
                  <li key={c.key} className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{c.label}</span>
                    <span className="tabular text-slate-500">
                      {c.min}–{upper}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="3 · Lösungsansatz" subtitle="Feste Regeln in dieser Reihenfolge – die erste zutreffende Regel gilt">
            <ol className="space-y-3">
              {RECOMMENDATION_RULES.map((r) => (
                <li key={r.id} className="flex items-start gap-3 text-sm">
                  <span className="tabular mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{r.id}</span>
                  <div className="min-w-0">
                    <SolutionBadge approach={r.approach} />
                    <p className="mt-1 text-slate-600">{r.condition}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <Card title="4 · Wirtschaftlichkeitsrechnung" subtitle="Formeln des Wertrechners" bodyClassName="">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {FORMULAS.map(([label, formula]) => (
                <tr key={label}>
                  <th scope="row" className="w-2/5 px-5 py-2.5 text-left align-top font-medium text-slate-800">
                    {label}
                  </th>
                  <td className="px-3 py-2.5 pr-5 text-slate-600">{formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Finanzielle Grundsätze</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Freigesetzte Kapazität ist wirtschaftliches Potenzial – keine realisierte Einsparung.</li>
              <li>Harte (Cash-)Einsparungen werden separat erfasst und ausgewiesen.</li>
              <li>Bearbeitungszeit wird ohne Nacharbeit erfasst; Nacharbeit separat – keine Doppelzählung.</li>
              <li>Fehlende Werte werden als 0 gerechnet und als vorläufig markiert.</li>
              <li>1 FTE ≈ {formatNumber(FTE_HOURS_PER_YEAR)} produktive Stunden pro Jahr (nur zur Einordnung).</li>
            </ul>
          </div>
        </Card>

        <Card title="5 · Portfolio-Priorität" subtitle="Kombination aus Reife, Wert und Aufwand">
          <p className="text-sm text-slate-600">
            Prioritätsscore = Automation Score × {formatNumber(PRIORITY_WEIGHTS.readiness * 100)} % + Wertpunkte × {formatNumber(PRIORITY_WEIGHTS.value * 100)} % + Aufwandspunkte ×{' '}
            {formatNumber(PRIORITY_WEIGHTS.effort * 100)} %
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Wertpunkte (laufender Netto-Wert p. a.)</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {VALUE_BANDS.map((b) => (
                  <li key={b.min} className="flex justify-between gap-2">
                    <span>≥ {formatCurrency(b.min)}</span>
                    <span className="tabular font-medium">{b.points}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-2">
                  <span>≤ 0 €</span>
                  <span className="tabular font-medium">0</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Aufwandspunkte (Implementierung)</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {EFFORT_BANDS.map((b) => (
                  <li key={b.max} className="flex justify-between gap-2">
                    <span>≤ {formatCurrency(b.max)}</span>
                    <span className="tabular font-medium">{b.points}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-2">
                  <span>darüber</span>
                  <span className="tabular font-medium">{EFFORT_POINTS_ABOVE}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>keine Angabe (vorläufig)</span>
                  <span className="tabular font-medium">{EFFORT_POINTS_UNKNOWN}</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Einstufung: {PRIORITY_LEVELS.map((l) => `${l.label} ab ${l.min}`).join(' · ')}
          </p>
        </Card>
      </div>
    </>
  );
}
