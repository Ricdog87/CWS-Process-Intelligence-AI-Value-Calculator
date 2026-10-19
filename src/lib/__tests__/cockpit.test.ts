import { describe, expect, it } from 'vitest';
import { createDemoProcesses } from '../../data/demoData';
import { DECISION_ORDER, sortForCockpit, summarizeCockpit } from '../cockpit';
import { evaluateProcess } from '../evaluation';

const rows = createDemoProcesses().map((process) => ({ process, evaluation: evaluateProcess(process) }));
const s = summarizeCockpit(rows);

describe('cockpit summary', () => {
  it('counts every use case exactly once across decisions', () => {
    const sum = DECISION_ORDER.reduce((n, k) => n + s.decisions[k].count, 0);
    expect(sum).toBe(rows.length);
    expect(s.inScope).toBe(s.decisions.go.count + s.decisions.check.count);
  });

  it('keeps totals internally consistent', () => {
    expect(s.netRecurring).toBeCloseTo(s.grossBenefit - s.otherOperatingCost - s.aiRunCost);
    expect(s.costByChannel.reduce((n, c) => n + c.cost, 0)).toBeCloseTo(s.aiRunCost);
    expect(s.scenarios.recommended).toBeCloseTo(s.aiRunCost);
    expect(s.scenarios.cheapestIgnoringPolicy).toBeLessThanOrEqual(s.scenarios.recommended + 1e-9);
    expect(s.closedEnvironmentCount).toBeLessThanOrEqual(s.inScope);
    expect(s.m365NoExtraCostCount).toBeLessThanOrEqual(s.m365Count);
  });

  it('recommends only closed environments for the demo portfolio (default policy)', () => {
    expect(s.closedEnvironmentCount).toBe(s.inScope);
  });

  it('produces key statements for management', () => {
    expect(s.insights.length).toBeGreaterThanOrEqual(3);
    expect(s.insights.join(' ')).toContain('Microsoft-365-Tenant');
    expect(s.insights.join(' ')).toContain('praktisch null');
  });

  it('sorts go before check before no-go before no-AI', () => {
    const order = sortForCockpit(rows).map((r) => DECISION_ORDER.indexOf(r.evaluation.ai.decision.key));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('handles an empty portfolio', () => {
    const empty = summarizeCockpit([]);
    expect(empty.total).toBe(0);
    expect(empty.roiFirstYearPct).toBeNull();
    expect(empty.insights.length).toBe(1);
  });
});
