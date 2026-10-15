/**
 * Combines score, recommendation, economics and priority into one evaluation per process.
 */
import { AI_CATALOG, DEFAULT_EUR_PER_USD } from '../config/aiPlatforms';
import type { AiOption } from '../types/ai';
import type { BusinessProcess, ProcessStatus } from '../types/process';
import { recommendAiPlatform, type AiRecommendation } from './aiCost';
import { resolveAiProfile, type ResolvedAiProfile } from './aiProfile';
import { defaultAiSettings, type AiSettings } from './aiSettings';
import { calculateEconomics, economicInputsOf, ECONOMIC_INPUT_LABELS, type EconomicResult } from './calculations';
import { calculatePriority, type PriorityResult } from './priority';
import { recommendSolution, type RecommendationResult } from './recommendation';
import { calculateAutomationScore, type AutomationScoreResult } from './scoring';

export interface NextStep {
  title: string;
  details: string[];
}

export interface AiContext {
  settings: AiSettings;
  catalog: AiOption[];
}

export const DEFAULT_AI_CONTEXT: AiContext = { settings: defaultAiSettings(DEFAULT_EUR_PER_USD), catalog: AI_CATALOG };

export type AiDecisionKey = 'go' | 'check' | 'no_go' | 'no_ai';

export interface AiDecision {
  key: AiDecisionKey;
  label: string;
  reason: string;
}

export interface AiEvaluation {
  profile: ResolvedAiProfile;
  recommendation: AiRecommendation;
  /** Annual AI usage cost included in the economics (0 when no LLM is needed or the process must be optimised first). */
  annualRunCost: number;
  decision: AiDecision;
}

export interface ProcessEvaluation {
  score: AutomationScoreResult;
  recommendation: RecommendationResult;
  economics: EconomicResult;
  priority: PriorityResult;
  nextStep: NextStep;
  ai: AiEvaluation;
  /** True when any part of the assessment relies on missing or uncertain information. */
  isPreliminary: boolean;
  /** Human-readable list of everything that is missing or uncertain. */
  openPoints: string[];
}

export function recommendNextStep(
  score: AutomationScoreResult,
  recommendation: RecommendationResult,
  economics: EconomicResult,
  status: ProcessStatus = 'new',
): NextStep {
  const details: string[] = [];
  let title: string;

  // Processes already in delivery get delivery-stage advice, not discovery advice.
  if (status === 'implemented') {
    return {
      title: 'Nutzen-Tracking: realisierte Zeit- und Qualitätseffekte gegen den Business Case messen und auf ähnliche Prozesse übertragen.',
      details: economics.annualHardSavings === 0
        ? ['Nachweisen, wie die freigesetzte Kapazität genutzt wird – erst dann entsteht ein finanzieller Effekt.']
        : [],
    };
  }
  if (status === 'pilot') {
    return {
      title: 'Pilot-KPIs (Zeit je Vorgang, Fehlerquote, Akzeptanz) gegen den Business Case messen und Go/No-Go für den Rollout vorbereiten.',
      details: score.isPreliminary ? [`Offene Punkte im Pilot klären: ${score.openPoints.join(' ')}`] : [],
    };
  }

  if (score.openPoints.length >= 3) {
    title = 'Bewertung vervollständigen: fehlende Angaben mit dem Fachbereich ergänzen und erneut bewerten.';
  } else if (recommendation.approach === 'optimization_first') {
    title = 'Prozess zuerst optimieren: Varianten reduzieren, Regeln festlegen und Eingänge digitalisieren – danach erneut bewerten.';
  } else if (status === 'approved_discovery' && (score.category.key === 'high' || score.category.key === 'good')) {
    title = 'Discovery durchführen: Pilot-Scope, Erfolgskriterien, Datenzugänge und Verantwortliche festlegen.';
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

/** C-level traffic light: is AI worth doing here, safely and economically? */
export function aiDecision(
  score: AutomationScoreResult,
  recommendation: RecommendationResult,
  ai: AiRecommendation,
  economics: EconomicResult,
): AiDecision {
  if (!ai.llmNeeded) {
    return { key: 'no_ai', label: 'Ohne KI automatisieren', reason: 'Strukturierte, regelbasierte Abläufe – klassische Automatisierung genügt, keine KI-Kosten.' };
  }
  if (recommendation.approach === 'optimization_first') {
    return { key: 'no_go', label: 'Nicht jetzt', reason: 'Prozess zuerst standardisieren – KI würde die heutige Ineffizienz automatisieren.' };
  }
  if (!ai.recommended) {
    return { key: 'no_go', label: 'Nicht jetzt', reason: 'Keine freigegebene Plattform für Datenklasse und Anforderungen.' };
  }
  if (economics.annualRecurringNetValue <= 0) {
    return { key: 'no_go', label: 'Nicht wirtschaftlich', reason: 'Laufende Kosten (inkl. KI-Nutzung) übersteigen den jährlichen Nutzen.' };
  }
  const payback = economics.paybackMonths;
  if (!recommendation.decided || score.isPreliminary || score.score < 60 || payback === null || payback > 24) {
    const why = !recommendation.decided || score.isPreliminary
      ? 'Angaben unvollständig – Bewertung vorläufig.'
      : score.score < 60
        ? `Automation Score ${score.score} – Umsetzungsreife noch begrenzt.`
        : `Amortisation erst nach ${Math.round(payback ?? 0)} Monaten.`;
    return { key: 'check', label: 'Prüfen', reason: why };
  }
  return { key: 'go', label: 'Umsetzen', reason: `Wirtschaftlich (Amortisation ${payback < 1 ? 'unter 1 Monat' : `in ${Math.round(payback)} Monaten`}) und in freigegebener Umgebung umsetzbar.` };
}

export function evaluateProcess(process: BusinessProcess, context: AiContext = DEFAULT_AI_CONTEXT): ProcessEvaluation {
  const score = calculateAutomationScore(process);
  const recommendation = recommendSolution(process.assessment, score.score, score.range.max);
  const profile = resolveAiProfile(process, context.settings);
  const llmNeeded = recommendation.approach !== 'classical';
  const aiRec = recommendAiPlatform(profile, context.catalog, context.settings, llmNeeded);
  const annualRunCost =
    llmNeeded && recommendation.approach !== 'optimization_first' && aiRec.recommended ? aiRec.recommended.annualCostEur : 0;
  const economics = calculateEconomics(economicInputsOf(process), annualRunCost);
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
    nextStep: recommendNextStep(score, recommendation, economics, process.status),
    ai: { profile, recommendation: aiRec, annualRunCost, decision: aiDecision(score, recommendation, aiRec, economics) },
    isPreliminary: score.isPreliminary || recommendation.isPreliminary || !economics.isComplete || priority.isPreliminary,
    openPoints,
  };
}
