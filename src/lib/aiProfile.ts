/**
 * Detects the AI usage profile of a use case from its name, description, systems and assessment.
 * Transparent keyword rules – every detected value lists the words it was derived from.
 * Manual entries in `process.aiProfile` always win over detection.
 */
import {
  AUTOMATED_LEXICON,
  COMPLEX_LEXICON,
  COMPLEXITIES,
  DATA_SENSITIVITIES,
  INTERACTION_MODES,
  INTERACTIVE_LEXICON,
  M365_LEXICON,
  PERSONAL_DATA_LEXICON,
  TASK_LEXICON,
  TASK_TOKEN_DEFAULTS,
  TASK_TYPES,
} from '../config/aiConfig';
import type { Complexity, DataSensitivity, InteractionMode, TaskType } from '../types/ai';
import type { BusinessProcess } from '../types/process';
import type { AiSettings } from './aiSettings';
import { safeAmount } from './calculations';

export type ValueSource = 'auto' | 'manual';

export interface DetectionSignal {
  field: string;
  value: string;
  source: ValueSource;
  reason: string;
}

export interface ResolvedAiProfile {
  taskType: TaskType;
  interactionMode: InteractionMode;
  dataSensitivity: DataSensitivity;
  complexity: Complexity;
  inputTokens: number;
  outputTokens: number;
  usersInvolved: number;
  usersWithCopilot: number;
  monthlyTransactions: number;
  /** Process lives in Outlook/Teams/Word/Excel/SharePoint – where Microsoft 365 Copilot works. */
  m365Context: boolean;
  /** Process needs systems outside Microsoft 365 (SAP, Salesforce, …). */
  needsSystemIntegration: boolean;
  signals: DetectionSignal[];
}

type ProfileSource = Pick<
  BusinessProcess,
  'name' | 'description' | 'otherSystems' | 'systems' | 'department' | 'metrics' | 'assessment' | 'aiProfile'
>;

const TASK_TIE_ORDER: TaskType[] = ['classify', 'extract', 'summarize', 'knowledge', 'draft', 'translate', 'analyze'];
const INTERACTIVE_TASKS: TaskType[] = ['summarize', 'draft', 'knowledge', 'translate'];
const M365_SYSTEMS = new Set(['m365', 'outlook', 'teams', 'sharepoint', 'excel']);
const EXTERNAL_SYSTEMS = new Set(['sap', 'salesforce', 'other']);

const label = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

const quote = (words: string[]) => words.map((w) => `„${w.trim()}“`).join(', ');

function matches(text: string, lexicon: string[]): string[] {
  return lexicon.filter((stem) => text.includes(stem));
}

export function detectTaskType(name: string, description: string): { task: TaskType | null; matched: string[] } {
  const n = name.toLowerCase();
  const d = description.toLowerCase();
  let best: { task: TaskType; score: number; matched: string[] } | null = null;
  for (const task of TASK_TIE_ORDER) {
    const matched = TASK_LEXICON[task].filter((stem) => n.includes(stem) || d.includes(stem));
    // Words in the process name count double – the name states the core task.
    const score = matched.reduce((s, stem) => s + (n.includes(stem) ? 2 : 1), 0);
    if (score > 0 && (!best || score > best.score)) best = { task, score, matched };
  }
  return best ? { task: best.task, matched: best.matched } : { task: null, matched: [] };
}

export function resolveAiProfile(process: ProfileSource, settings: AiSettings): ResolvedAiProfile {
  const overrides = process.aiProfile;
  const text = `${process.name} ${process.description} ${process.otherSystems}`.toLowerCase();
  const signals: DetectionSignal[] = [];
  const a = process.assessment;
  const tx = safeAmount(process.metrics.transactionsPerMonth);

  // --- Context
  const m365Words = matches(text, M365_LEXICON);
  const m365Systems = process.systems.filter((s) => M365_SYSTEMS.has(s));
  const m365Context = m365Words.length > 0 || m365Systems.length > 0;
  const needsSystemIntegration = process.systems.some((s) => EXTERNAL_SYSTEMS.has(s));

  // --- Task type
  let taskType: TaskType;
  if (overrides.taskType) {
    taskType = overrides.taskType;
    signals.push({ field: 'Aufgabentyp', value: label(TASK_TYPES, taskType), source: 'manual', reason: 'manuell festgelegt' });
  } else {
    const detected = detectTaskType(process.name, `${process.description} ${process.otherSystems}`);
    if (detected.task) {
      taskType = detected.task;
      signals.push({ field: 'Aufgabentyp', value: label(TASK_TYPES, taskType), source: 'auto', reason: `erkannt an ${quote(detected.matched)}` });
    } else {
      taskType = a.unstructuredInfo === 'yes' ? (a.ruleBased === 'yes' ? 'extract' : 'analyze') : 'classify';
      signals.push({ field: 'Aufgabentyp', value: label(TASK_TYPES, taskType), source: 'auto', reason: 'keine Schlüsselwörter – aus der Prozessbewertung abgeleitet' });
    }
  }

  // --- Interaction mode
  let interactionMode: InteractionMode;
  if (overrides.interactionMode) {
    interactionMode = overrides.interactionMode;
    signals.push({ field: 'Betriebsart', value: label(INTERACTION_MODES, interactionMode), source: 'manual', reason: 'manuell festgelegt' });
  } else {
    const autoWords = matches(text, AUTOMATED_LEXICON);
    const interWords = matches(text, INTERACTIVE_LEXICON);
    const interactiveTask = INTERACTIVE_TASKS.includes(taskType);
    const autoScore = autoWords.length + (tx >= 1000 ? 2 : tx >= 300 ? 1 : 0) + (interactiveTask ? 0 : 2) + (needsSystemIntegration ? 1 : 0);
    const interScore = interWords.length + (interactiveTask ? 2 : 0) + (m365Context ? 1 : 0);
    interactionMode = autoScore > interScore ? 'automated' : autoScore < interScore ? 'interactive' : interactiveTask ? 'interactive' : 'automated';
    const why = [
      autoWords.length ? `Hinweise auf Automatisierung: ${quote(autoWords)}` : '',
      interWords.length ? `Hinweise auf interaktive Nutzung: ${quote(interWords)}` : '',
      `${new Intl.NumberFormat('de-DE').format(tx)} Vorgänge/Monat`,
    ].filter(Boolean);
    signals.push({ field: 'Betriebsart', value: label(INTERACTION_MODES, interactionMode), source: 'auto', reason: why.join(' · ') });
  }

  // --- Data sensitivity (cautious defaults: never "public" automatically)
  let dataSensitivity: DataSensitivity;
  if (overrides.dataSensitivity) {
    dataSensitivity = overrides.dataSensitivity;
    signals.push({ field: 'Datenklasse', value: label(DATA_SENSITIVITIES, dataSensitivity), source: 'manual', reason: 'manuell festgelegt' });
  } else {
    const personalWords = matches(text, PERSONAL_DATA_LEXICON);
    let reason: string;
    if (process.department === 'hr') {
      dataSensitivity = 'personal';
      reason = 'Fachbereich Personal';
    } else if (a.complianceConcerns === 'yes') {
      dataSensitivity = personalWords.length ? 'personal' : 'confidential';
      reason = personalWords.length ? `Compliance-Bedenken und ${quote(personalWords)}` : 'Compliance-Bedenken angegeben';
    } else if (a.complianceConcerns === 'no') {
      dataSensitivity = 'internal';
      reason = 'keine Compliance-Bedenken – interne Geschäftsdaten';
    } else {
      dataSensitivity = 'confidential';
      reason = 'Compliance-Relevanz unbekannt – vorsichtig als vertraulich eingestuft';
    }
    signals.push({ field: 'Datenklasse', value: label(DATA_SENSITIVITIES, dataSensitivity), source: 'auto', reason });
  }

  // --- Complexity
  let complexity: Complexity;
  if (overrides.complexity) {
    complexity = overrides.complexity;
    signals.push({ field: 'Komplexität', value: label(COMPLEXITIES, complexity), source: 'manual', reason: 'manuell festgelegt' });
  } else {
    // Classification and translation stay simple tasks even if the texts mention demanding topics.
    const complexWords = taskType === 'classify' || taskType === 'translate' ? [] : matches(text, COMPLEX_LEXICON);
    let reason: string;
    if (complexWords.length > 0 || (taskType !== 'classify' && taskType !== 'translate' && a.standardization === 'low') || (taskType === 'analyze' && a.exceptionRate === 'high')) {
      complexity = 'complex';
      reason = complexWords.length ? `anspruchsvolle Inhalte: ${quote(complexWords)}` : 'geringe Standardisierung bzw. viele Ausnahmen';
    } else if (taskType === 'classify' || taskType === 'translate' || (taskType === 'extract' && a.standardization === 'high' && a.exceptionRate === 'low')) {
      complexity = a.standardization === 'low' ? 'standard' : 'simple';
      reason = a.standardization === 'low' ? 'klar umrissene Aufgabe, aber wenig standardisiert' : 'klar umrissene Aufgabe – kleines Modell genügt';
    } else {
      complexity = 'standard';
      reason = 'übliche Geschäftsaufgabe';
    }
    signals.push({ field: 'Komplexität', value: label(COMPLEXITIES, complexity), source: 'auto', reason });
  }

  // --- Tokens per transaction
  const tokenDefault = TASK_TOKEN_DEFAULTS[taskType];
  const manualTokens = overrides.inputTokensPerTransaction !== null || overrides.outputTokensPerTransaction !== null;
  const inputTokens = safeAmount(overrides.inputTokensPerTransaction ?? tokenDefault.input);
  const outputTokens = safeAmount(overrides.outputTokensPerTransaction ?? tokenDefault.output);
  signals.push({
    field: 'Tokens je Vorgang',
    value: `${new Intl.NumberFormat('de-DE').format(inputTokens)} Input / ${new Intl.NumberFormat('de-DE').format(outputTokens)} Output`,
    source: manualTokens ? 'manual' : 'auto',
    reason: manualTokens ? 'manuell festgelegt' : `Standard für „${label(TASK_TYPES, taskType)}“: ${tokenDefault.basis}`,
  });

  // --- Users (only relevant for per-user licences)
  const monthlyHours = (tx * safeAmount(process.metrics.minutesPerTransaction)) / 60;
  const estimatedUsers = Math.max(1, Math.ceil(monthlyHours / Math.max(1, settings.hoursPerUserPerMonth)));
  const usersInvolved = Math.max(1, Math.round(safeAmount(overrides.usersInvolved ?? estimatedUsers)));
  const usersWithCopilot = Math.min(
    usersInvolved,
    Math.round(safeAmount(overrides.usersWithCopilot ?? (usersInvolved * settings.defaultCopilotCoveragePct) / 100)),
  );
  signals.push({
    field: 'Beteiligte Nutzer',
    value: `${usersInvolved}, davon ${usersWithCopilot} mit Copilot-Lizenz`,
    source: overrides.usersInvolved !== null || overrides.usersWithCopilot !== null ? 'manual' : 'auto',
    reason:
      overrides.usersInvolved !== null
        ? 'manuell festgelegt'
        : `geschätzt: ${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(monthlyHours)} h/Monat ÷ ${settings.hoursPerUserPerMonth} h je Person; Lizenzabdeckung ${settings.defaultCopilotCoveragePct} %`,
  });

  if (m365Context) {
    signals.push({
      field: 'Microsoft-365-Kontext',
      value: 'ja',
      source: 'auto',
      reason: [m365Systems.length ? `Systeme: ${m365Systems.join(', ')}` : '', m365Words.length ? `Begriffe: ${quote(m365Words)}` : ''].filter(Boolean).join(' · '),
    });
  }

  return {
    taskType,
    interactionMode,
    dataSensitivity,
    complexity,
    inputTokens,
    outputTokens,
    usersInvolved,
    usersWithCopilot,
    monthlyTransactions: tx,
    m365Context,
    needsSystemIntegration,
    signals,
  };
}
