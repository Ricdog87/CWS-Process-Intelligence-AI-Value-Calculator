import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, SearchX } from 'lucide-react';
import { DEPARTMENTS, departmentLabel } from '../../config/options';
import { buildPortfolioCsv, downloadTextFile, type PortfolioRow } from '../../lib/csv';
import { formatCurrency } from '../../lib/format';
import type { PortfolioFilter, SortKey } from '../../lib/portfolio';
import { navigate, paths } from '../../state/router';
import { useProcessStore } from '../../state/ProcessStore';
import { useToast } from '../../state/Toast';
import type { Department } from '../../types/process';
import { Button } from '../ui/Button';
import { DemoTag, PreliminaryBadge, PriorityBadge, SolutionBadge, StatusSelect } from '../ui/DomainBadges';
import { EmptyState } from '../ui/EmptyState';
import { ScoreBar } from '../ui/ScoreRing';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'priority', label: 'Priorität' },
  { value: 'score', label: 'Automation Score' },
  { value: 'capacityValue', label: 'Kapazitätswert p. a.' },
  { value: 'netBenefit', label: 'Netto-Nutzen Jahr 1 (inkl. Kapazität)' },
  { value: 'name', label: 'Name' },
];

interface SortHeaderProps {
  k: SortKey;
  children: string;
  filter: PortfolioFilter;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}

function SortHeader({ k, children, filter, onSort, align = 'left' }: SortHeaderProps) {
  const active = filter.sortKey === k;
  const Icon = !active ? ArrowUpDown : filter.direction === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={active ? (filter.direction === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={`px-2 py-2.5 font-medium ${align === 'right' ? 'text-right' : 'text-left'} ${k === 'name' ? 'pl-5' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 rounded hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}
      >
        {children}
        <Icon className={`size-3.5 ${active ? '' : 'text-slate-300'}`} aria-hidden />
      </button>
    </th>
  );
}

interface Props {
  rows: PortfolioRow[];
  totalCount: number;
  filter: PortfolioFilter;
  onFilterChange: (filter: PortfolioFilter) => void;
}

export function PortfolioTable({ rows, totalCount, filter, onFilterChange }: Props) {
  const { setStatus } = useProcessStore();
  const { notify } = useToast();

  const toggleSort = (key: SortKey) => {
    if (filter.sortKey === key) onFilterChange({ ...filter, direction: filter.direction === 'desc' ? 'asc' : 'desc' });
    else onFilterChange({ ...filter, sortKey: key, direction: key === 'name' ? 'asc' : 'desc' });
  };

  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`cws-opportunity-portfolio-${date}.csv`, buildPortfolioCsv(rows));
    notify(`${rows.length} Prozesse als CSV exportiert.`);
  };

  const filtersActive = filter.query !== '' || filter.department !== '';

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
            placeholder="Prozess oder Beschreibung suchen …"
            aria-label="Portfolio durchsuchen"
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm shadow-sm placeholder:text-slate-400 focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter.department}
            onChange={(e) => onFilterChange({ ...filter, department: e.target.value as Department | '' })}
            aria-label="Nach Fachbereich filtern"
            className="h-9 max-w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm shadow-sm focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none"
          >
            <option value="">Alle Fachbereiche</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={filter.sortKey}
            onChange={(e) => {
              const key = e.target.value as SortKey;
              onFilterChange({ ...filter, sortKey: key, direction: key === 'name' ? 'asc' : 'desc' });
            }}
            aria-label="Sortieren nach"
            className="h-9 max-w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm shadow-sm focus:border-ink-700 focus:ring-2 focus:ring-brand-300 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sortierung: {o.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            icon={filter.direction === 'desc' ? ArrowDown : ArrowUp}
            onClick={() => onFilterChange({ ...filter, direction: filter.direction === 'desc' ? 'asc' : 'desc' })}
            aria-label={filter.direction === 'desc' ? 'Absteigend sortiert – umschalten' : 'Aufsteigend sortiert – umschalten'}
            title={filter.direction === 'desc' ? 'Absteigend' : 'Aufsteigend'}
          />
          <Button size="sm" icon={Download} onClick={exportCsv} disabled={rows.length === 0}>
            CSV ({rows.length})
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={SearchX}
          title="Keine Treffer"
          text={filtersActive ? 'Kein Prozess entspricht den aktuellen Filtern.' : 'Es sind noch keine Prozesse erfasst.'}
          actions={
            filtersActive ? (
              <Button size="sm" onClick={() => onFilterChange({ ...filter, query: '', department: '' })}>
                Filter zurücksetzen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="scrollbar-thin scroll-hint-x relative overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <SortHeader k="name" filter={filter} onSort={toggleSort}>Prozess</SortHeader>
                <th scope="col" className="px-2 py-2.5 text-left font-medium">Fachbereich</th>
                <SortHeader k="score" filter={filter} onSort={toggleSort}>Automation Score</SortHeader>
                <th scope="col" className="px-2 py-2.5 text-left font-medium">Lösungsansatz</th>
                <SortHeader k="capacityValue" align="right" filter={filter} onSort={toggleSort}>Kapazitätswert p. a.</SortHeader>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">Invest einmalig</th>
                <SortHeader k="priority" filter={filter} onSort={toggleSort}>Priorität</SortHeader>
                <th scope="col" className="px-2 py-2.5 pr-5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ process: p, evaluation: e }) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(paths.processDetail(p.id))}
                  className="group cursor-pointer transition-colors hover:bg-brand-50/60"
                >
                  <td className="max-w-[15rem] px-2 py-3 pl-5">
                    <a
                      href={paths.processDetail(p.id)}
                      onClick={(ev) => ev.stopPropagation()}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.name}
                    </a>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.isDemo && <DemoTag />}
                      {e.isPreliminary && <PreliminaryBadge />}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-slate-600">{departmentLabel(p.department)}</td>
                  <td className="px-2 py-3">
                    <ScoreBar score={e.score.score} category={e.score.category.key} />
                  </td>
                  <td className="px-2 py-3">
                    <SolutionBadge approach={e.recommendation.approach} short />
                  </td>
                  <td className="tabular px-2 py-3 text-right font-medium whitespace-nowrap text-slate-900">
                    {formatCurrency(e.economics.annualCapacityValue)}
                  </td>
                  <td className="tabular px-2 py-3 text-right whitespace-nowrap text-slate-600">
                    {p.scenario.implementationCost === null ? '–' : formatCurrency(p.scenario.implementationCost)}
                  </td>
                  <td className="px-2 py-3">
                    <PriorityBadge level={e.priority.level} label={e.priority.label} score={e.priority.score} />
                  </td>
                  <td className="px-2 py-3 pr-5" onClick={(ev) => ev.stopPropagation()}>
                    <StatusSelect
                      compact
                      value={p.status}
                      label={`Status für ${p.name}`}
                      onChange={(status) => {
                        setStatus(p.id, status);
                        notify(`Status von „${p.name}“ aktualisiert.`);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {rows.length} von {totalCount} Prozessen · Kapazitätswert = freigesetzte Arbeitszeit × Stundensatz (wirtschaftliches Potenzial, kein Cash-Effekt).
        </p>
      )}
    </div>
  );
}
