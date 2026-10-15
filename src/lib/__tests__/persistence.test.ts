import { describe, expect, it } from 'vitest';
import { createDemoProcesses } from '../../data/demoData';
import { buildPortfolioCsv, escapeCsvText } from '../csv';
import { evaluateProcess } from '../evaluation';
import { loadProcesses, sanitizeProcess, saveProcesses, STORAGE_KEY } from '../storage';
import { validateProcess, type ProcessFormValues } from '../validation';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe('storage', () => {
  it('seeds demo data on first start', () => {
    const r = loadProcesses(memoryStorage());
    expect(r.source).toBe('demo');
    expect(r.processes.length).toBeGreaterThanOrEqual(6);
    expect(r.processes.every((p) => p.isDemo)).toBe(true);
  });

  it('round-trips saved processes', () => {
    const storage = memoryStorage();
    const demo = createDemoProcesses();
    expect(saveProcesses(storage, demo)).toBeNull();
    const r = loadProcesses(storage);
    expect(r.source).toBe('stored');
    expect(r.processes).toEqual(demo);
  });

  it('keeps an intentionally empty portfolio empty', () => {
    const storage = memoryStorage();
    saveProcesses(storage, []);
    expect(loadProcesses(storage).processes).toEqual([]);
  });

  it('recovers from corrupt JSON', () => {
    const r = loadProcesses(memoryStorage({ [STORAGE_KEY]: '{not json' }));
    expect(r.source).toBe('recovered');
    expect(r.warning).toBeDefined();
    expect(r.processes.length).toBeGreaterThan(0);
  });

  it('skips invalid records and sanitizes values', () => {
    const [valid] = createDemoProcesses();
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        processes: [{ ...valid, status: 'bogus', metrics: { ...valid.metrics, hourlyCost: 'x' } }, { foo: 1 }],
      }),
    });
    const r = loadProcesses(storage);
    expect(r.processes).toHaveLength(1);
    expect(r.processes[0].status).toBe('new');
    expect(r.processes[0].metrics.hourlyCost).toBeNull();
    expect(r.warning).toContain('übersprungen');
  });

  it('reports a failing storage instead of throwing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadProcesses(broken).warning).toBeDefined();
    expect(saveProcesses(broken, [])).not.toBeNull();
  });

  it('rejects records without name or department', () => {
    expect(sanitizeProcess({ id: 'x', name: '', department: 'sales' })).toBeNull();
    expect(sanitizeProcess({ id: 'x', name: 'Test', department: 'marketing' })).toBeNull();
  });
});

describe('CSV export', () => {
  it('escapes quotes and neutralizes formulas', () => {
    expect(escapeCsvText('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvText('=SUM(A1)')).toBe('"\'=SUM(A1)"');
  });

  it('builds a semicolon-separated file with BOM and demo labels', () => {
    const rows = createDemoProcesses().map((process) => ({ process, evaluation: evaluateProcess(process) }));
    const csv = buildPortfolioCsv(rows);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines[0].split(';')).toHaveLength(lines[1].split(';').length);
    expect(csv).toContain('DEMO-DATEN');
    expect(lines[0]).toContain('KI-Nutzungskosten p. a. (EUR)');
  });
});

describe('validation', () => {
  const values = (): ProcessFormValues => {
    const { id: _id, createdAt: _c, updatedAt: _u, isDemo: _d, ...draft } = createDemoProcesses()[0];
    return draft;
  };

  it('accepts a complete demo process', () => {
    expect(validateProcess(values()).isValid).toBe(true);
  });

  it('requires name, department, transactions and minutes', () => {
    const v = values();
    const r = validateProcess({
      ...v,
      name: ' ',
      department: '',
      metrics: { ...v.metrics, transactionsPerMonth: null, minutesPerTransaction: null },
    });
    expect(Object.keys(r.errors).sort()).toEqual(
      ['department', 'metrics.minutesPerTransaction', 'metrics.transactionsPerMonth', 'name'].sort(),
    );
  });

  it('rejects out-of-range percentages and invalid numbers', () => {
    const v = values();
    const r = validateProcess({
      ...v,
      metrics: { ...v.metrics, errorRatePct: 120 },
      scenario: { ...v.scenario, timeReductionPct: Number.NaN, implementationCost: -1 },
    });
    expect(r.errors['metrics.errorRatePct']).toBeDefined();
    expect(r.errors['scenario.timeReductionPct']).toBeDefined();
    expect(r.errors['scenario.implementationCost']).toBeDefined();
  });

  it('warns about optimistic time reduction without blocking', () => {
    const v = values();
    const r = validateProcess({ ...v, scenario: { ...v.scenario, timeReductionPct: 95 } });
    expect(r.isValid).toBe(true);
    expect(r.warnings['scenario.timeReductionPct']).toBeDefined();
  });
});

describe('demo portfolio sanity', () => {
  const evaluated = createDemoProcesses().map((p) => ({ p, e: evaluateProcess(p) }));

  it('contains a mix of recommendations and priorities', () => {
    const approaches = new Set(evaluated.map(({ e }) => e.recommendation.approach));
    const priorities = new Set(evaluated.map(({ e }) => e.priority.level));
    expect(approaches.size).toBe(4);
    expect(priorities.size).toBe(3);
  });

  it('produces finite numbers for every demo process', () => {
    for (const { e } of evaluated) {
      expect(Number.isFinite(e.economics.firstYearNetBenefit)).toBe(true);
      expect(e.score.score).toBeGreaterThanOrEqual(0);
      expect(e.score.score).toBeLessThanOrEqual(100);
    }
  });
});
