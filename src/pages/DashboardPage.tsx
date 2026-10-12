import { Clock3, Euro, Layers, Plus, RotateCcw, Target, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoNotice, EstimateNote } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { PortfolioTable } from '../components/dashboard/PortfolioTable';
import { PriorityMatrix } from '../components/dashboard/PriorityMatrix';
import { StatusPipeline } from '../components/dashboard/StatusPipeline';
import { TopOpportunities } from '../components/dashboard/TopOpportunities';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { KpiCard } from '../components/ui/KpiCard';
import { FTE_HOURS_PER_YEAR } from '../config/scoringConfig';
import { usePortfolioRows } from '../hooks';
import { formatCompactCurrency, formatCurrency, formatNumber } from '../lib/format';
import { DEFAULT_FILTER, filterAndSortPortfolio, portfolioTotals, type PortfolioFilter } from '../lib/portfolio';
import { paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';

export function DashboardPage() {
  const rows = usePortfolioRows();
  const { processes, resetDemoData } = useProcessStore();
  const { notify } = useToast();
  const [filter, setFilter] = useState<PortfolioFilter>(DEFAULT_FILTER);

  const totals = useMemo(() => portfolioTotals(rows), [rows]);
  const visibleRows = useMemo(() => filterAndSortPortfolio(rows, filter), [rows, filter]);
  const hasDemo = processes.some((p) => p.isDemo);

  const header = (
    <PageHeader
      title="AI CoE Opportunity Dashboard"
      subtitle="Welche wiederkehrenden Prozesse eignen sich für Automatisierung oder KI – und welche sollte das AI Center of Excellence zuerst angehen?"
      actions={
        <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
          Prozess erfassen
        </LinkButton>
      }
    />
  );

  if (rows.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={Workflow}
            title="Noch keine Prozesse im Portfolio"
            text="Erfassen Sie den ersten wiederkehrenden Geschäftsprozess oder laden Sie die Demo-Daten, um die Anwendung kennenzulernen."
            actions={
              <>
                <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
                  Ersten Prozess erfassen
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

  return (
    <>
      {header}
      {hasDemo && <DemoNotice />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Registrierte Prozesse"
          icon={Layers}
          value={formatNumber(totals.count)}
          sub={`${totals.inDelivery} in Pilot oder Umsetzung · ${totals.preliminary} vorläufig bewertet`}
        />
        <KpiCard
          label="Hohes Potenzial"
          icon={Target}
          value={formatNumber(totals.highPotential)}
          sub={`Score ≥ 80 · weitere ${totals.goodPotential} mit gutem Potenzial (60–79)`}
          hint="Anzahl der Prozesse mit einem Automation Score von mindestens 80 Punkten."
        />
        <KpiCard
          label="Eingesparte Stunden p. a."
          icon={Clock3}
          value={`${formatNumber(totals.annualHoursSaved)} h`}
          sub={`≈ ${formatNumber(totals.fte, 1)} Vollzeitkräfte (FTE) an Kapazität`}
          hint={`Bearbeitungszeit plus vermiedene Nacharbeit, summiert über alle Prozesse. 1 FTE ≈ ${formatNumber(FTE_HOURS_PER_YEAR)} produktive Stunden pro Jahr. Freigesetzte Kapazität bedeutet keinen automatischen Stellenabbau.`}
        />
        <KpiCard
          label="Kapazitätswert p. a."
          icon={Euro}
          accent
          value={formatCompactCurrency(totals.annualCapacityValue)}
          sub={`Zusätzlich ${formatCompactCurrency(totals.annualQualityValue)} Qualitätsnutzen · ${formatCompactCurrency(totals.annualHardSavings)} harte Einsparungen`}
          hint={`Freigesetzte Bearbeitungszeit × interner Stundensatz: ${formatCurrency(totals.annualCapacityValue)}. Wirtschaftliches Potenzial – kein garantierter Cash-Effekt.`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Card
            title="Priorisierungsmatrix"
            subtitle="Umsetzungsreife (Automation Score) gegenüber jährlichem Netto-Wert – Farbe = Priorität"
          >
            <PriorityMatrix rows={rows} />
          </Card>
          <Card title="Pipeline nach Status" subtitle="Wo stehen die erfassten Chancen?">
            <StatusPipeline processes={processes} />
          </Card>
        </div>
        <Card className="self-start" title="Top-Chancen für das AI CoE" subtitle="Höchste Priorität, noch nicht umgesetzt">
          <TopOpportunities rows={rows} />
        </Card>
      </div>

      <Card
        className="mt-6"
        bodyClassName=""
        title="Opportunity-Portfolio"
        subtitle="Suchen, filtern, sortieren und Status pflegen – Klick auf eine Zeile öffnet die Detailbewertung."
      >
        <PortfolioTable rows={visibleRows} totalCount={rows.length} filter={filter} onFilterChange={setFilter} />
      </Card>

      <EstimateNote className="mt-4" />
    </>
  );
}
