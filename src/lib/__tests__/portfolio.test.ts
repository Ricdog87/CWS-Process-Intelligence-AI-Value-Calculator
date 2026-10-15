import { describe, expect, it } from 'vitest';
import { createDemoProcesses } from '../../data/demoData';
import { evaluateProcess } from '../evaluation';
import { DEFAULT_FILTER, filterAndSortPortfolio, portfolioTotals } from '../portfolio';
import { parseHash } from '../../state/router';

const rows = createDemoProcesses().map((process) => ({ process, evaluation: evaluateProcess(process) }));

describe('portfolio', () => {
  it('sorts by priority descending by default', () => {
    const sorted = filterAndSortPortfolio(rows, DEFAULT_FILTER);
    const scores = sorted.map((r) => r.evaluation.priority.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('sorts by automation score ascending', () => {
    const sorted = filterAndSortPortfolio(rows, { ...DEFAULT_FILTER, sortKey: 'score', direction: 'asc' });
    expect(sorted[0].evaluation.score.score).toBeLessThanOrEqual(sorted[sorted.length - 1].evaluation.score.score);
  });

  it('filters by department and search text', () => {
    expect(filterAndSortPortfolio(rows, { ...DEFAULT_FILTER, department: 'finance' }).every((r) => r.process.department === 'finance')).toBe(true);
    const found = filterAndSortPortfolio(rows, { ...DEFAULT_FILTER, query: 'rechnung' });
    expect(found.length).toBeGreaterThan(0);
    expect(filterAndSortPortfolio(rows, { ...DEFAULT_FILTER, query: 'xyz-nicht-vorhanden' })).toHaveLength(0);
  });

  it('aggregates totals', () => {
    const t = portfolioTotals(rows);
    expect(t.count).toBe(rows.length);
    expect(t.annualCapacityValue).toBeCloseTo(rows.reduce((s, r) => s + r.evaluation.economics.annualCapacityValue, 0));
    expect(t.fte).toBeCloseTo(t.annualHoursSaved / 1600);
  });

  it('handles an empty portfolio', () => {
    const t = portfolioTotals([]);
    expect(t.count).toBe(0);
    expect(t.fte).toBe(0);
  });
});

describe('router', () => {
  it.each([
    ['', { name: 'cockpit' }],
    ['#/', { name: 'cockpit' }],
    ['#/cockpit', { name: 'cockpit' }],
    ['#/cockpit/x', { name: 'not-found' }],
    ['#/dashboard', { name: 'dashboard' }],
    ['#/pricing', { name: 'pricing' }],
    ['#/processes', { name: 'processes' }],
    ['#/processes/new', { name: 'process-new' }],
    ['#/processes/abc', { name: 'process-detail', id: 'abc' }],
    ['#/processes/abc/edit', { name: 'process-edit', id: 'abc' }],
    ['#/calculator', { name: 'calculator' }],
    ['#/calculator/abc', { name: 'calculator', id: 'abc' }],
    ['#/methodology', { name: 'methodology' }],
    ['#/foo/bar', { name: 'not-found' }],
  ])('%s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
  });
});
