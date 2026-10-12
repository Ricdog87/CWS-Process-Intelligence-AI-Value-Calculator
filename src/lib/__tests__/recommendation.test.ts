import { describe, expect, it } from 'vitest';
import { recommendSolution } from '../recommendation';
import type { ProcessAssessment } from '../../types/process';

const structured: ProcessAssessment = {
  standardization: 'high',
  ruleBased: 'yes',
  digitalData: 'yes',
  integration: 'yes',
  exceptionRate: 'low',
  unstructuredInfo: 'no',
  complianceConcerns: 'no',
};

describe('recommendSolution', () => {
  it('structured, rule-based → classical automation (R5)', () => {
    const r = recommendSolution(structured, 95);
    expect(r.approach).toBe('classical');
    expect(r.ruleId).toBe('R5');
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('unstructured input + fixed rules → hybrid (R2)', () => {
    const r = recommendSolution({ ...structured, unstructuredInfo: 'yes' }, 90);
    expect(r.approach).toBe('hybrid');
    expect(r.ruleId).toBe('R2');
  });

  it('unstructured input + partial rules → AI-enabled (R3)', () => {
    const r = recommendSolution({ ...structured, unstructuredInfo: 'yes', ruleBased: 'partial' }, 75);
    expect(r.approach).toBe('ai');
    expect(r.ruleId).toBe('R3');
  });

  it('structured data without explicit rules → AI-enabled decision support (R4)', () => {
    const r = recommendSolution({ ...structured, ruleBased: 'no' }, 70);
    expect(r.approach).toBe('ai');
    expect(r.ruleId).toBe('R4');
  });

  it('low score → process optimization first (R1)', () => {
    const r = recommendSolution(structured, 35);
    expect(r.approach).toBe('optimization_first');
    expect(r.ruleId).toBe('R1');
  });

  it('does not apply the score rule while the best case could still reach 40', () => {
    const r = recommendSolution(structured, 20, 75);
    expect(r.approach).toBe('classical');
    expect(recommendSolution(structured, 20, 35).approach).toBe('optimization_first');
  });

  it('low standardization + high exceptions → process optimization first even with good score', () => {
    const r = recommendSolution({ ...structured, standardization: 'low', exceptionRate: 'high' }, 65);
    expect(r.approach).toBe('optimization_first');
  });

  it('no digital data and no integration → digitalize first', () => {
    const r = recommendSolution({ ...structured, digitalData: 'no', integration: 'no' }, 60);
    expect(r.approach).toBe('optimization_first');
  });

  it('adds compliance considerations for AI with personal data', () => {
    const r = recommendSolution({ ...structured, unstructuredInfo: 'yes', complianceConcerns: 'yes' }, 80);
    expect(r.considerations.some((c) => c.includes('DSGVO'))).toBe(true);
  });

  it('marks the recommendation as preliminary when answers are missing', () => {
    const r = recommendSolution({ ...structured, unstructuredInfo: null }, 80);
    expect(r.isPreliminary).toBe(true);
    expect(r.assumptions).toHaveLength(1);
  });
});

describe('status-aware next step', () => {
  it('gives delivery-stage advice for pilots and implemented processes', async () => {
    const { createDemoProcesses } = await import('../../data/demoData');
    const { evaluateProcess } = await import('../evaluation');
    const base = createDemoProcesses().find((p) => p.id === 'demo-service-request-classification')!;
    expect(evaluateProcess({ ...base, status: 'pilot' }).nextStep.title).toContain('Pilot-KPIs');
    expect(evaluateProcess({ ...base, status: 'implemented' }).nextStep.title).toContain('Nutzen-Tracking');
    expect(evaluateProcess({ ...base, status: 'new' }).nextStep.title).not.toContain('Pilot-KPIs');
  });
});
