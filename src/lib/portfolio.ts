/** Portfolio filtering, sorting and aggregation – pure functions for dashboard and lists. */
import { FTE_HOURS_PER_YEAR } from '../config/scoringConfig';
import { departmentLabel } from '../config/options';
import type { Department, ProcessStatus } from '../types/process';
import type { PortfolioRow } from './csv';

export type SortKey = 'priority' | 'score' | 'capacityValue' | 'netBenefit' | 'name' | 'updated';
export type SortDirection = 'asc' | 'desc';

export interface PortfolioFilter {
  query: string;
  department: Department | '';
  status: ProcessStatus | '';
  sortKey: SortKey;
  direction: SortDirection;
}

export const DEFAULT_FILTER: PortfolioFilter = {
  query: '',
  department: '',
  status: '',
  sortKey: 'priority',
  direction: 'desc',
};

const sortValue: Record<SortKey, (row: PortfolioRow) => number | string> = {
  priority: (r) => r.evaluation.priority.score,
  score: (r) => r.evaluation.score.score,
  capacityValue: (r) => r.evaluation.economics.annualCapacityValue,
  netBenefit: (r) => r.evaluation.economics.firstYearNetBenefit,
  name: (r) => r.process.name.toLocaleLowerCase('de-DE'),
  updated: (r) => r.process.updatedAt,
};

export function filterAndSortPortfolio(rows: PortfolioRow[], filter: PortfolioFilter): PortfolioRow[] {
  const q = filter.query.trim().toLocaleLowerCase('de-DE');
  const filtered = rows.filter(({ process: p }) => {
    if (filter.department && p.department !== filter.department) return false;
    if (filter.status && p.status !== filter.status) return false;
    if (!q) return true;
    return [p.name, p.description, departmentLabel(p.department)].some((text) => text.toLocaleLowerCase('de-DE').includes(q));
  });

  const get = sortValue[filter.sortKey];
  const factor = filter.direction === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb, 'de-DE') : Number(va) - Number(vb);
    // Stable tie-breaker: name ascending.
    return cmp !== 0 ? cmp * factor : a.process.name.localeCompare(b.process.name, 'de-DE');
  });
}

export interface PortfolioTotals {
  count: number;
  highPotential: number;
  goodPotential: number;
  annualHoursSaved: number;
  fte: number;
  annualCapacityValue: number;
  annualQualityValue: number;
  annualHardSavings: number;
  firstYearNetBenefit: number;
  inDelivery: number;
  preliminary: number;
}

export function portfolioTotals(rows: PortfolioRow[]): PortfolioTotals {
  const totals: PortfolioTotals = {
    count: rows.length,
    highPotential: 0,
    goodPotential: 0,
    annualHoursSaved: 0,
    fte: 0,
    annualCapacityValue: 0,
    annualQualityValue: 0,
    annualHardSavings: 0,
    firstYearNetBenefit: 0,
    inDelivery: 0,
    preliminary: 0,
  };
  for (const { process: p, evaluation: e } of rows) {
    if (e.score.category.key === 'high') totals.highPotential++;
    if (e.score.category.key === 'good') totals.goodPotential++;
    totals.annualHoursSaved += e.economics.totalAnnualHoursSaved;
    totals.annualCapacityValue += e.economics.annualCapacityValue;
    totals.annualQualityValue += e.economics.annualAvoidedReworkValue;
    totals.annualHardSavings += e.economics.annualHardSavings;
    totals.firstYearNetBenefit += e.economics.firstYearNetBenefit;
    if (p.status === 'pilot' || p.status === 'implemented') totals.inDelivery++;
    if (e.isPreliminary) totals.preliminary++;
  }
  totals.fte = totals.annualHoursSaved / FTE_HOURS_PER_YEAR;
  return totals;
}
