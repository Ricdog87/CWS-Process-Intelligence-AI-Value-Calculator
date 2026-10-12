/**
 * Portfolio priority: combines automation readiness, economic value and implementation effort.
 * Bands and weights come from config/scoringConfig.ts.
 */
import {
  EFFORT_BANDS,
  EFFORT_POINTS_ABOVE,
  EFFORT_POINTS_UNKNOWN,
  PRIORITY_LEVELS,
  PRIORITY_WEIGHTS,
  VALUE_BANDS,
  VALUE_POINTS_NONE,
  type PriorityKey,
} from '../config/scoringConfig';
import { formatCurrency, formatNumber } from './format';

export interface PriorityInput {
  automationScore: number;
  /** Annual recurring economic value (capacity + quality + hard savings − operating costs). */
  annualRecurringValue: number;
  /** null = not provided. */
  implementationCost: number | null;
}

export interface PriorityResult {
  score: number;
  level: PriorityKey;
  label: string;
  readinessPoints: number;
  valuePoints: number;
  effortPoints: number;
  explanation: string[];
  isPreliminary: boolean;
}

export function valuePoints(annualValue: number): number {
  const band = VALUE_BANDS.find((b) => annualValue >= b.min);
  return band ? band.points : VALUE_POINTS_NONE;
}

export function effortPoints(implementationCost: number | null): number {
  if (implementationCost === null || !Number.isFinite(implementationCost)) return EFFORT_POINTS_UNKNOWN;
  const band = EFFORT_BANDS.find((b) => implementationCost <= b.max);
  return band ? band.points : EFFORT_POINTS_ABOVE;
}

export function priorityLevel(score: number): { key: PriorityKey; label: string } {
  const level = PRIORITY_LEVELS.find((l) => score >= l.min) ?? PRIORITY_LEVELS[PRIORITY_LEVELS.length - 1];
  return { key: level.key, label: level.label };
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  const readiness = Math.max(0, Math.min(100, input.automationScore));
  const value = valuePoints(input.annualRecurringValue);
  const effort = effortPoints(input.implementationCost);

  const score = Math.round(
    readiness * PRIORITY_WEIGHTS.readiness + value * PRIORITY_WEIGHTS.value + effort * PRIORITY_WEIGHTS.effort,
  );
  const level = priorityLevel(score);
  const w = (x: number) => formatNumber(x * 100);

  return {
    score,
    level: level.key,
    label: level.label,
    readinessPoints: readiness,
    valuePoints: value,
    effortPoints: effort,
    explanation: [
      `Automatisierungsreife: Score ${readiness} × ${w(PRIORITY_WEIGHTS.readiness)} %`,
      `Wirtschaftlicher Wert: ${formatCurrency(input.annualRecurringValue)} p. a. → ${value} Punkte × ${w(PRIORITY_WEIGHTS.value)} %`,
      input.implementationCost === null
        ? `Umsetzungsaufwand: keine Kostenangabe → neutral ${effort} Punkte × ${w(PRIORITY_WEIGHTS.effort)} %`
        : `Umsetzungsaufwand: ${formatCurrency(input.implementationCost)} einmalig → ${effort} Punkte × ${w(PRIORITY_WEIGHTS.effort)} %`,
    ],
    isPreliminary: input.implementationCost === null,
  };
}
