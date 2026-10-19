import {
  Calculator,
  Clock3,
  Euro,
  FileQuestion,
  Gauge,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Timer,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CumulativeChart, WaterfallChart } from '../components/calculator/ValueCharts';
import { DemoNotice, EstimateNote } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { formValuesFromProcess } from '../components/processes/ProcessForm';
import { Badge } from '../components/ui/Badge';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CategoryBadge, PreliminaryBadge } from '../components/ui/DomainBadges';
import { EmptyState } from '../components/ui/EmptyState';
import { NumberField, SliderField } from '../components/ui/FormFields';
import { KpiCard } from '../components/ui/KpiCard';
import { HELP } from '../config/helpTexts';
import { FTE_HOURS_PER_YEAR } from '../config/scoringConfig';
import { usePortfolioRows } from '../hooks';
import {
  ECONOMIC_INPUT_LABELS,
  economicInputsOf,
  sensitivityScenarios,
  type EconomicInputs,
} from '../lib/calculations';
import { evaluateProcess } from '../lib/evaluation';
import {
  formatCurrency,
  formatHours,
  formatHoursExact,
  formatMonths,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
} from '../lib/format';
import { validateProcess, type FieldKey } from '../lib/validation';
import { navigate, paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';
import type { BusinessProcess } from '../types/process';

const METRIC_KEYS = ['transactionsPerMonth', 'minutesPerTransaction', 'hourlyCost', 'errorRatePct', 'reworkMinutesPerError'] as const;
const SCENARIO_KEYS = ['timeReductionPct', 'errorReductionPct', 'implementationCost', 'monthlyOperatingCost', 'annualHardSavings'] as const;

function splitInputs(i: EconomicInputs): Pick<BusinessProcess, 'metrics' | 'scenario'> {
  return {
    metrics: {
      transactionsPerMonth: i.transactionsPerMonth,
      minutesPerTransaction: i.minutesPerTransaction,
      hourlyCost: i.hourlyCost,
      errorRatePct: i.errorRatePct,
      reworkMinutesPerError: i.reworkMinutesPerError,
    },
    scenario: {
      timeReductionPct: i.timeReductionPct,
      errorReductionPct: i.errorReductionPct,
      implementationCost: i.implementationCost,
      monthlyOperatingCost: i.monthlyOperatingCost,
      annualHardSavings: i.annualHardSavings,
    },
  };
}

const n = (v: number | null, decimals = 0) => formatNumber(v ?? 0, decimals);

function FormulaRow({ label, formula, result, strong }: { label: string; formula: ReactNode; result: ReactNode; strong?: boolean }) {
  return (
    <tr className={strong ? 'bg-slate-50' : undefined}>
      <th scope="row" className={`px-5 py-2.5 text-left align-top text-sm ${strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
        {label}
      </th>
      <td className="tabular px-3 py-2.5 align-top text-xs text-slate-500">{formula}</td>
      <td className={`tabular px-3 py-2.5 pr-5 text-right align-top text-sm whitespace-nowrap ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{result}</td>
    </tr>
  );
}

function CompareLine({ label, value, total, negative }: { label: string; value: string; total?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${total ? 'mt-1 border-t border-slate-200 pt-2.5 font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={`tabular ${negative ? 'text-rose-700' : ''}`}>{value}</span>
    </div>
  );
}

function CalculatorWorkspace({ process }: { process: BusinessProcess }) {
  const { updateProcess, aiContext } = useProcessStore();
  const { notify } = useToast();
  const saved = useMemo(() => economicInputsOf(process), [process]);
  const [inputs, setInputs] = useState<EconomicInputs>(saved);

  const dirty = METRIC_KEYS.some((k) => !Object.is(inputs[k], saved[k])) || SCENARIO_KEYS.some((k) => !Object.is(inputs[k], saved[k]));

  const merged = useMemo<BusinessProcess>(() => ({ ...process, ...splitInputs(inputs) }), [process, inputs]);
  const evaluation = useMemo(() => evaluateProcess(merged, aiContext), [merged, aiContext]);
  const validation = useMemo(() => validateProcess(formValuesFromProcess(merged)), [merged]);
  const eco = evaluation.economics;
  const sensitivity = useMemo(() => sensitivityScenarios(inputs, eco.annualAiRunCost), [inputs, eco.annualAiRunCost]);
  const hasAiCost = eco.annualAiRunCost > 0;
  const aiPlatformName = evaluation.ai.recommendation.recommended?.option.name;

  const set = (key: keyof EconomicInputs) => (value: number | null) => setInputs((prev) => ({ ...prev, [key]: value }));
  const err = (key: FieldKey) => validation.errors[key];
  const hourly = inputs.hourlyCost ?? 0;
  const hasErrors = !validation.isValid;

  const save = () => {
    if (hasErrors) {
      notify('Bitte zuerst die markierten Eingaben korrigieren.', 'error');
      return;
    }
    updateProcess(process.id, splitInputs(inputs));
    notify('Szenario gespeichert – Dashboard und Bewertung sind aktualisiert.');
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {dirty ? <Badge tone="amber">Ungespeicherte Änderungen</Badge> : <Badge tone="green" icon={ShieldCheck}>Gespeicherter Stand</Badge>}
        {evaluation.isPreliminary && <PreliminaryBadge points={evaluation.openPoints} />}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button icon={RotateCcw} onClick={() => setInputs(saved)} disabled={!dirty}>
            Zurücksetzen
          </Button>
          <Button variant="primary" icon={Save} onClick={save} disabled={!dirty || hasErrors}>
            Szenario speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Prozess heute" subtitle="Volumen, Zeit und Kosten">
            <div className="space-y-4">
              <NumberField label="Vorgänge pro Monat" unit="Anzahl" tooltip={HELP.transactionsPerMonth} value={inputs.transactionsPerMonth} onChange={set('transactionsPerMonth')} error={err('metrics.transactionsPerMonth')} />
              <NumberField label="Bearbeitungszeit je Vorgang" unit="Min." hint="Ohne Nacharbeit" tooltip={HELP.minutesPerTransaction} value={inputs.minutesPerTransaction} onChange={set('minutesPerTransaction')} error={err('metrics.minutesPerTransaction')} />
              <NumberField label="Interner Stundensatz" unit="€/h" tooltip={HELP.hourlyCost} value={inputs.hourlyCost} onChange={set('hourlyCost')} error={err('metrics.hourlyCost')} warning={validation.warnings['metrics.hourlyCost']} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Fehlerquote" unit="%" tooltip={HELP.errorRatePct} value={inputs.errorRatePct} onChange={set('errorRatePct')} error={err('metrics.errorRatePct')} />
                <NumberField label="Nacharbeit" unit="Min." tooltip={HELP.reworkMinutesPerError} value={inputs.reworkMinutesPerError} onChange={set('reworkMinutesPerError')} error={err('metrics.reworkMinutesPerError')} />
              </div>
            </div>
          </Card>

          <Card title="Automatisierungsszenario" subtitle="Effekte und Kosten anpassen – alle Werte rechnen sofort neu">
            <div className="space-y-4">
              <SliderField label="Reduktion der Bearbeitungszeit" tooltip={HELP.timeReductionPct} value={inputs.timeReductionPct} onChange={set('timeReductionPct')} error={err('scenario.timeReductionPct')} warning={validation.warnings['scenario.timeReductionPct']} />
              <SliderField label="Reduktion der Fehler" tooltip={HELP.errorReductionPct} value={inputs.errorReductionPct} onChange={set('errorReductionPct')} error={err('scenario.errorReductionPct')} />
              <NumberField label="Einmalige Implementierungskosten" unit="€" tooltip={HELP.implementationCost} value={inputs.implementationCost} onChange={set('implementationCost')} error={err('scenario.implementationCost')} />
              <NumberField label="Betriebskosten ohne KI-Nutzung" unit="€/Mon." tooltip={HELP.monthlyOperatingCost} value={inputs.monthlyOperatingCost} onChange={set('monthlyOperatingCost')} error={err('scenario.monthlyOperatingCost')} />
              <NumberField label="Harte Einsparungen p. a. (optional)" unit="€/Jahr" hint="Nur Cash-wirksame Einsparungen" tooltip={HELP.annualHardSavings} value={inputs.annualHardSavings} onChange={set('annualHardSavings')} error={err('scenario.annualHardSavings')} />
            </div>
            <a href={paths.processEdit(process.id)} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
              <Pencil className="size-3.5" aria-hidden />
              Qualitative Bewertung bearbeiten
            </a>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {eco.missingInputs.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">Unvollständige Annahmen: </span>
                {eco.missingInputs.map((k) => ECONOMIC_INPUT_LABELS[k]).join(', ')} {eco.missingInputs.length === 1 ? 'fehlt' : 'fehlen'} und
                {eco.missingInputs.length === 1 ? ' wird' : ' werden'} als 0 gerechnet. Ergebnis ist vorläufig.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            <KpiCard
              label="Automation Score"
              icon={Gauge}
              value={
                <span className="inline-flex items-baseline gap-1">
                  {evaluation.score.score}
                  <span className="text-sm font-normal text-slate-400">/ 100</span>
                </span>
              }
              sub={<CategoryBadge category={evaluation.score.category.key} label={evaluation.score.category.label} />}
              hint="Ändert sich hier nur über das Volumen (Prozesshäufigkeit). Die qualitative Bewertung pflegen Sie im Prozess."
            />
            <KpiCard
              label="Eingesparte Stunden p. a."
              icon={Clock3}
              value={formatHours(eco.totalAnnualHoursSaved)}
              sub={`${formatHours(eco.annualHoursReleased)} Bearbeitung + ${formatHours(eco.annualAvoidedReworkHours)} Nacharbeit · ≈ ${formatNumber(eco.totalAnnualHoursSaved / FTE_HOURS_PER_YEAR, 2)} FTE`}
              hint="Bearbeitungszeit wird ohne Nacharbeit erfasst; Nacharbeit separat – daher keine Doppelzählung."
            />
            <KpiCard
              label="Kapazitätswert p. a."
              icon={Euro}
              accent
              value={formatCurrency(eco.annualCapacityValue)}
              sub="Freigesetzte Zeit × Stundensatz"
              footnote="Wirtschaftliches Potenzial – keine garantierte Kosteneinsparung."
            />
            <KpiCard
              label="Qualitätsnutzen p. a."
              icon={ShieldCheck}
              value={formatCurrency(eco.annualAvoidedReworkValue)}
              sub={`Vermiedene Nacharbeit: ${formatHours(eco.annualAvoidedReworkHours)}`}
              hint="Nacharbeitsstunden × erwartete Fehlerreduktion × 12 × Stundensatz. Ebenfalls Kapazität, kein Cash."
            />
            <KpiCard
              label="Netto-Nutzen Jahr 1"
              icon={TrendingUp}
              tone={eco.firstYearNetBenefit < 0 ? 'negative' : 'default'}
              value={formatSignedCurrency(eco.firstYearNetBenefit)}
              sub={`${eco.firstYearRoiPct === null ? 'ROI nicht sinnvoll berechenbar (keine Kosten)' : `ROI Jahr 1: ${formatPercent(eco.firstYearRoiPct)}`} · inkl. Kapazitätswert`}
              footnote={`Cash-Effekt Jahr 1 (nur harte Einsparungen): ${formatSignedCurrency(eco.cashFirstYearNet)}`}
              hint="Wirtschaftliche Sicht: Kapazitätswert + Qualitätsnutzen + harte Einsparungen − Implementierung − Betriebskosten Jahr 1 − KI-Nutzung Jahr 1. Enthält freigesetzte Kapazität, die nicht automatisch Cash ist."
            />
            <KpiCard
              label="Amortisation (wirtschaftlich)"
              icon={Timer}
              value={formatMonths(eco.paybackMonths)}
              sub={`Inkl. Kapazitätswert · Cash-Sicht: ${formatMonths(eco.cashPaybackMonths)}`}
              footnote={
                eco.paybackMonths !== null && eco.cashPaybackMonths === null
                  ? 'Nur über freigesetzte Kapazität – zahlt sich in Cash erst aus, wenn die Zeit nachweislich anders genutzt wird.'
                  : undefined
              }
              hint="Implementierungskosten ÷ monatlicher laufender Netto-Nutzen (inkl. Kapazitätswert). Die Cash-Sicht rechnet nur mit harten Einsparungen. „Nicht erreichbar“, wenn der laufende Nutzen die laufenden Kosten nicht übersteigt."
            />
          </div>

          <Card title="Wirtschaftliche Sicht vs. Cash-Sicht" subtitle="Freigesetzte Kapazität ist kein automatischer Finanzeffekt">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="size-2.5 rounded-sm bg-[#2a78d6]" aria-hidden />
                  Wirtschaftliche Sicht (inkl. Kapazität)
                </h3>
                <CompareLine label="Kapazitätswert" value={formatCurrency(eco.annualCapacityValue)} />
                <CompareLine label="Qualitätsnutzen" value={formatCurrency(eco.annualAvoidedReworkValue)} />
                <CompareLine label="Harte Einsparungen" value={formatCurrency(eco.annualHardSavings)} />
                <CompareLine label="Implementierung" value={formatSignedCurrency(-eco.implementationCost)} />
                <CompareLine label="Betriebskosten Jahr 1" value={formatSignedCurrency(-eco.annualOperatingCosts)} />
                {hasAiCost && <CompareLine label="KI-Nutzung Jahr 1" value={formatSignedCurrency(-eco.annualAiRunCost)} />}
                <CompareLine label="Netto-Nutzen Jahr 1" value={formatSignedCurrency(eco.firstYearNetBenefit)} total negative={eco.firstYearNetBenefit < 0} />
                <p className="mt-2 text-xs text-slate-500">Laufender Netto-Wert ab Jahr 2: {formatSignedCurrency(eco.annualRecurringNetValue)} p. a.</p>
              </div>
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="size-2.5 rounded-sm bg-[#1baf7a]" aria-hidden />
                  Cash-Sicht (nur harte Einsparungen)
                </h3>
                <CompareLine label="Harte Einsparungen" value={formatCurrency(eco.annualHardSavings)} />
                <CompareLine label="Implementierung" value={formatSignedCurrency(-eco.implementationCost)} />
                <CompareLine label="Betriebskosten Jahr 1" value={formatSignedCurrency(-eco.annualOperatingCosts)} />
                {hasAiCost && <CompareLine label="KI-Nutzung Jahr 1" value={formatSignedCurrency(-eco.annualAiRunCost)} />}
                <CompareLine label="Cash-Effekt Jahr 1" value={formatSignedCurrency(eco.cashFirstYearNet)} total negative={eco.cashFirstYearNet < 0} />
                <p className="mt-2 text-xs text-slate-500">
                  Ein Cash-Effekt aus freigesetzter Kapazität entsteht erst, wenn die Zeit nachweislich anders genutzt wird – z. B. Wachstum ohne
                  Neueinstellung, weniger externe Kräfte oder Überstunden.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <Card title="Wertbeitrag im ersten Jahr" subtitle="Vom Bruttonutzen zum Netto-Nutzen">
              <WaterfallChart economics={eco} />
            </Card>
            <Card title="Kumulierter Netto-Nutzen" subtitle="36 Monate, inkl. Kapazitätswert">
              <CumulativeChart economics={eco} />
            </Card>
          </div>

          <Card title="Sensitivität" subtitle="Was, wenn nur ein Teil der erwarteten Effekte eintritt? Kosten bleiben gleich." bodyClassName="">
            <div className="scrollbar-thin scroll-hint-x relative overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="px-5 py-2.5 text-left font-medium">Szenario</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Stunden p. a.</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Kapazitätswert p. a.</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Netto-Nutzen Jahr 1</th>
                    <th scope="col" className="px-3 py-2.5 pr-5 text-right font-medium">Amortisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sensitivity.map(({ factor, result }) => (
                    <tr key={factor} className={factor === 1 ? 'bg-brand-50/60' : undefined}>
                      <th scope="row" className="px-5 py-2.5 text-left font-medium whitespace-nowrap text-slate-800">
                        {factor === 1 ? 'Basis (100 % der Effekte)' : factor === 0.75 ? 'Vorsichtig (75 %)' : 'Konservativ (50 %)'}
                      </th>
                      <td className="tabular px-3 py-2.5 text-right whitespace-nowrap">{formatHours(result.totalAnnualHoursSaved)}</td>
                      <td className="tabular px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(result.annualCapacityValue)}</td>
                      <td className={`tabular px-3 py-2.5 text-right font-medium whitespace-nowrap ${result.firstYearNetBenefit < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                        {formatSignedCurrency(result.firstYearNetBenefit)}
                      </td>
                      <td className="tabular px-3 py-2.5 pr-5 text-right whitespace-nowrap">{formatMonths(result.paybackMonths)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Rechenweg" subtitle="Alle Formeln mit Ihren aktuellen Werten – transparent und nachvollziehbar" bodyClassName="">
            <div className="scrollbar-thin scroll-hint-x relative overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <tbody className="divide-y divide-slate-100">
                  <FormulaRow
                    label="Manueller Aufwand / Monat"
                    formula={`${n(inputs.transactionsPerMonth)} Vorgänge × ${n(inputs.minutesPerTransaction, 1)} Min. ÷ 60`}
                    result={formatHoursExact(eco.monthlyManualHours)}
                  />
                  <FormulaRow
                    label="Eingesparte Stunden / Monat"
                    formula={`${formatHoursExact(eco.monthlyManualHours)} × ${formatPercent(inputs.timeReductionPct ?? 0)} Zeitreduktion`}
                    result={formatHoursExact(eco.savedHoursPerMonth)}
                  />
                  <FormulaRow label="Freigesetzte Kapazität p. a." formula={`${formatHoursExact(eco.savedHoursPerMonth)} × 12`} result={formatHoursExact(eco.annualHoursReleased)} />
                  <FormulaRow
                    label="Kapazitätswert p. a."
                    formula={`${formatHoursExact(eco.annualHoursReleased)} × ${formatNumber(hourly, 2)} €/h`}
                    result={formatCurrency(eco.annualCapacityValue)}
                  />
                  <FormulaRow
                    label="Nacharbeit heute / Monat"
                    formula={`${n(inputs.transactionsPerMonth)} × ${formatPercent(inputs.errorRatePct ?? 0, 1)} Fehler × ${n(inputs.reworkMinutesPerError, 1)} Min. ÷ 60`}
                    result={formatHoursExact(eco.monthlyReworkHours)}
                  />
                  <FormulaRow
                    label="Qualitätsnutzen p. a."
                    formula={`${formatHoursExact(eco.monthlyReworkHours)} × ${formatPercent(inputs.errorReductionPct ?? 0)} × 12 × ${formatNumber(hourly, 2)} €/h`}
                    result={formatCurrency(eco.annualAvoidedReworkValue)}
                  />
                  <FormulaRow label="Betriebskosten p. a." formula={`${formatCurrency(inputs.monthlyOperatingCost ?? 0)} × 12`} result={formatCurrency(eco.annualOperatingCosts)} />
                  {hasAiCost && (
                    <FormulaRow
                      label={'KI-Nutzung p. a.'}
                      formula={aiPlatformName ? `Empfohlene Plattform: ${aiPlatformName} – Herleitung unter „Zur Bewertung“` : 'Empfohlene KI-Plattform'}
                      result={formatCurrency(eco.annualAiRunCost)}
                    />
                  )}
                  <FormulaRow
                    strong
                    label="Netto-Nutzen Jahr 1"
                    formula={`${formatCurrency(eco.annualCapacityValue)} + ${formatCurrency(eco.annualAvoidedReworkValue)} + ${formatCurrency(eco.annualHardSavings)} − ${formatCurrency(eco.implementationCost)} − ${formatCurrency(eco.annualOperatingCosts)}${hasAiCost ? ` − ${formatCurrency(eco.annualAiRunCost)}` : ''}`}
                    result={formatSignedCurrency(eco.firstYearNetBenefit)}
                  />
                  <FormulaRow
                    label="ROI Jahr 1"
                    formula={eco.firstYearCosts > 0 ? `${formatSignedCurrency(eco.firstYearNetBenefit)} ÷ ${formatCurrency(eco.firstYearCosts)} Kosten Jahr 1` : 'Keine Kosten erfasst – ROI nicht sinnvoll'}
                    result={eco.firstYearRoiPct === null ? '–' : formatPercent(eco.firstYearRoiPct)}
                  />
                  <FormulaRow
                    label="Amortisation"
                    formula={
                      eco.paybackMonths === null
                        ? 'Laufender Netto-Nutzen ≤ 0 – Investition wird nicht zurückverdient'
                        : `${formatCurrency(eco.implementationCost)} ÷ ${formatCurrency(eco.annualRecurringNetValue / 12)} laufender Netto-Nutzen / Monat`
                    }
                    result={formatMonths(eco.paybackMonths)}
                  />
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-5 pt-3 text-xs text-slate-500">
              Stunden im Rechenweg auf zwei Nachkommastellen gerundet; gerechnet wird intern ungerundet.
            </p>
            <EstimateNote className="px-5 pt-1 pb-3" />
          </Card>
        </div>
      </div>
    </>
  );
}

export function CalculatorPage({ id }: { id?: string }) {
  const rows = usePortfolioRows();
  const { getProcess, resetDemoData } = useProcessStore();
  const { notify } = useToast();
  const process = id ? getProcess(id) : undefined;

  const ranked = useMemo(() => [...rows].sort((a, b) => b.evaluation.priority.score - a.evaluation.priority.score), [rows]);

  // Without a selection, open the highest-priority process.
  useEffect(() => {
    if (!id && ranked.length > 0) navigate(paths.calculator(ranked[0].process.id), { replace: true });
  }, [id, ranked]);

  const selector = rows.length > 0 && (
    <label className="flex w-full min-w-0 items-center gap-2 text-sm md:w-[26rem]">
      <span className="font-medium text-slate-600 max-sm:sr-only">Prozess</span>
      <select
        value={process?.id ?? ''}
        onChange={(e) => navigate(paths.calculator(e.target.value))}
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium shadow-sm focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none"
      >
        {!process && <option value="">Bitte auswählen</option>}
        {ranked.map(({ process: p }) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );

  const header = (
    <PageHeader
      title="Business Case"
      subtitle="Zeit, Kapazität und wirtschaftliches Potenzial für einen Prozess interaktiv berechnen. Alle Ergebnisse sind Schätzungen bis zur Validierung."
      actions={
        <>
          {selector}
          {process && (
            <LinkButton href={paths.processDetail(process.id)} variant="ghost">
              Zur Bewertung
            </LinkButton>
          )}
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
            icon={Calculator}
            title="Kein Prozess für eine Berechnung vorhanden"
            text="Erfassen Sie einen Prozess oder laden Sie die Demo-Daten, um Szenarien zu berechnen."
            actions={
              <>
                <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
                  Prozess erfassen
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

  if (id && !process) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={FileQuestion}
            title="Prozess nicht gefunden"
            text="Bitte wählen Sie oben einen anderen Prozess aus."
          />
        </Card>
      </>
    );
  }

  if (!process) return header;

  return (
    <>
      {header}
      {process.isDemo && <DemoNotice text={`„${process.name}“ ist ein fiktiver Demo-Prozess – alle Werte sind illustrativ.`} />}
      <CalculatorWorkspace key={process.id} process={process} />
    </>
  );
}
