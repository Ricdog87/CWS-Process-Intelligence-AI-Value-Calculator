import { describe, expect, it } from 'vitest';
import { CRITERIA } from '../../config/scoringConfig';
import { calculateAutomationScore, categoryForScore, frequencyFactor } from '../scoring';
import type { ProcessAssessment, ProcessMetrics } from '../../types/process';

const metrics = (tx: number | null): ProcessMetrics => ({
  transactionsPerMonth: tx,
  minutesPerTransaction: 5,
  hourlyCost: 50,
  errorRatePct: 2,
  reworkMinutesPerError: 10,
});

const best: ProcessAssessment = {
  standardization: 'high',
  ruleBased: 'yes',
  digitalData: 'yes',
  integration: 'yes',
  exceptionRate: 'low',
  unstructuredInfo: 'no',
  complianceConcerns: 'no',
};

const worst: ProcessAssessment = {
  standardization: 'low',
  ruleBased: 'no',
  digitalData: 'no',
  integration: 'no',
  exceptionRate: 'high',
  unstructuredInfo: 'no',
  complianceConcerns: 'yes',
};

const empty: ProcessAssessment = {
  standardization: null,
  ruleBased: null,
  digitalData: null,
  integration: null,
  exceptionRate: null,
  unstructuredInfo: null,
  complianceConcerns: null,
};

describe('scoring configuration', () => {
  it('weights sum up to 100', () => {
    expect(CRITERIA.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });
  it('uses the specified weights', () => {
    const w = Object.fromEntries(CRITERIA.map((c) => [c.key, c.weight]));
    expect(w).toEqual({
      frequency: 15,
      repetitiveness: 20,
      standardization: 20,
      digitalData: 15,
      integration: 15,
      exceptionRate: 10,
      compliance: 5,
    });
  });
});

describe('calculateAutomationScore', () => {
  it('scores 100 for an ideal process', () => {
    const r = calculateAutomationScore({ metrics: metrics(5000), assessment: best });
    expect(r.score).toBe(100);
    expect(r.category.key).toBe('high');
    expect(r.isPreliminary).toBe(false);
    expect(r.strengths).toHaveLength(7);
    expect(r.challenges).toHaveLength(0);
  });

  it('gives RPA-only integration a small share and a challenge', () => {
    const r = calculateAutomationScore({ metrics: metrics(5), assessment: worst });
    // Only "integration: no" earns 0.2 × 15 = 3 points.
    expect(r.score).toBe(3);
    expect(r.category.key).toBe('low');
    expect(r.challenges.length).toBeGreaterThanOrEqual(6);
  });

  it('flags missing answers as preliminary with a full score range', () => {
    const r = calculateAutomationScore({ metrics: metrics(null), assessment: empty });
    expect(r.score).toBe(0);
    expect(r.isPreliminary).toBe(true);
    expect(r.range).toEqual({ min: 0, max: 100 });
    expect(r.openPoints.length).toBe(8); // 7 criteria + unstructured info
  });

  it('treats "unknown" cautiously and shows the possible span', () => {
    const r = calculateAutomationScore({
      metrics: metrics(5000),
      assessment: { ...best, integration: 'unknown', complianceConcerns: 'unknown' },
    });
    // 100 − 15 + 7.5 − 5 + 2 = 89.5 → 90
    expect(r.score).toBe(90);
    expect(r.range.min).toBeLessThan(r.score);
    expect(r.range.max).toBe(100);
    expect(r.isPreliminary).toBe(true);
  });

  it('adds a challenge for unstructured information', () => {
    const r = calculateAutomationScore({ metrics: metrics(5000), assessment: { ...best, unstructuredInfo: 'yes' } });
    expect(r.challenges.some((c) => c.includes('Unstrukturierte'))).toBe(true);
    expect(r.score).toBe(100);
  });
});

describe('frequency bands', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 0.2],
    [50, 0.4],
    [200, 0.6],
    [500, 0.8],
    [999, 0.8],
    [1000, 1],
    [1_000_000, 1],
  ])('%i transactions → factor %f', (tx, factor) => {
    expect(frequencyFactor(tx)).toBe(factor);
  });
});

describe('score categories', () => {
  it.each([
    [100, 'high'],
    [80, 'high'],
    [79, 'good'],
    [60, 'good'],
    [59, 'further'],
    [40, 'further'],
    [39, 'low'],
    [0, 'low'],
  ])('score %i → %s', (score, key) => {
    expect(categoryForScore(score).key).toBe(key);
  });
});
