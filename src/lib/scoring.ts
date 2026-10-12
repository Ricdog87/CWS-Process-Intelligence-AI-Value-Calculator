/**
 * Automation Opportunity Score (0–100) – transparent, rule-based, no simulated AI.
 * Weights, answer factors and thresholds come from config/scoringConfig.ts.
 */
import {
  ANSWER_FACTORS,
  CHALLENGE_MAX_FACTOR,
  CRITERIA,
  FREQUENCY_BANDS,
  SCORE_CATEGORIES,
  STRENGTH_MIN_FACTOR,
  type CriterionKey,
  type ScoreCategoryKey,
} from '../config/scoringConfig';
import {
  levelLabel,
  yesPartialNoLabel,
  yesUnknownNoLabel,
} from '../config/options';
import type { BusinessProcess } from '../types/process';
import { formatNumber, formatPercent } from './format';

export type AnswerState = 'answered' | 'unknown' | 'missing';

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  weight: number;
  /** Points earned (missing answers earn 0). */
  points: number;
  /** Earned share of the weight; null when unanswered. */
  factor: number | null;
  answerLabel: string;
  state: AnswerState;
  /** Why the criterion earned these points. */
  rule: string;
  /** Best/worst case points while the answer is open (equal to points when answered). */
  minPoints: number;
  maxPoints: number;
}

export interface ScoreCategory {
  key: ScoreCategoryKey;
  label: string;
  short: string;
}

export interface AutomationScoreResult {
  score: number;
  /** Plausible score span while answers are missing or unknown. */
  range: { min: number; max: number };
  category: ScoreCategory;
  criteria: CriterionResult[];
  strengths: string[];
  challenges: string[];
  /** Missing or uncertain information that makes the score preliminary. */
  openPoints: string[];
  isPreliminary: boolean;
}

type ScoringInput = Pick<BusinessProcess, 'metrics' | 'assessment'>;

export function frequencyFactor(transactionsPerMonth: number): number {
  const band = FREQUENCY_BANDS.find((b) => transactionsPerMonth >= b.min);
  return band ? band.factor : 0;
}

export function categoryForScore(score: number): ScoreCategory {
  const match = SCORE_CATEGORIES.find((c) => score >= c.min) ?? SCORE_CATEGORIES[SCORE_CATEGORIES.length - 1];
  return { key: match.key, label: match.label, short: match.short };
}

const pct = (factor: number) => formatPercent(factor * 100, 0);

function answered(
  def: (typeof CRITERIA)[number],
  factor: number,
  answerLabel: string,
  rule: string,
): CriterionResult {
  const points = def.weight * factor;
  return {
    key: def.key,
    label: def.label,
    weight: def.weight,
    points,
    factor,
    answerLabel,
    state: 'answered',
    rule,
    minPoints: points,
    maxPoints: points,
  };
}

function missing(def: (typeof CRITERIA)[number], rule: string): CriterionResult {
  return {
    key: def.key,
    label: def.label,
    weight: def.weight,
    points: 0,
    factor: null,
    answerLabel: 'Keine Angabe',
    state: 'missing',
    rule,
    minPoints: 0,
    maxPoints: def.weight,
  };
}

function evaluateCriterion(def: (typeof CRITERIA)[number], input: ScoringInput): CriterionResult {
  const a = input.assessment;
  const missingRule = 'Keine Angabe – 0 Punkte, Ergebnis vorläufig.';

  switch (def.key) {
    case 'frequency': {
      const tx = input.metrics.transactionsPerMonth;
      if (tx === null || !Number.isFinite(tx)) return missing(def, missingRule);
      const f = frequencyFactor(tx);
      const band = FREQUENCY_BANDS.find((b) => tx >= b.min);
      return answered(
        def,
        f,
        `${formatNumber(tx)} / Monat`,
        `Band ab ${formatNumber(band?.min ?? 0)} Vorgängen/Monat → ${pct(f)} der Punkte.`,
      );
    }
    case 'repetitiveness': {
      if (!a.ruleBased) return missing(def, missingRule);
      const f = ANSWER_FACTORS.repetitiveness[a.ruleBased];
      return answered(def, f, yesPartialNoLabel(a.ruleBased), `„${yesPartialNoLabel(a.ruleBased)}“ → ${pct(f)} der Punkte.`);
    }
    case 'standardization': {
      if (!a.standardization) return missing(def, missingRule);
      const f = ANSWER_FACTORS.standardization[a.standardization];
      return answered(def, f, levelLabel(a.standardization), `„${levelLabel(a.standardization)}“ → ${pct(f)} der Punkte.`);
    }
    case 'digitalData': {
      if (!a.digitalData) return missing(def, missingRule);
      const f = ANSWER_FACTORS.digitalData[a.digitalData];
      return answered(def, f, yesPartialNoLabel(a.digitalData), `„${yesPartialNoLabel(a.digitalData)}“ → ${pct(f)} der Punkte.`);
    }
    case 'integration': {
      if (!a.integration) return missing(def, missingRule);
      const f = ANSWER_FACTORS.integration[a.integration];
      const rule =
        a.integration === 'no'
          ? `„Nein“ → ${pct(f)} der Punkte (nur Oberflächenautomatisierung/RPA möglich).`
          : a.integration === 'unknown'
            ? `„Unbekannt“ → vorsichtig ${pct(f)} der Punkte, Ergebnis vorläufig.`
            : `„Ja“ → ${pct(f)} der Punkte.`;
      const result = answered(def, f, yesUnknownNoLabel(a.integration), rule);
      if (a.integration === 'unknown') {
        return {
          ...result,
          state: 'unknown',
          minPoints: def.weight * ANSWER_FACTORS.integration.no,
          maxPoints: def.weight * ANSWER_FACTORS.integration.yes,
        };
      }
      return result;
    }
    case 'exceptionRate': {
      if (!a.exceptionRate) return missing(def, missingRule);
      const f = ANSWER_FACTORS.exceptionRate[a.exceptionRate];
      return answered(def, f, levelLabel(a.exceptionRate), `Ausnahmequote „${levelLabel(a.exceptionRate)}“ → ${pct(f)} der Punkte.`);
    }
    case 'compliance': {
      if (!a.complianceConcerns) return missing(def, missingRule);
      const f = ANSWER_FACTORS.compliance[a.complianceConcerns];
      const label = yesUnknownNoLabel(a.complianceConcerns);
      const rule =
        a.complianceConcerns === 'unknown'
          ? `Bedenken „Unbekannt“ → vorsichtig ${pct(f)} der Punkte, Ergebnis vorläufig.`
          : `Bedenken „${label}“ → ${pct(f)} der Punkte.`;
      const result = answered(def, f, `Bedenken: ${label}`, rule);
      if (a.complianceConcerns === 'unknown') {
        return {
          ...result,
          state: 'unknown',
          minPoints: def.weight * ANSWER_FACTORS.compliance.yes,
          maxPoints: def.weight * ANSWER_FACTORS.compliance.no,
        };
      }
      return result;
    }
  }
}

const STRENGTH_TEXT: Record<CriterionKey, (input: ScoringInput) => string> = {
  frequency: (i) =>
    `Hohes Volumen: ${formatNumber(i.metrics.transactionsPerMonth ?? 0)} Vorgänge pro Monat – Automatisierung skaliert gut.`,
  repetitiveness: () => 'Klar regelbasierter, wiederkehrender Ablauf.',
  standardization: () => 'Hoher Standardisierungsgrad mit wenigen Prozessvarianten.',
  digitalData: () => 'Eingangsdaten liegen bereits digital vor.',
  integration: () => 'Technische Systemintegration (z. B. über Schnittstellen) ist möglich.',
  exceptionRate: () => 'Geringe Ausnahmequote – die meisten Fälle laufen im Standard.',
  compliance: () => 'Keine besonderen Datenschutz- oder Compliance-Bedenken bekannt.',
};

const CHALLENGE_TEXT: Record<CriterionKey, (input: ScoringInput) => string> = {
  frequency: (i) =>
    `Geringes Volumen (${formatNumber(i.metrics.transactionsPerMonth ?? 0)} Vorgänge/Monat) – der Hebel einer Automatisierung ist begrenzt.`,
  repetitiveness: () => 'Ablauf folgt kaum festen Regeln – Entscheidungen beruhen auf Erfahrungswissen.',
  standardization: () => 'Geringe Standardisierung – viele Varianten erschweren die Automatisierung.',
  digitalData: () => 'Eingangsdaten liegen nicht digital vor (z. B. Papier, Telefon) – Digitalisierung ist Voraussetzung.',
  integration: () =>
    'Keine Schnittstelle verfügbar – nur Oberflächenautomatisierung (RPA) mit höherem Wartungsaufwand möglich.',
  exceptionRate: () => 'Hohe Ausnahmequote – viele Fälle benötigen weiterhin manuelle Bearbeitung.',
  compliance: (i) =>
    i.assessment.complianceConcerns === 'unknown'
      ? 'Datenschutz- und Compliance-Relevanz ist noch ungeklärt.'
      : 'Datenschutz-/Compliance-Bedenken – Datenschutz und Informationssicherheit früh einbinden.',
};

const OPEN_POINT_TEXT: Record<CriterionKey, string> = {
  frequency: 'Anzahl der Vorgänge pro Monat fehlt.',
  repetitiveness: 'Regelbasiertheit ist nicht bewertet.',
  standardization: 'Standardisierungsgrad ist nicht bewertet.',
  digitalData: 'Verfügbarkeit digitaler Eingangsdaten ist nicht bewertet.',
  integration: 'Integrationsfähigkeit ist nicht bewertet.',
  exceptionRate: 'Ausnahmequote ist nicht bewertet.',
  compliance: 'Datenschutz-/Compliance-Relevanz ist nicht bewertet.',
};

const UNKNOWN_POINT_TEXT: Partial<Record<CriterionKey, string>> = {
  integration: 'Integrationsfähigkeit unbekannt – mit der IT klären (API, Schnittstellen, Berechtigungen).',
  compliance: 'Compliance-Relevanz unbekannt – mit Datenschutz und Informationssicherheit klären.',
};

export function calculateAutomationScore(input: ScoringInput): AutomationScoreResult {
  const criteria = CRITERIA.map((def) => evaluateCriterion(def, input));

  const raw = criteria.reduce((sum, c) => sum + c.points, 0);
  const score = Math.round(raw);
  const range = {
    min: Math.round(criteria.reduce((s, c) => s + c.minPoints, 0)),
    max: Math.round(criteria.reduce((s, c) => s + c.maxPoints, 0)),
  };

  const strengths: string[] = [];
  const challenges: string[] = [];
  const openPoints: string[] = [];

  for (const c of criteria) {
    if (c.state === 'missing') {
      openPoints.push(OPEN_POINT_TEXT[c.key]);
      continue;
    }
    if (c.state === 'unknown') {
      openPoints.push(UNKNOWN_POINT_TEXT[c.key] ?? OPEN_POINT_TEXT[c.key]);
    }
    if (c.factor !== null && c.factor >= STRENGTH_MIN_FACTOR) strengths.push(STRENGTH_TEXT[c.key](input));
    else if (c.factor !== null && c.factor <= CHALLENGE_MAX_FACTOR) challenges.push(CHALLENGE_TEXT[c.key](input));
  }

  // Not a score criterion, but decisive for the solution design.
  if (input.assessment.unstructuredInfo === 'yes') {
    challenges.push('Unstrukturierte Informationen (Freitext, PDFs, E-Mails) müssen interpretiert werden – erfordert eine KI-Komponente.');
  }
  if (input.assessment.unstructuredInfo === null) {
    openPoints.push('Unklar, ob unstrukturierte Informationen interpretiert werden müssen.');
  }

  return {
    score,
    range,
    category: categoryForScore(score),
    criteria,
    strengths,
    challenges,
    openPoints,
    isPreliminary: openPoints.length > 0,
  };
}
