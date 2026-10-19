import { CheckCircle2, Cog, Download, Euro, Hourglass, Landmark, Lightbulb, Lock, Plus, RotateCcw, Scale, TrendingUp, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { CopilotVerdictBadge, DecisionBadge, TierBadge } from '../components/ai/AiBadges';
import { DemoNotice, EstimateNote } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DemoTag } from '../components/ui/DomainBadges';
import { EmptyState } from '../components/ui/EmptyState';
import { KpiCard } from '../components/ui/KpiCard';
import { PRICES_AS_OF } from '../config/aiPlatforms';
import { departmentLabel } from '../config/options';
import { usePortfolioRows } from '../hooks';
import { sortForCockpit, summarizeCockpit } from '../lib/cockpit';
import { buildPortfolioCsv, downloadTextFile } from '../lib/csv';
import type { AiDecisionKey } from '../lib/evaluation';
import { formatCompactCurrency, formatCurrency, formatMonths, formatNumber, formatPercent, formatSignedCurrency, formatUnitCost } from '../lib/format';
import { navigate, paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';

const DECISION_TILES: { key: AiDecisionKey; label: string; icon: typeof CheckCircle2; className: string }[] = [
  { key: 'go', label: 'Umsetzen', icon: CheckCircle2, className: 'text-emerald-700 bg-emerald-50' },
  { key: 'check', label: 'Prüfen', icon: Hourglass, className: 'text-amber-700 bg-amber-50' },
  { key: 'no_go', label: 'Nicht jetzt', icon: XCircle, className: 'text-rose-700 bg-rose-50' },
  { key: 'no_ai', label: 'Ohne KI automatisieren', icon: Cog, className: 'text-sky-700 bg-sky-50' },
];

function HBar({ label, value, max, valueLabel, tone = 'bg-[#2a78d6]', note }: { label: string; value: number; max: number; valueLabel: string; tone?: string; note?: string }) {
  const width = max > 0 ? Math.max(value > 0 ? 2 : 0, (Math.abs(value) / max) * 100) : 0;
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-slate-700">{label}</span>
        <span className="tabular shrink-0 font-semibold text-slate-900">{valueLabel}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </li>
  );
}

export function CockpitPage() {
  const rows = usePortfolioRows();
  const { processes, resetDemoData } = useProcessStore();
  const { notify } = useToast();
  const summary = useMemo(() => summarizeCockpit(rows), [rows]);
  const sorted = useMemo(() => sortForCockpit(rows), [rows]);

  const exportCsv = () => {
    downloadTextFile(`cws-ki-cockpit-${new Date().toISOString().slice(0, 10)}.csv`, buildPortfolioCsv(sorted));
    notify(`${sorted.length} ${sorted.length === 1 ? 'Use Case' : 'Use Cases'} als CSV exportiert.`);
  };

  const header = (
    <PageHeader
      title="KI-Investitionscockpit"
      subtitle="CWS-Gruppe · Wo lohnt sich KI – Microsoft 365 first, in sicherer Umgebung und mit belastbaren Kosten je Use Case."
      actions={
        <>
          <LinkButton href={paths.pricing()} icon={Scale}>
            Preise & Annahmen
          </LinkButton>
          <Button icon={Download} onClick={exportCsv} disabled={rows.length === 0}>
            CSV
          </Button>
          <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
            Use Case erfassen
          </LinkButton>
        </>
      }
    />
  );

  if (rows.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={Landmark}
            title="Noch keine Use Cases erfasst"
            text="Erfassen Sie einen wiederkehrenden Prozess oder laden Sie die Demo-Daten, um das Cockpit zu sehen."
            actions={
              <>
                <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
                  Use Case erfassen
                </LinkButton>
                <Button
                  icon={RotateCcw}
                  onClick={() => {
                    resetDemoData();
                    notify('Demo-Daten wurden geladen.');
                  }}
                >
                  Demo-Daten laden
                </Button>
              </>
            }
          />
        </Card>
      </>
    );
  }

  const maxChannel = Math.max(1, ...summary.costByChannel.map((c) => c.cost));
  const scenarioMax = Math.max(1, summary.scenarios.recommended, summary.scenarios.m365Only, summary.scenarios.cheapestIgnoringPolicy);
  const netRows = sorted.filter((r) => r.evaluation.ai.recommendation.llmNeeded);
  const maxNet = Math.max(1, ...netRows.map((r) => Math.abs(r.evaluation.economics.annualRecurringNetValue)));

  return (
    <>
      {header}
      {processes.some((p) => p.isDemo) && <DemoNotice />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Nutzen p. a."
          icon={TrendingUp}
          value={formatCompactCurrency(summary.grossBenefit)}
          sub={`${summary.inScope} umsetzbare KI-Use-Cases (Umsetzen + Prüfen)`}
          hint="Kapazitätswert + Qualitätsnutzen + harte Einsparungen der KI-Use-Cases mit Entscheidung „Umsetzen“ oder „Prüfen“. Kapazität ist wirtschaftliches Potenzial, kein Cash."
        />
        <KpiCard
          label="KI-Kosten p. a."
          icon={Euro}
          value={formatCompactCurrency(summary.aiRunCost)}
          sub={`${formatNumber(summary.grossBenefit > 0 ? (summary.aiRunCost / summary.grossBenefit) * 100 : 0, 1)} % des Nutzens · Tokens, Credits, Zusatzlizenzen`}
          hint="Laufende Kosten der empfohlenen Plattformen: zusätzliche Copilot-Lizenzen, Copilot Credits und Token-Kosten. Bereits vorhandene Copilot-Lizenzen sind nicht enthalten."
        />
        <KpiCard
          label="Netto-Nutzen p. a."
          icon={Landmark}
          accent
          value={formatCompactCurrency(summary.netRecurring)}
          sub={`nach KI- und Betriebskosten · Jahr 1: ${formatCompactCurrency(summary.firstYearNet)}`}
          footnote={`ROI Jahr 1: ${summary.roiFirstYearPct === null ? '–' : formatPercent(summary.roiFirstYearPct)} · Amortisation: ${formatMonths(summary.paybackMonths)}`}
        />
        <KpiCard
          label="M365-Tenant"
          icon={CheckCircle2}
          value={`${summary.m365Count} / ${summary.inScope}`}
          sub={`${summary.m365NoExtraCostCount} davon ohne Zusatzkosten (vorhandene Lizenzen)`}
          hint="Use Cases, deren empfohlene Plattform Microsoft 365 Copilot oder ein Copilot-Agent ist."
        />
        <KpiCard
          label="Sicher betrieben"
          icon={Lock}
          value={formatPercent(summary.inScope ? (summary.closedEnvironmentCount / summary.inScope) * 100 : 100)}
          sub={`Mehrkosten ggü. offenem Anbieter: ${formatCurrency(summary.securityPremium)} p. a.`}
          hint="Anteil der Empfehlungen im Microsoft-365- oder Azure-Tenant (Stufe A/B). Mehrkosten = Empfehlung minus günstigster Anbieter ohne Sicherheitsfilter (OpenRouter)."
        />
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DECISION_TILES.map((t) => {
          const d = summary.decisions[t.key];
          return (
            <li key={t.key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.className}`}>
                <t.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{t.label}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {d.count} <span className="text-xs font-normal text-slate-500">{d.count === 1 ? 'Use Case' : 'Use Cases'}</span>
                </p>
                {t.key !== 'no_ai' && d.count > 0 && <p className="tabular text-xs text-slate-500">Netto {formatSignedCurrency(d.netRecurring)} p.&nbsp;a.</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 rounded-xl border border-brand-400 bg-brand-50 p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Lightbulb className="size-4" aria-hidden /> Kernaussagen für die Geschäftsführung
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-800">
          {summary.insights.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-700" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="KI-Kosten nach Plattform" subtitle="Empfohlene Plattformen, laufende Kosten p. a.">
          {summary.costByChannel.length === 0 ? (
            <p className="text-sm text-slate-500">Keine umsetzbaren KI-Use-Cases.</p>
          ) : (
            <ul className="space-y-3">
              {summary.costByChannel.map((c) => (
                <HBar key={c.channel} label={c.label} value={c.cost} max={maxChannel} valueLabel={formatCurrency(c.cost)} note={`${c.count} Use Case(s)`} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Szenariovergleich KI-Betriebskosten" subtitle="Was kostet Sicherheit und Microsoft 365 first?">
          <ul className="space-y-3">
            <HBar label="Empfehlung (M365-first, sicher)" value={summary.scenarios.recommended} max={scenarioMax} valueLabel={formatCurrency(summary.scenarios.recommended)} tone="bg-ink-700" />
            <HBar
              label="Nur Microsoft 365 (Copilot & Agenten)"
              value={summary.scenarios.m365Only}
              max={scenarioMax}
              valueLabel={formatCurrency(summary.scenarios.m365Only)}
              note={`${summary.scenarios.m365OnlyCoverable} von ${summary.inScope} Use Cases mit M365 allein abdeckbar`}
            />
            <HBar
              label="Kostenminimum ohne Sicherheitsfilter"
              value={summary.scenarios.cheapestIgnoringPolicy}
              max={scenarioMax}
              valueLabel={formatCurrency(summary.scenarios.cheapestIgnoringPolicy)}
              tone="bg-[#e34948]"
              note="u. a. OpenRouter – für vertrauliche Daten nicht freigegeben"
            />
          </ul>
        </Card>

        <Card title="Netto-Nutzen je KI-Use-Case" subtitle="p. a. nach KI- und Betriebskosten">
          <ul className="space-y-3">
            {netRows.map(({ process: p, evaluation: e }) => {
              const v = e.economics.annualRecurringNetValue;
              return (
                <HBar
                  key={p.id}
                  label={p.name}
                  value={v}
                  max={maxNet}
                  valueLabel={formatSignedCurrency(v)}
                  tone={v >= 0 ? 'bg-[#2a78d6]' : 'bg-[#e34948]'}
                />
              );
            })}
          </ul>
        </Card>
      </div>

      <Card
        className="mt-6"
        bodyClassName=""
        title="Wo macht KI Sinn?"
        subtitle="Entscheidung, Copilot-Check, sichere Plattform und Kosten je Use Case – Klick öffnet die Detailbewertung."
      >
        <div className="scrollbar-thin scroll-hint-x relative overflow-x-auto">
          <table className="w-full min-w-[1020px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th scope="col" className="px-3 py-2.5 pl-5 text-left font-medium">Use Case</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">Entscheidung</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">Copilot?</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">Empfohlene Plattform</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">KI-Kosten p.&nbsp;a.</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">je Vorgang</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">Nutzen p.&nbsp;a.</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">Netto p.&nbsp;a.</th>
                <th scope="col" className="px-3 py-2.5 pr-5 text-right font-medium">Amortisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(({ process: p, evaluation: e }) => {
                const rec = e.ai.recommendation;
                const eco = e.economics;
                // Process must be optimised first: the platform is indicative, its cost is not part of the business case yet.
                const deferred = e.recommendation.approach === 'optimization_first';
                return (
                  <tr key={p.id} onClick={() => navigate(paths.processDetail(p.id))} className="cursor-pointer align-top transition-colors hover:bg-brand-50/60">
                    <td className="max-w-[15rem] px-3 py-3 pl-5">
                      <a href={paths.processDetail(p.id)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                        {departmentLabel(p.department)}
                        {p.isDemo && <DemoTag />}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <DecisionBadge decision={e.ai.decision.key} label={e.ai.decision.label} title={e.ai.decision.reason} />
                    </td>
                    <td className="px-3 py-3">
                      <CopilotVerdictBadge verdict={rec.copilot.verdict} title={rec.copilot.title} />
                    </td>
                    <td className="px-3 py-3">
                      {rec.llmNeeded && rec.recommended ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className={deferred ? 'text-slate-500' : 'text-slate-800'}>
                            {deferred && 'Nach Optimierung: '}
                            {rec.recommended.option.name}
                          </span>
                          <TierBadge tier={rec.recommended.option.tier} />
                        </div>
                      ) : (
                        <span className="text-slate-500">{rec.llmNeeded ? 'keine freigegebene Option' : 'Power Automate (ohne KI)'}</span>
                      )}
                    </td>
                    <td className="tabular px-3 py-3 text-right whitespace-nowrap">{deferred ? '–' : formatCurrency(eco.annualAiRunCost)}</td>
                    <td className="tabular px-3 py-3 text-right whitespace-nowrap">
                      {rec.llmNeeded && rec.recommended && e.ai.annualRunCost > 0 ? formatUnitCost(rec.recommended.costPerTransactionEur) : '–'}
                    </td>
                    <td className="tabular px-3 py-3 text-right whitespace-nowrap">{formatCurrency(eco.annualGrossBenefit)}</td>
                    <td className={`tabular px-3 py-3 text-right font-semibold whitespace-nowrap ${eco.annualRecurringNetValue < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                      {formatSignedCurrency(eco.annualRecurringNetValue)}
                    </td>
                    <td className="tabular px-3 py-3 pr-5 text-right whitespace-nowrap">{formatMonths(eco.paybackMonths)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Netto = Nutzen − Betriebskosten − KI-Nutzungskosten (laufend, ohne einmalige Implementierung). Preisstand: {PRICES_AS_OF} – Quellen unter „Preise & Annahmen“.
        </p>
      </Card>

      <EstimateNote className="mt-4" />
    </>
  );
}
