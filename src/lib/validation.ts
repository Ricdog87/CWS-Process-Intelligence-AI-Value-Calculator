/**
 * Intake form validation. Errors block saving, warnings are plausibility hints only.
 */
import { PLAUSIBILITY } from '../config/scoringConfig';
import type { Department, ProcessDraft } from '../types/process';
import { formatNumber } from './format';

export type ProcessFormValues = Omit<ProcessDraft, 'department'> & { department: Department | '' };

export type FieldKey =
  | 'name'
  | 'department'
  | 'description'
  | 'otherSystems'
  | `metrics.${keyof ProcessDraft['metrics']}`
  | `scenario.${keyof ProcessDraft['scenario']}`
  | `aiProfile.${keyof ProcessDraft['aiProfile']}`;

export type FieldMessages = Partial<Record<FieldKey, string>>;

export interface ValidationResult {
  errors: FieldMessages;
  warnings: FieldMessages;
  isValid: boolean;
}

interface NumberRule {
  required?: boolean;
  min?: number;
  /** min is exclusive (value must be greater than min). */
  minExclusive?: boolean;
  max: number;
  integer?: boolean;
}

export function checkNumber(value: number | null, rule: NumberRule): string | undefined {
  if (value === null) return rule.required ? 'Pflichtfeld – bitte einen Wert eingeben.' : undefined;
  if (!Number.isFinite(value)) return 'Bitte eine gültige Zahl eingeben (z. B. 1.250 oder 12,5).';
  if (rule.integer && !Number.isInteger(value)) return 'Bitte eine ganze Zahl eingeben.';
  const min = rule.min ?? 0;
  if (rule.minExclusive ? value <= min : value < min) {
    return rule.minExclusive ? `Der Wert muss größer als ${formatNumber(min)} sein.` : `Der Wert darf nicht kleiner als ${formatNumber(min)} sein.`;
  }
  if (value > rule.max) return `Der Wert darf höchstens ${formatNumber(rule.max)} betragen.`;
  return undefined;
}

export function validateProcess(values: ProcessFormValues): ValidationResult {
  const errors: FieldMessages = {};
  const warnings: FieldMessages = {};
  const set = (key: FieldKey, msg: string | undefined) => {
    if (msg) errors[key] = msg;
  };

  const name = values.name.trim();
  if (!name) errors.name = 'Bitte einen Prozessnamen angeben.';
  else if (name.length < 3) errors.name = 'Der Prozessname sollte mindestens 3 Zeichen haben.';
  else if (name.length > 120) errors.name = 'Der Prozessname darf höchstens 120 Zeichen haben.';

  if (!values.department) errors.department = 'Bitte einen Fachbereich auswählen.';
  if (values.description.length > 1000) errors.description = 'Die Beschreibung darf höchstens 1.000 Zeichen haben.';
  if (values.otherSystems.length > 200) errors.otherSystems = 'Bitte höchstens 200 Zeichen verwenden.';
  if (values.systems.includes('other') && !values.otherSystems.trim()) {
    warnings.otherSystems = 'Bitte die sonstigen Systeme kurz benennen.';
  }

  const m = values.metrics;
  set('metrics.transactionsPerMonth', checkNumber(m.transactionsPerMonth, { required: true, min: 1, max: 10_000_000, integer: true }));
  set('metrics.minutesPerTransaction', checkNumber(m.minutesPerTransaction, { required: true, min: 0, minExclusive: true, max: 10_000 }));
  set('metrics.hourlyCost', checkNumber(m.hourlyCost, { min: 0, minExclusive: true, max: 1_000 }));
  set('metrics.errorRatePct', checkNumber(m.errorRatePct, { min: 0, max: 100 }));
  set('metrics.reworkMinutesPerError', checkNumber(m.reworkMinutesPerError, { min: 0, max: 10_000 }));

  const s = values.scenario;
  set('scenario.timeReductionPct', checkNumber(s.timeReductionPct, { min: 0, max: 100 }));
  set('scenario.errorReductionPct', checkNumber(s.errorReductionPct, { min: 0, max: 100 }));
  set('scenario.implementationCost', checkNumber(s.implementationCost, { min: 0, max: 100_000_000 }));
  set('scenario.monthlyOperatingCost', checkNumber(s.monthlyOperatingCost, { min: 0, max: 10_000_000 }));
  set('scenario.annualHardSavings', checkNumber(s.annualHardSavings, { min: 0, max: 100_000_000 }));

  const ai = values.aiProfile;
  set('aiProfile.inputTokensPerTransaction', checkNumber(ai.inputTokensPerTransaction, { min: 0, max: 2_000_000, integer: true }));
  set('aiProfile.outputTokensPerTransaction', checkNumber(ai.outputTokensPerTransaction, { min: 0, max: 200_000, integer: true }));
  set('aiProfile.usersInvolved', checkNumber(ai.usersInvolved, { min: 1, max: 100_000, integer: true }));
  set('aiProfile.usersWithCopilot', checkNumber(ai.usersWithCopilot, { min: 0, max: 100_000, integer: true }));
  if (!errors['aiProfile.usersWithCopilot'] && ai.usersWithCopilot !== null && ai.usersInvolved !== null && ai.usersWithCopilot > ai.usersInvolved) {
    errors['aiProfile.usersWithCopilot'] = 'Kann nicht größer sein als die Zahl der beteiligten Nutzer.';
  }

  // Plausibility hints – only when the value itself is valid.
  if (!errors['metrics.hourlyCost'] && m.hourlyCost !== null) {
    if (m.hourlyCost < PLAUSIBILITY.hourlyCostMin || m.hourlyCost > PLAUSIBILITY.hourlyCostMax) {
      warnings['metrics.hourlyCost'] = `Ungewöhnlicher Stundensatz – üblich sind ca. ${PLAUSIBILITY.hourlyCostMin}–${PLAUSIBILITY.hourlyCostMax} € inkl. Nebenkosten.`;
    }
  }
  if (m.hourlyCost === null) {
    warnings['metrics.hourlyCost'] = 'Ohne Stundensatz kann kein Kapazitätswert berechnet werden.';
  }
  if (!errors['scenario.timeReductionPct'] && s.timeReductionPct !== null && s.timeReductionPct > PLAUSIBILITY.maxRealisticTimeReductionPct) {
    warnings['scenario.timeReductionPct'] = 'Sehr optimistische Annahme – eine Restbearbeitung (Prüfung, Ausnahmen) bleibt meist bestehen.';
  }
  if (!errors['metrics.errorRatePct'] && (m.errorRatePct ?? 0) > 0 && m.reworkMinutesPerError === null) {
    warnings['metrics.reworkMinutesPerError'] = 'Ohne Nacharbeitszeit wird kein Qualitätsnutzen berechnet.';
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
}
