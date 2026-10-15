import { ListChecks, Plus, RotateCcw, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DemoNotice } from '../components/layout/DemoNotice';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessCard } from '../components/processes/ProcessCard';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DEPARTMENTS, STATUSES } from '../config/options';
import { usePortfolioRows } from '../hooks';
import { DEFAULT_FILTER, filterAndSortPortfolio, type PortfolioFilter, type SortKey } from '../lib/portfolio';
import { paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';
import type { Department, ProcessStatus } from '../types/process';

const selectClass =
  'h-9 max-w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm shadow-sm focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none';

export function ProcessesPage() {
  const rows = usePortfolioRows();
  const { processes, resetDemoData } = useProcessStore();
  const { notify } = useToast();
  const [filter, setFilter] = useState<PortfolioFilter>({ ...DEFAULT_FILTER, sortKey: 'updated' });
  const visible = useMemo(() => filterAndSortPortfolio(rows, filter), [rows, filter]);
  const filtersActive = filter.query !== '' || filter.department !== '' || filter.status !== '';

  return (
    <>
      <PageHeader
        title="Use Cases"
        subtitle="Wiederkehrende Geschäftsprozesse erfassen, bewerten und verwalten. Jede Erfassung erhält sofort einen nachvollziehbaren Automation Score."
        actions={
          <LinkButton href={paths.processNew()} variant="primary" icon={Plus}>
            Neuer Prozess
          </LinkButton>
        }
      />
      {processes.some((p) => p.isDemo) && <DemoNotice />}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title="Noch keine Prozesse erfasst"
            text="Starten Sie mit einem Prozess, der häufig vorkommt und viel manuelle Zeit kostet – zum Beispiel Rechnungsprüfung oder die Bearbeitung von Serviceanfragen."
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
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                placeholder="Prozesse durchsuchen …"
                aria-label="Prozesse durchsuchen"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm shadow-sm placeholder:text-slate-400 focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filter.department}
                onChange={(e) => setFilter({ ...filter, department: e.target.value as Department | '' })}
                aria-label="Nach Fachbereich filtern"
                className={selectClass}
              >
                <option value="">Alle Fachbereiche</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as ProcessStatus | '' })}
                aria-label="Nach Status filtern"
                className={selectClass}
              >
                <option value="">Alle Status</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.sortKey}
                onChange={(e) => {
                  const sortKey = e.target.value as SortKey;
                  setFilter({ ...filter, sortKey, direction: sortKey === 'name' ? 'asc' : 'desc' });
                }}
                aria-label="Sortieren nach"
                className={selectClass}
              >
                <option value="updated">Zuletzt aktualisiert</option>
                <option value="score">Automation Score</option>
                <option value="priority">Priorität</option>
                <option value="capacityValue">Kapazitätswert</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon={SearchX}
                title="Keine Treffer"
                text="Kein Prozess entspricht den gewählten Filtern."
                actions={
                  filtersActive && (
                    <Button size="sm" onClick={() => setFilter({ ...filter, query: '', department: '', status: '' })}>
                      Filter zurücksetzen
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500">
                {visible.length} von {rows.length} Prozessen
              </p>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {visible.map(({ process, evaluation }) => (
                  <ProcessCard key={process.id} process={process} evaluation={evaluation} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
