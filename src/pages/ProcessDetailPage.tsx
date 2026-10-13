import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  CircleHelp,
  FileQuestion,
  Flag,
  Hourglass,
  Lightbulb,
  Pencil,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { DemoNotice, EstimateNote } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { DeleteProcessButton } from '../components/processes/DeleteProcessButton';
import { InsightList } from '../components/processes/InsightList';
import { ScoreBreakdown } from '../components/processes/ScoreBreakdown';
import { Badge } from '../components/ui/Badge';
import { LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CategoryBadge, DemoTag, PriorityBadge, solutionIcon, StatusSelect } from '../components/ui/DomainBadges';
import { EmptyState } from '../components/ui/EmptyState';
import { InfoTip } from '../components/ui/InfoTip';
import { ScoreRing } from '../components/ui/ScoreRing';
import { departmentLabel, systemLabel } from '../config/options';
import { formatCurrency, formatDate, formatHours, formatMonths, formatNumber, formatPercent, formatSignedCurrency } from '../lib/format';
import { paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';

function Stat({ label, value, sub, negative }: { label: string; value: ReactNode; sub?: ReactNode; negative?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight ${negative ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Definition({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="min-w-0 hyphens-auto text-slate-500">{label}</dt>
      <dd className="tabular shrink-0 text-right font-medium whitespace-nowrap text-slate-900">{value}</dd>
    </div>
  );
}

const orDash = (v: number | null, f: (n: number) => string) => (v === null ? '–' : f(v));

export function ProcessDetailPage({ id }: { id: string }) {
  const { getProcess, evaluations, setStatus } = useProcessStore();
  const { notify } = useToast();
  const process = getProcess(id);
  const evaluation = evaluations.get(id);

  if (!process || !evaluation) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Prozess nicht gefunden"
          text="Der Prozess existiert nicht (mehr). Möglicherweise wurde er gelöscht."
          actions={<LinkButton href={paths.processes()}>Zur Prozessliste</LinkButton>}
        />
      </Card>
    );
  }

  const { score, recommendation: rec, economics: eco, priority, nextStep } = evaluation;
  const SolutionIcon = solutionIcon(rec.approach);
  const m = process.metrics;
  const s = process.scenario;

  return (
    <>
      <PageHeader
        back={{ href: paths.processes(), label: 'Zur Prozessliste' }}
        title={process.name}
        subtitle={process.description || undefined}
        meta={
          <>
            <Badge tone="outline">{departmentLabel(process.department)}</Badge>
            {process.isDemo && <DemoTag />}
            <span className="text-xs text-slate-500">
              Erfasst {formatDate(process.createdAt)} · Aktualisiert {formatDate(process.updatedAt)}
            </span>
          </>
        }
        actions={
          <>
            <StatusSelect
              value={process.status}
              label="Status im Portfolio"
              onChange={(status) => {
                setStatus(process.id, status);
                notify('Status aktualisiert.');
              }}
            />
            <LinkButton href={paths.calculator(process.id)} variant="dark" icon={Calculator}>
              Wertrechner
            </LinkButton>
            <LinkButton href={paths.processEdit(process.id)} icon={Pencil}>
              Bearbeiten
            </LinkButton>
            <DeleteProcessButton process={process} redirectTo={paths.processes()} />
          </>
        }
      />

      {process.isDemo && <DemoNotice />}

      {evaluation.isPreliminary && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <Hourglass className="size-4" aria-hidden />
            Vorläufige Bewertung – folgende Angaben fehlen oder sind unsicher:
          </p>
          <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 pl-6 sm:grid-cols-2">
            {evaluation.openPoints.map((p) => (
              <li key={p} className="list-disc">
                {p}
              </li>
            ))}
          </ul>
          <a href={paths.processEdit(process.id)} className="mt-2 inline-flex items-center gap-1 pl-6 font-medium underline-offset-2 hover:underline">
            Angaben ergänzen <ArrowRight className="size-3.5" aria-hidden />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Automation Opportunity Score" subtitle="Gewichtete Bewertung von 7 Kriterien">
          <div className="flex flex-col items-center text-center">
            <ScoreRing score={score.score} category={score.category.key} size={140} stroke={12} />
            <div className="mt-3">
              <CategoryBadge category={score.category.key} label={score.category.label} />
            </div>
            {score.isPreliminary && (
              <p className="mt-2 text-xs text-amber-700">
                Vorläufig · mögliche Spanne {score.range.min}–{score.range.max}
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                Portfolio-Priorität
                <InfoTip
                  label="Wie wird die Priorität berechnet?"
                  content={
                    <span className="block space-y-1">
                      {priority.explanation.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                      <span className="block pt-1 font-semibold">= Prioritätsscore {priority.score}</span>
                    </span>
                  }
                />
              </span>
              <PriorityBadge level={priority.level} label={priority.label} score={priority.score} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Kombiniert Umsetzungsreife, wirtschaftlichen Wert und Umsetzungsaufwand.</p>
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Empfohlener Lösungsansatz"
          subtitle={`Regelbasiert ermittelt (Regel ${rec.ruleId}) – keine simulierte KI-Entscheidung`}
          actions={rec.isPreliminary ? <Badge tone="amber" icon={Hourglass}>Vorläufig</Badge> : undefined}
        >
          {!rec.decided ? (
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <CircleHelp className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">Lösungsansatz noch offen</h3>
                <p className="mt-0.5 text-sm text-slate-600">
                  Erst wenn „Regelbasiert und repetitiv“ und „Unstrukturierte Informationen“ bewertet sind, lässt sich zwischen klassischer
                  Automatisierung, KI und Hybrid unterscheiden.
                </p>
                <p className="mt-2 text-xs text-slate-500">Vorläufige Tendenz auf Basis von Annahmen: {rec.label}</p>
                <a href={paths.processEdit(process.id)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900">
                  Bewertung ergänzen <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
          ) : (
          <>
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-ink-900">
              <SolutionIcon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">{rec.label}</h3>
              <p className="mt-0.5 text-sm text-slate-600">{rec.description}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Begründung</h4>
              <InsightList items={rec.reasons} icon={CheckCircle2} iconClassName="text-emerald-600" empty="–" />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Zu beachten</h4>
              <InsightList items={rec.considerations} icon={Lightbulb} iconClassName="text-amber-600" empty="Keine besonderen Hinweise." />
            </div>
          </div>
          {rec.assumptions.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">Annahmen wegen fehlender Angaben: </span>
              {rec.assumptions.join(' ')}
            </div>
          )}
          </>
          )}
        </Card>
      </div>

      <section className="mt-6 rounded-xl border border-brand-400 bg-brand-50 p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-400 text-ink-900">
            <Flag className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold tracking-wide text-ink-700 uppercase">Empfohlener nächster Schritt</h2>
            <p className="mt-1 text-base font-semibold text-ink-900">{nextStep.title}</p>
            {nextStep.details.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                {nextStep.details.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Stärken" subtitle="Was für eine Automatisierung spricht">
          <InsightList items={score.strengths} icon={CheckCircle2} iconClassName="text-emerald-600" empty="Noch keine ausgeprägten Stärken erkennbar." />
        </Card>
        <Card title="Herausforderungen" subtitle="Was die Umsetzung erschwert">
          <InsightList items={score.challenges} icon={TriangleAlert} iconClassName="text-amber-600" empty="Keine wesentlichen Hürden erkannt." />
        </Card>
      </div>

      <Card className="mt-6" bodyClassName="" title="Score-Herleitung" subtitle="Jedes Kriterium mit Angabe, Punkten und angewandter Regel">
        <ScoreBreakdown score={score} />
      </Card>

      <Card
        className="mt-6"
        title="Wirtschaftliches Potenzial"
        subtitle="Schätzung auf Basis der erfassten Annahmen"
        actions={
          <LinkButton href={paths.calculator(process.id)} size="sm" variant="dark" icon={Calculator}>
            Szenario im Wertrechner anpassen
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Eingesparte Stunden p. a." value={formatHours(eco.totalAnnualHoursSaved)} sub={`≈ ${formatNumber(eco.savedHoursPerMonth, 0)} h Bearbeitung / Monat`} />
          <Stat label="Kapazitätswert p. a." value={formatCurrency(eco.annualCapacityValue)} sub="Potenzial, kein Cash" />
          <Stat label="Qualitätsnutzen p. a." value={formatCurrency(eco.annualAvoidedReworkValue)} sub="Vermiedene Nacharbeit" />
          <Stat label="Harte Einsparungen p. a." value={formatCurrency(eco.annualHardSavings)} sub="Cash-wirksam" />
          <Stat
            label="Netto-Nutzen Jahr 1"
            value={formatSignedCurrency(eco.firstYearNetBenefit)}
            negative={eco.firstYearNetBenefit < 0}
            sub={`${eco.firstYearRoiPct === null ? 'ROI nicht berechenbar' : `ROI ${formatPercent(eco.firstYearRoiPct)}`} · inkl. Kapazität · Cash: ${formatSignedCurrency(eco.cashFirstYearNet)}`}
          />
          <Stat label="Amortisation" value={formatMonths(eco.paybackMonths)} sub="inkl. Kapazitätswert" />
        </div>
        <EstimateNote className="mt-4" />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Systeme">
          {process.systems.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Systeme angegeben.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {process.systems.map((sys) => (
                <Badge key={sys} tone="outline">
                  {sys === 'other' && process.otherSystems ? process.otherSystems : systemLabel(sys)}
                </Badge>
              ))}
            </div>
          )}
        </Card>
        <Card title="Prozesskennzahlen">
          <dl className="divide-y divide-slate-100">
            <Definition label="Vorgänge pro Monat" value={orDash(m.transactionsPerMonth, (v) => formatNumber(v))} />
            <Definition label="Bearbeitungszeit je Vorgang" value={orDash(m.minutesPerTransaction, (v) => `${formatNumber(v, 1)} Min.`)} />
            <Definition label="Interner Stundensatz" value={orDash(m.hourlyCost, (v) => `${formatNumber(v, 2)} €`)} />
            <Definition label="Fehlerquote" value={orDash(m.errorRatePct, (v) => formatPercent(v, 1))} />
            <Definition label="Nacharbeit je Fehler" value={orDash(m.reworkMinutesPerError, (v) => `${formatNumber(v, 1)} Min.`)} />
          </dl>
        </Card>
        <Card title="Automatisierungsszenario">
          <dl className="divide-y divide-slate-100">
            <Definition label="Zeitreduktion" value={orDash(s.timeReductionPct, (v) => formatPercent(v))} />
            <Definition label="Fehlerreduktion" value={orDash(s.errorReductionPct, (v) => formatPercent(v))} />
            <Definition label="Implementierungskosten" value={orDash(s.implementationCost, (v) => formatCurrency(v))} />
            <Definition label="Betriebskosten / Monat" value={orDash(s.monthlyOperatingCost, (v) => formatCurrency(v))} />
            <Definition label="Harte Einsparungen p. a." value={orDash(s.annualHardSavings, (v) => formatCurrency(v))} />
          </dl>
        </Card>
      </div>
    </>
  );
}
