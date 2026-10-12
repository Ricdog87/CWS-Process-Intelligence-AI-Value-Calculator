import { describe, expect, it } from 'vitest';
import { calculatePriority, effortPoints, valuePoints } from '../priority';

describe('priority', () => {
  it('maps annual value to value points', () => {
    expect(valuePoints(200_000)).toBe(100);
    expect(valuePoints(100_000)).toBe(85);
    expect(valuePoints(59_999)).toBe(50);
    expect(valuePoints(500)).toBe(15);
    expect(valuePoints(0)).toBe(0);
    expect(valuePoints(-10_000)).toBe(0);
  });

  it('maps implementation cost to effort points (cheaper = more)', () => {
    expect(effortPoints(5_000)).toBe(100);
    expect(effortPoints(25_000)).toBe(80);
    expect(effortPoints(50_000)).toBe(60);
    expect(effortPoints(250_000)).toBe(10);
    expect(effortPoints(null)).toBe(50);
  });

  it('combines readiness, value and effort with the configured weights', () => {
    const r = calculatePriority({ automationScore: 95, annualRecurringValue: 114_000, implementationCost: 45_000 });
    // 95 × 0.45 + 85 × 0.35 + 60 × 0.2 = 84.5 → 85 (rounded)
    expect(r.score).toBe(85);
    expect(r.level).toBe('high');
    expect(r.explanation).toHaveLength(3);
  });

  it('classifies low readiness and value as low priority', () => {
    const r = calculatePriority({ automationScore: 30, annualRecurringValue: 5_000, implementationCost: 120_000 });
    expect(r.level).toBe('low');
  });

  it('flags missing implementation cost as preliminary', () => {
    expect(calculatePriority({ automationScore: 70, annualRecurringValue: 50_000, implementationCost: null }).isPreliminary).toBe(true);
  });
});
