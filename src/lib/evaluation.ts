/**
 * Combines score, recommendation, economics and priority into one evaluation per process.
 */
import type { BusinessProcess } from '../types/process';
import { calculateEconomics, economicInputsOf, ECONOMIC_INPUT_LABELS, type EconomicResult } from './calculations';
import { calculatePriority, type PriorityResult } from './priority';
import { recommendSolution, type RecommendationResult } from './recommendation';
import { calculateAutomationScore, type AutomationScoreResult } from './scoring';

export interface NextStep {
  title: string;
  details: string[];
}

export interface ProcessEvaluation {
  score: AutomationScoreResult;
  recommendation: RecommendationResult;
  economics: EconomicResult;
  priority: PriorityResult;
  nextStep: NextStep;
  /** True when any part of the assessment relies on missing or uncertain information. */
  isPreliminary: boolean;
  /** Human-readable list of everything that is missing or uncertain. */
  openPoints: string[];
}

export function recommendNextStep(
  score: AutomationScoreResult,
  recommendation: RecommendationResult,
  economics: EconomicResult,
): NextStep {
  const details: string[] = [];
  let title: string;

  if (score.openPoints.length >= 3) {
    title = 'Bewertung vervollständigen: fehlende Angaben mit dem Fachbereich ergänzen und erneut bewerten.';
  } else if (recommendation.approach === 'optimization_first') {
    title = 'Prozess zuerst optimieren: Varianten reduzieren, Regeln festlegen und Eingänge digitalisieren – danach erneut bewerten.';
  } else if (score.category.key === 'high') {
    title = 'Discovery-Workshop mit dem AI CoE einplanen und Pilot-Scope samt Erfolgskriterien festlegen.';
  } else if (score.category.key === 'good') {
    title = 'Prozess im Detail aufnehmen (Ist-Analyse, Volumen, Ausnahmen) und Business Case mit dem Controlling validieren.';
  } else if (score.category.key === 'further') {
    title = 'Mit dem Fachbereich Ausnahmen, Prozessvarianten und Datenlage klären; danach erneut bewerten.';
  } else {
    title = 'Zunächst standardisieren und digitalisieren; Automatisierung in 6–12 Monaten erneut prüfen.';
  }

  if (score.isPreliminary && score.openPoints.length < 3) {
    details.push(`Offene Punkte klären: ${score.openPoints.join(' ')}`);
  }
  if (economics.firstYearNetBenefit < 0 && economics.paybackMonths !== null) {
    details.push('Im ersten Jahr negativer Netto-Nutzen – Business Case über die Amortisationsdauer bewerten.');
  }
  if (economics.paybackMonths === null && economics.isComplete) {
    details.push('Laufender Nutzen deckt die Betriebskosten nicht – Szenario oder Lösungsansatz überdenken.');
  }
  if (economics.annualHardSavings === 0) {
    details.push('Plan zur Nutzung der freigesetzten Kapazität festlegen – erst dann entsteht ein finanzieller Effekt.');
  }

  return { title, details };
}

export function evaluateProcess(process: BusinessProcess): ProcessEvaluation {
  const score = calculateAutomationScore(process);
  const recommendation = recommendSolution(process.assessment, score.score, score.range.max);
  const economics = calculateEconomics(economicInputsOf(process));
  const priority = calculatePriority({
    automationScore: score.score,
    annualRecurringValue: economics.annualRecurringNetValue,
    implementationCost: process.scenario.implementationCost,
  });

  const openPoints = [
    ...score.openPoints,
    ...economics.missingInputs.map((key) => `${ECONOMIC_INPUT_LABELS[key]} fehlt – als 0 gerechnet.`),
  ];

  return {
    score,
    recommendation,
    economics,
    priority,
    nextStep: recommendNextStep(score, recommendation, economics),
    isPreliminary: score.isPreliminary || recommendation.isPreliminary || !economics.isComplete || priority.isPreliminary,
    openPoints,
  };
}
