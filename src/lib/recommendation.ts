/**
 * Solution approach recommendation – explicit, ordered rules (first match wins).
 * The rules are exported so the methodology page can document them verbatim.
 */
import { OPTIMIZATION_FIRST_MAX_SCORE } from '../config/scoringConfig';
import { levelLabel } from '../config/options';
import type { Level, ProcessAssessment, YesNo, YesPartialNo, YesUnknownNo } from '../types/process';

export type SolutionApproach = 'classical' | 'ai' | 'hybrid' | 'optimization_first';

export const SOLUTION_APPROACHES: Record<SolutionApproach, { label: string; short: string; description: string }> = {
  classical: {
    label: 'Klassische Automatisierung',
    short: 'Klassisch',
    description: 'Workflow-Automatisierung, Schnittstellen und RPA für strukturierte, regelbasierte Abläufe.',
  },
  ai: {
    label: 'KI-gestützte Automatisierung',
    short: 'KI-gestützt',
    description: 'KI interpretiert Texte, Dokumente oder Muster; Menschen prüfen unsichere Fälle (Human-in-the-Loop).',
  },
  hybrid: {
    label: 'Hybride Automatisierung',
    short: 'Hybrid',
    description: 'KI für unstrukturierte Eingänge (Erkennen, Extrahieren), klassische Regeln für die Weiterverarbeitung.',
  },
  optimization_first: {
    label: 'Zuerst Prozessoptimierung',
    short: 'Erst optimieren',
    description: 'Prozess vereinfachen, standardisieren und digitalisieren, bevor automatisiert wird.',
  },
};

export interface RecommendationRule {
  id: string;
  approach: SolutionApproach;
  condition: string;
}

/** Documentation of the decision rules in evaluation order. */
export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    id: 'R1',
    approach: 'optimization_first',
    condition: `Automation Score unter ${OPTIMIZATION_FIRST_MAX_SCORE} (bei offenen Angaben auch im günstigsten Fall) – oder geringe Standardisierung bei fehlenden Regeln bzw. hoher Ausnahmequote – oder weder digitale Daten noch Schnittstellen noch unstrukturierte Eingänge.`,
  },
  {
    id: 'R2',
    approach: 'hybrid',
    condition: 'Unstrukturierte Informationen UND Ablauf vollständig regelbasiert.',
  },
  {
    id: 'R3',
    approach: 'ai',
    condition: 'Unstrukturierte Informationen UND Ablauf nur teilweise oder nicht regelbasiert.',
  },
  {
    id: 'R4',
    approach: 'ai',
    condition: 'Strukturierte Daten, aber keine expliziten Regeln (Entscheidungsunterstützung, z. B. Vorhersagemodelle).',
  },
  {
    id: 'R5',
    approach: 'classical',
    condition: 'Strukturierte Daten UND Ablauf ganz oder überwiegend regelbasiert.',
  },
];

export interface RecommendationResult {
  approach: SolutionApproach;
  label: string;
  description: string;
  ruleId: string;
  reasons: string[];
  considerations: string[];
  /** Assumptions used because answers were missing. */
  assumptions: string[];
  isPreliminary: boolean;
}

interface ResolvedAnswers {
  standardization: Level;
  ruleBased: YesPartialNo;
  digitalData: YesPartialNo;
  integration: YesUnknownNo;
  exceptionRate: Level;
  unstructuredInfo: YesNo;
  complianceConcerns: YesUnknownNo;
}

/** Missing answers fall back to cautious middle assumptions, which are reported to the user. */
function resolveAnswers(a: ProcessAssessment): { answers: ResolvedAnswers; assumptions: string[] } {
  const assumptions: string[] = [];
  const pick = <T>(value: T | null, fallback: T, text: string): T => {
    if (value !== null) return value;
    assumptions.push(text);
    return fallback;
  };
  return {
    answers: {
      standardization: pick(a.standardization, 'medium', 'Standardisierung fehlt – angenommen: „Mittel“.'),
      ruleBased: pick(a.ruleBased, 'partial', 'Regelbasiertheit fehlt – angenommen: „Teilweise“.'),
      digitalData: pick(a.digitalData, 'partial', 'Digitale Daten fehlen – angenommen: „Teilweise“.'),
      integration: pick(a.integration, 'unknown', 'Integration fehlt – angenommen: „Unbekannt“.'),
      exceptionRate: pick(a.exceptionRate, 'medium', 'Ausnahmequote fehlt – angenommen: „Mittel“.'),
      unstructuredInfo: pick(a.unstructuredInfo, 'no', 'Unstrukturierte Informationen fehlen – angenommen: „Nein“.'),
      complianceConcerns: pick(a.complianceConcerns, 'unknown', 'Compliance fehlt – angenommen: „Unbekannt“.'),
    },
    assumptions,
  };
}

function optimizationFirstReasons(a: ResolvedAnswers, score: number, scoreUpperBound: number): string[] {
  const reasons: string[] = [];
  // With open answers, only apply the score rule if even the best case stays below the threshold.
  if (scoreUpperBound < OPTIMIZATION_FIRST_MAX_SCORE) {
    reasons.push(
      scoreUpperBound > score
        ? `Automation Score liegt selbst im günstigsten Fall (max. ${scoreUpperBound}) unter ${OPTIMIZATION_FIRST_MAX_SCORE} – wesentliche Voraussetzungen fehlen noch.`
        : `Automation Score ${score} liegt unter ${OPTIMIZATION_FIRST_MAX_SCORE} – wesentliche Voraussetzungen für eine Automatisierung fehlen noch.`,
    );
  }
  if (a.standardization === 'low' && a.ruleBased === 'no') {
    reasons.push('Geringe Standardisierung und keine festen Regeln – eine Automatisierung würde die heutige Ineffizienz festschreiben.');
  }
  if (a.standardization === 'low' && a.exceptionRate === 'high') {
    reasons.push('Geringe Standardisierung bei hoher Ausnahmequote – erst Varianten reduzieren, dann automatisieren.');
  }
  if (a.digitalData === 'no' && a.integration === 'no' && a.unstructuredInfo === 'no') {
    reasons.push('Weder digitale Eingangsdaten noch Schnittstellen vorhanden – zuerst digitalisieren.');
  }
  return reasons;
}

/**
 * @param automationScore   current score
 * @param scoreUpperBound   best-case score while answers are open (defaults to the score itself)
 */
export function recommendSolution(
  assessment: ProcessAssessment,
  automationScore: number,
  scoreUpperBound: number = automationScore,
): RecommendationResult {
  const { answers: a, assumptions } = resolveAnswers(assessment);
  let approach: SolutionApproach;
  let ruleId: string;
  let reasons: string[];

  const r1 = optimizationFirstReasons(a, automationScore, Math.max(automationScore, scoreUpperBound));
  if (r1.length > 0) {
    approach = 'optimization_first';
    ruleId = 'R1';
    reasons = r1;
  } else if (a.unstructuredInfo === 'yes' && a.ruleBased === 'yes') {
    approach = 'hybrid';
    ruleId = 'R2';
    reasons = [
      'Eingänge enthalten unstrukturierte Informationen (z. B. Freitext, PDF) → KI für Erkennung, Klassifikation oder Extraktion.',
      'Die Weiterverarbeitung folgt festen Regeln → klassische Automatisierung für Prüfung, Buchung und Weiterleitung.',
    ];
  } else if (a.unstructuredInfo === 'yes') {
    approach = 'ai';
    ruleId = 'R3';
    reasons = [
      'Die Kernaufgabe erfordert die Interpretation unstrukturierter Informationen.',
      `Ablauf ist ${a.ruleBased === 'partial' ? 'nur teilweise' : 'nicht'} regelbasiert → feste Regeln allein reichen nicht aus.`,
    ];
  } else if (a.ruleBased === 'no') {
    approach = 'ai';
    ruleId = 'R4';
    reasons = [
      'Entscheidungen folgen keinen expliziten Regeln, die Daten sind aber strukturiert.',
      'KI-/ML-gestützte Entscheidungsunterstützung (z. B. Vorhersage, Bewertung) kann Muster aus historischen Fällen nutzen.',
    ];
  } else {
    approach = 'classical';
    ruleId = 'R5';
    reasons = [
      `Strukturierte Informationen und ${a.ruleBased === 'yes' ? 'feste' : 'überwiegend feste'} Regeln → klassische Automatisierung (Workflow, Schnittstellen, RPA) genügt.`,
      'KI ist nicht erforderlich, da keine unstrukturierten Inhalte interpretiert werden müssen – das senkt Kosten und Risiko.',
    ];
    if (a.standardization !== 'high') {
      reasons.push(`Standardisierung „${levelLabel(a.standardization)}“: Varianten vor der Umsetzung im Detail aufnehmen.`);
    }
  }

  const considerations: string[] = [];
  const usesAi = approach === 'ai' || approach === 'hybrid';
  if (usesAi) {
    considerations.push('KI-Ergebnisse anfangs über Konfidenzschwellen und menschliche Prüfung absichern (Human-in-the-Loop).');
  }
  if (a.complianceConcerns === 'yes') {
    considerations.push(
      usesAi
        ? 'Personenbezogene oder vertrauliche Daten: DSGVO, EU AI Act und ggf. Betriebsrat frühzeitig einbinden.'
        : 'Datenschutz-Anforderungen (Berechtigungen, Löschfristen, Protokollierung) im Lösungsdesign berücksichtigen.',
    );
  }
  if (a.complianceConcerns === 'unknown') {
    considerations.push('Compliance-Relevanz vor einer Pilotierung mit Datenschutz und Informationssicherheit klären.');
  }
  if (approach !== 'optimization_first') {
    if (a.ruleBased === 'partial' && approach === 'classical') {
      considerations.push('Nicht regelbasierte Teilschritte als manuelle Freigabe gestalten.');
    }
    if (a.exceptionRate === 'high') {
      considerations.push('Hohe Ausnahmequote: Standardfälle automatisieren, Sonderfälle gezielt an Mitarbeitende routen.');
    }
    if (a.integration === 'no') {
      considerations.push('Ohne Schnittstelle nur Oberflächenautomatisierung (RPA) möglich – höherer Wartungsaufwand einplanen.');
    }
    if (a.integration === 'unknown') {
      considerations.push('Integrationsfähigkeit der beteiligten Systeme mit der IT klären.');
    }
    if (a.digitalData !== 'yes' && approach === 'classical') {
      considerations.push(
        `Eingangsdaten sind ${a.digitalData === 'no' ? 'nicht' : 'nur teilweise'} digital – Erfassung vorab digitalisieren (z. B. E-Formular).`,
      );
    }
  }

  return {
    approach,
    label: SOLUTION_APPROACHES[approach].label,
    description: SOLUTION_APPROACHES[approach].description,
    ruleId,
    reasons,
    considerations,
    assumptions,
    isPreliminary: assumptions.length > 0,
  };
}
