/**
 * Central, documented configuration of all scoring and prioritization rules.
 *
 * Everything the AI CoE might want to calibrate lives here: criterion weights,
 * answer factors, frequency bands, category thresholds and priority bands.
 * The logic in lib/ reads these values, and the "Methodik" page renders them,
 * so the documentation in the UI can never drift from the actual rules.
 */
import type { Level, YesPartialNo, YesUnknownNo } from '../types/process';

export type CriterionKey =
  | 'frequency'
  | 'repetitiveness'
  | 'standardization'
  | 'digitalData'
  | 'integration'
  | 'exceptionRate'
  | 'compliance';

export interface CriterionDefinition {
  key: CriterionKey;
  label: string;
  /** Maximum points. All weights together must sum to 100. */
  weight: number;
  description: string;
}

export const CRITERIA: CriterionDefinition[] = [
  {
    key: 'frequency',
    label: 'Prozesshäufigkeit',
    weight: 15,
    description: 'Je häufiger ein Prozess läuft, desto stärker skaliert eine Automatisierung.',
  },
  {
    key: 'repetitiveness',
    label: 'Wiederholbarkeit / Regelbasiertheit',
    weight: 20,
    description: 'Feste Regeln und gleichartige Arbeitsschritte sind die Grundlage jeder Automatisierung.',
  },
  {
    key: 'standardization',
    label: 'Standardisierung',
    weight: 20,
    description: 'Ein einheitlicher Ablauf ohne viele Varianten senkt Aufwand und Risiko.',
  },
  {
    key: 'digitalData',
    label: 'Digitale Eingangsdaten',
    weight: 15,
    description: 'Liegen die Eingangsdaten digital vor, entfällt manuelle Erfassung.',
  },
  {
    key: 'integration',
    label: 'Systemintegration',
    weight: 15,
    description: 'Schnittstellen (API) ermöglichen stabile, wartbare Automatisierung.',
  },
  {
    key: 'exceptionRate',
    label: 'Geringe Ausnahmequote',
    weight: 10,
    description: 'Viele Sonderfälle erfordern manuelle Bearbeitung und schmälern den Nutzen.',
  },
  {
    key: 'compliance',
    label: 'Geringe Compliance-Komplexität',
    weight: 5,
    description: 'Datenschutz- oder Compliance-Anforderungen erhöhen Aufwand und Abstimmungsbedarf.',
  },
];

/**
 * Share of a criterion's weight (0–1) that each answer earns.
 * Example: Standardisierung "Mittel" = 0.5 × 20 = 10 Punkte.
 */
export const ANSWER_FACTORS = {
  repetitiveness: { yes: 1, partial: 0.5, no: 0 } satisfies Record<YesPartialNo, number>,
  standardization: { high: 1, medium: 0.5, low: 0 } satisfies Record<Level, number>,
  digitalData: { yes: 1, partial: 0.5, no: 0 } satisfies Record<YesPartialNo, number>,
  // "No" still earns a little: UI-based automation (RPA) remains possible, at higher maintenance cost.
  integration: { yes: 1, unknown: 0.5, no: 0.2 } satisfies Record<YesUnknownNo, number>,
  exceptionRate: { low: 1, medium: 0.5, high: 0 } satisfies Record<Level, number>,
  // Inverted: concerns present = 0 points.
  compliance: { no: 1, unknown: 0.4, yes: 0 } satisfies Record<YesUnknownNo, number>,
};

/** Transactions per month → share of the frequency weight. Evaluated top-down. */
export const FREQUENCY_BANDS: { min: number; factor: number }[] = [
  { min: 1000, factor: 1 },
  { min: 500, factor: 0.8 },
  { min: 200, factor: 0.6 },
  { min: 50, factor: 0.4 },
  { min: 10, factor: 0.2 },
  { min: 0, factor: 0 },
];

/** A criterion counts as strength / challenge when its earned share crosses these limits. */
export const STRENGTH_MIN_FACTOR = 0.75;
export const CHALLENGE_MAX_FACTOR = 0.4;

export type ScoreCategoryKey = 'high' | 'good' | 'further' | 'low';

export const SCORE_CATEGORIES: { key: ScoreCategoryKey; min: number; label: string; short: string }[] = [
  { key: 'high', min: 80, label: 'Hohes Automatisierungspotenzial', short: 'Hoch' },
  { key: 'good', min: 60, label: 'Gutes Automatisierungspotenzial', short: 'Gut' },
  { key: 'further', min: 40, label: 'Weitere Prüfung empfohlen', short: 'Prüfen' },
  { key: 'low', min: 0, label: 'Geringe Automatisierungsreife', short: 'Gering' },
];

/** Below this score the recommendation is always "Zuerst Prozessoptimierung". */
export const OPTIMIZATION_FIRST_MAX_SCORE = 40;

// ---------------------------------------------------------------------------
// Prioritization (portfolio view)
// ---------------------------------------------------------------------------

/**
 * Priority score (0–100) = weighted sum of three sub-scores.
 * Readiness = Automation Score, value = annual recurring economic value,
 * effort = one-time implementation cost (cheaper = more points).
 */
export const PRIORITY_WEIGHTS = { readiness: 0.45, value: 0.35, effort: 0.2 };

/** Annual recurring economic value in EUR (capacity + quality + hard savings − operating costs). */
export const VALUE_BANDS: { min: number; points: number }[] = [
  { min: 150_000, points: 100 },
  { min: 100_000, points: 85 },
  { min: 60_000, points: 70 },
  { min: 30_000, points: 50 },
  { min: 10_000, points: 30 },
  { min: 1, points: 15 },
];
export const VALUE_POINTS_NONE = 0;

/** One-time implementation cost in EUR. Evaluated top-down (first match wins). */
export const EFFORT_BANDS: { max: number; points: number }[] = [
  { max: 10_000, points: 100 },
  { max: 25_000, points: 80 },
  { max: 50_000, points: 60 },
  { max: 100_000, points: 40 },
  { max: 200_000, points: 20 },
];
export const EFFORT_POINTS_ABOVE = 10;
/** Neutral assumption when no implementation cost was provided (result flagged as preliminary). */
export const EFFORT_POINTS_UNKNOWN = 50;

export type PriorityKey = 'high' | 'medium' | 'low';

export const PRIORITY_LEVELS: { key: PriorityKey; min: number; label: string }[] = [
  { key: 'high', min: 70, label: 'Hoch' },
  { key: 'medium', min: 50, label: 'Mittel' },
  { key: 'low', min: 0, label: 'Niedrig' },
];

// ---------------------------------------------------------------------------
// Plausibility hints (non-blocking warnings in the intake form)
// ---------------------------------------------------------------------------

export const PLAUSIBILITY = {
  maxRealisticTimeReductionPct: 90,
  hourlyCostMin: 20,
  hourlyCostMax: 200,
};

// ---------------------------------------------------------------------------
// Presentation assumptions
// ---------------------------------------------------------------------------

/** Productive hours per full-time employee and year, used to express hours as FTE capacity. */
export const FTE_HOURS_PER_YEAR = 1600;

/** Quadrant boundaries of the prioritization matrix on the dashboard. */
export const MATRIX_THRESHOLDS = { score: 60, annualValue: 50_000 };
