import { describe, expect, it } from 'vitest';
import {
  calculateEconomics,
  cumulativeValueSeries,
  paybackPeriodMonths,
  safeAmount,
  scaleEffects,
  shareFromPct,
  type EconomicInputs,
} from '../calculations';

const base: EconomicInputs = {
  transactionsPerMonth: 2400,
  minutesPerTransaction: 6,
  hourlyCost: 52,
  errorRatePct: 4,
  reworkMinutesPerError: 20,
  timeReductionPct: 70,
  errorReductionPct: 60,
  implementationCost: 45000,
  monthlyOperatingCost: 1200,
  annualHardSavings: 12000,
};

describe('calculateEconomics – formulas from the specification', () => {
  const r = calculateEconomics(base);

  it('current manual workload = transactions × minutes / 60', () => {
    expect(r.monthlyManualHours).toBeCloseTo(240);
  });

  it('saved hours per month = workload × time reduction', () => {
    expect(r.savedHoursPerMonth).toBeCloseTo(168);
  });

  it('annual capacity released = saved hours × 12', () => {
    expect(r.annualHoursReleased).toBeCloseTo(2016);
  });

  it('annual capacity value = capacity released × hourly cost', () => {
    expect(r.annualCapacityValue).toBeCloseTo(104832);
  });

  it('monthly rework hours = transactions × error rate × rework minutes / 60', () => {
    expect(r.monthlyReworkHours).toBeCloseTo(32);
  });

  it('annual avoided rework value = rework hours × error reduction × 12 × hourly cost', () => {
    expect(r.annualAvoidedReworkValue).toBeCloseTo(32 * 0.6 * 12 * 52);
  });

  it('annual operating costs = monthly × 12', () => {
    expect(r.annualOperatingCosts).toBe(14400);
  });

  it('first-year net benefit = capacity + rework + hard savings − implementation − operating', () => {
    const expected = 104832 + 11980.8 + 12000 - 45000 - 14400;
    expect(r.firstYearNetBenefit).toBeCloseTo(expected);
  });

  it('ROI = net benefit / first-year costs', () => {
    expect(r.firstYearRoiPct).toBeCloseTo((r.firstYearNetBenefit / (45000 + 14400)) * 100);
  });

  it('payback = implementation / monthly recurring net value', () => {
    const monthly = (104832 + 11980.8 + 12000 - 14400) / 12;
    expect(r.paybackMonths).toBeCloseTo(45000 / monthly);
  });

  it('counts processing hours and avoided rework hours separately (no double counting)', () => {
    expect(r.totalAnnualHoursSaved).toBeCloseTo(r.annualHoursReleased + r.annualAvoidedReworkHours);
    expect(r.annualGrossBenefit).toBeCloseTo(r.annualCapacityValue + r.annualAvoidedReworkValue + r.annualHardSavings);
  });

  it('keeps the cash view separate from capacity value', () => {
    expect(r.cashFirstYearNet).toBe(12000 - 45000 - 14400);
    expect(r.cashPaybackMonths).toBeNull(); // 12.000 hard savings < 14.400 operating costs
  });

  it('is complete when all inputs are present', () => {
    expect(r.isComplete).toBe(true);
    expect(r.missingInputs).toEqual([]);
  });
});

describe('calculateEconomics – edge cases', () => {
  it('handles all-zero inputs without NaN or Infinity', () => {
    const r = calculateEconomics({
      transactionsPerMonth: 0,
      minutesPerTransaction: 0,
      hourlyCost: 0,
      errorRatePct: 0,
      reworkMinutesPerError: 0,
      timeReductionPct: 0,
      errorReductionPct: 0,
      implementationCost: 0,
      monthlyOperatingCost: 0,
      annualHardSavings: 0,
    });
    for (const [key, value] of Object.entries(r)) {
      if (typeof value === 'number') expect(Number.isFinite(value), key).toBe(true);
    }
    expect(r.firstYearRoiPct).toBeNull();
    expect(r.paybackMonths).toBeNull();
  });

  it('treats missing values as 0 and reports them', () => {
    const r = calculateEconomics({ ...base, hourlyCost: null, implementationCost: null });
    expect(r.annualCapacityValue).toBe(0);
    expect(r.missingInputs).toContain('hourlyCost');
    expect(r.missingInputs).toContain('implementationCost');
    expect(r.isComplete).toBe(false);
  });

  it('does not require rework details when there are no errors', () => {
    const r = calculateEconomics({ ...base, errorRatePct: 0, reworkMinutesPerError: null, errorReductionPct: null });
    expect(r.missingInputs).toEqual([]);
    expect(r.annualAvoidedReworkValue).toBe(0);
  });

  it('ignores negative and non-finite inputs and clamps percentages to 100', () => {
    const r = calculateEconomics({ ...base, timeReductionPct: 150, minutesPerTransaction: Number.NaN, hourlyCost: -10 });
    expect(r.monthlyManualHours).toBe(0);
    expect(r.annualCapacityValue).toBe(0);
    expect(shareFromPct(150)).toBe(1);
    expect(safeAmount(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('allows a negative first-year result but a reachable payback', () => {
    const r = calculateEconomics({ ...base, implementationCost: 300000 });
    expect(r.firstYearNetBenefit).toBeLessThan(0);
    expect(r.paybackMonths).not.toBeNull();
    expect(r.paybackMonths!).toBeGreaterThan(12);
  });
});

describe('paybackPeriodMonths', () => {
  it('returns null when recurring value is not positive', () => {
    expect(paybackPeriodMonths(10000, 0)).toBeNull();
    expect(paybackPeriodMonths(10000, -5000)).toBeNull();
  });
  it('returns 0 without investment', () => {
    expect(paybackPeriodMonths(0, 12000)).toBe(0);
  });
  it('divides investment by monthly net value', () => {
    expect(paybackPeriodMonths(12000, 24000)).toBe(6);
  });
});

describe('scenario helpers', () => {
  it('scaleEffects only scales effects, not costs', () => {
    const half = scaleEffects(base, 0.5);
    expect(half.timeReductionPct).toBe(35);
    expect(half.errorReductionPct).toBe(30);
    expect(half.annualHardSavings).toBe(6000);
    expect(half.implementationCost).toBe(base.implementationCost);
    expect(half.monthlyOperatingCost).toBe(base.monthlyOperatingCost);
  });

  it('cumulative series starts at −implementation cost and crosses zero at payback', () => {
    const r = calculateEconomics(base);
    const series = cumulativeValueSeries(r, 24);
    expect(series).toHaveLength(25);
    expect(series[0].value).toBe(-45000);
    const firstPositive = series.find((p) => p.value >= 0);
    expect(firstPositive?.month).toBe(Math.ceil(r.paybackMonths!));
  });
});
