/**
 * Economic value calculation – pure functions, no UI dependencies.
 *
 * Financial principles implemented here:
 * - Released capacity (hours × hourly cost) is economic potential, NOT cash savings.
 * - Hard (cash) savings are entered separately and reported separately.
 * - Processing time excludes rework, and rework is valued separately, so nothing is double-counted.
 * - All results are estimates until validated with the business and controlling.
 */
import type { AutomationScenario, BusinessProcess, ProcessMetrics } from '../types/process';

export type EconomicInputs = ProcessMetrics & AutomationScenario;

export type EconomicInputKey = keyof EconomicInputs;

export interface EconomicResult {
  /** Transactions × processing minutes / 60 */
  monthlyManualHours: number;
  /** Current workload × expected time reduction */
  savedHoursPerMonth: number;
  /** Saved hours per month × 12 (processing time only) */
  annualHoursReleased: number;
  /** Annual capacity released × hourly cost – economic potential, not cash */
  annualCapacityValue: number;
  /** Transactions × error rate × rework minutes / 60 */
  monthlyReworkHours: number;
  /** Monthly rework hours × error reduction × 12 */
  annualAvoidedReworkHours: number;
  /** Annual avoided rework hours × hourly cost */
  annualAvoidedReworkValue: number;
  /** Processing hours + avoided rework hours (no overlap by definition) */
  totalAnnualHoursSaved: number;
  annualHardSavings: number;
  implementationCost: number;
  /** Monthly operating costs × 12 (maintenance, support, other licences – without AI usage) */
  annualOperatingCosts: number;
  /** Annual AI usage cost of the recommended platform (tokens, credits, additional licences) */
  annualAiRunCost: number;
  /** Capacity value + avoided rework value + hard savings */
  annualGrossBenefit: number;
  /** Gross benefit − operating costs − AI run cost: the recurring value from year 2 onwards */
  annualRecurringNetValue: number;
  /** Implementation + annual operating costs + AI run cost */
  firstYearCosts: number;
  /** Gross benefit − implementation − operating costs */
  firstYearNetBenefit: number;
  /** First-year net benefit / first-year costs × 100; null if there are no costs */
  firstYearRoiPct: number | null;
  /** Months until the implementation cost is recovered; null if never (recurring value ≤ 0) */
  paybackMonths: number | null;
  /** Cash-only view: hard savings − implementation − operating costs */
  cashFirstYearNet: number;
  /** Payback based on hard savings only; null if never */
  cashPaybackMonths: number | null;
  /** Inputs that were not provided and were treated as 0 */
  missingInputs: EconomicInputKey[];
  isComplete: boolean;
}

export const ECONOMIC_INPUT_LABELS: Record<EconomicInputKey, string> = {
  transactionsPerMonth: 'Vorgänge pro Monat',
  minutesPerTransaction: 'Bearbeitungszeit je Vorgang',
  hourlyCost: 'Interner Stundensatz',
  errorRatePct: 'Fehlerquote',
  reworkMinutesPerError: 'Nacharbeitszeit je Fehler',
  timeReductionPct: 'Erwartete Zeitreduktion',
  errorReductionPct: 'Erwartete Fehlerreduktion',
  implementationCost: 'Einmalige Implementierungskosten',
  monthlyOperatingCost: 'Monatliche Betriebskosten',
  annualHardSavings: 'Realisierbare harte Einsparungen',
};

/** Finite, non-negative number or 0. Guards every formula against NaN, Infinity and negatives. */
export function safeAmount(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

/** Percentage clamped to 0–100 and converted to a share (0–1). */
export function shareFromPct(value: number | null | undefined): number {
  return Math.min(safeAmount(value), 100) / 100;
}

function findMissingInputs(inputs: EconomicInputs): EconomicInputKey[] {
  const missing: EconomicInputKey[] = [];
  const required: EconomicInputKey[] = [
    'transactionsPerMonth',
    'minutesPerTransaction',
    'hourlyCost',
    'timeReductionPct',
    'implementationCost',
    'monthlyOperatingCost',
  ];
  for (const key of required) {
    if (inputs[key] === null || inputs[key] === undefined) missing.push(key);
  }
  if (inputs.errorRatePct === null || inputs.errorRatePct === undefined) {
    missing.push('errorRatePct');
  } else if (inputs.errorRatePct > 0) {
    // Rework details only matter when errors actually occur.
    if (inputs.reworkMinutesPerError === null) missing.push('reworkMinutesPerError');
    if (inputs.errorReductionPct === null) missing.push('errorReductionPct');
  }
  return missing;
}

/**
 * Months until cumulative recurring value covers the one-time investment.
 * 0 = immediately (no investment), null = not reachable.
 */
export function paybackPeriodMonths(investment: number, annualRecurringNetValue: number): number | null {
  const monthlyNet = annualRecurringNetValue / 12;
  if (monthlyNet <= 0) return null;
  if (investment <= 0) return 0;
  return investment / monthlyNet;
}

export function calculateEconomics(inputs: EconomicInputs, annualAiRunCost = 0): EconomicResult {
  const transactions = safeAmount(inputs.transactionsPerMonth);
  const minutes = safeAmount(inputs.minutesPerTransaction);
  const hourlyCost = safeAmount(inputs.hourlyCost);
  const errorRate = shareFromPct(inputs.errorRatePct);
  const reworkMinutes = safeAmount(inputs.reworkMinutesPerError);
  const timeReduction = shareFromPct(inputs.timeReductionPct);
  const errorReduction = shareFromPct(inputs.errorReductionPct);
  const implementationCost = safeAmount(inputs.implementationCost);
  const monthlyOperatingCost = safeAmount(inputs.monthlyOperatingCost);
  const annualHardSavings = safeAmount(inputs.annualHardSavings);

  const monthlyManualHours = (transactions * minutes) / 60;
  const savedHoursPerMonth = monthlyManualHours * timeReduction;
  const annualHoursReleased = savedHoursPerMonth * 12;
  const annualCapacityValue = annualHoursReleased * hourlyCost;

  const monthlyReworkHours = (transactions * errorRate * reworkMinutes) / 60;
  const annualAvoidedReworkHours = monthlyReworkHours * errorReduction * 12;
  const annualAvoidedReworkValue = annualAvoidedReworkHours * hourlyCost;

  const annualOperatingCosts = monthlyOperatingCost * 12;
  const aiRunCost = safeAmount(annualAiRunCost);
  const annualGrossBenefit = annualCapacityValue + annualAvoidedReworkValue + annualHardSavings;
  const annualRecurringNetValue = annualGrossBenefit - annualOperatingCosts - aiRunCost;
  const firstYearCosts = implementationCost + annualOperatingCosts + aiRunCost;
  const firstYearNetBenefit = annualGrossBenefit - firstYearCosts;
  const firstYearRoiPct = firstYearCosts > 0 ? (firstYearNetBenefit / firstYearCosts) * 100 : null;

  const missingInputs = findMissingInputs(inputs);

  return {
    monthlyManualHours,
    savedHoursPerMonth,
    annualHoursReleased,
    annualCapacityValue,
    monthlyReworkHours,
    annualAvoidedReworkHours,
    annualAvoidedReworkValue,
    totalAnnualHoursSaved: annualHoursReleased + annualAvoidedReworkHours,
    annualHardSavings,
    implementationCost,
    annualOperatingCosts,
    annualAiRunCost: aiRunCost,
    annualGrossBenefit,
    annualRecurringNetValue,
    firstYearCosts,
    firstYearNetBenefit,
    firstYearRoiPct,
    paybackMonths: paybackPeriodMonths(implementationCost, annualRecurringNetValue),
    cashFirstYearNet: annualHardSavings - firstYearCosts,
    cashPaybackMonths: paybackPeriodMonths(implementationCost, annualHardSavings - annualOperatingCosts - aiRunCost),
    missingInputs,
    isComplete: missingInputs.length === 0,
  };
}

export function economicInputsOf(process: Pick<BusinessProcess, 'metrics' | 'scenario'>): EconomicInputs {
  return { ...process.metrics, ...process.scenario };
}

/**
 * Scenario with only a share of the expected effects (time/error reduction, hard savings).
 * Costs stay unchanged – used for the sensitivity view ("what if only 50 % materialise?").
 */
export function scaleEffects(inputs: EconomicInputs, effectFactor: number): EconomicInputs {
  const scale = (v: number | null) => (v === null ? null : v * effectFactor);
  return {
    ...inputs,
    timeReductionPct: scale(inputs.timeReductionPct),
    errorReductionPct: scale(inputs.errorReductionPct),
    annualHardSavings: scale(inputs.annualHardSavings),
  };
}

export interface CumulativePoint {
  month: number;
  value: number;
}

/** Cumulative economic net value per month: starts at −implementation cost, then adds the monthly recurring value. */
export function cumulativeValueSeries(result: EconomicResult, months = 36): CumulativePoint[] {
  const monthly = result.annualRecurringNetValue / 12;
  return Array.from({ length: months + 1 }, (_, month) => ({
    month,
    value: -result.implementationCost + monthly * month,
  }));
}
