/**
 * localStorage persistence with schema versioning and defensive sanitizing.
 * Corrupt or foreign data never crashes the app – it is reported and replaced.
 */
import { DEPARTMENTS, STATUSES, SYSTEMS } from '../config/options';
import { createDemoProcesses } from '../data/demoData';
import { EMPTY_AI_PROFILE, type AiProfileInput } from '../types/ai';
import type {
  AutomationScenario,
  BusinessProcess,
  ProcessAssessment,
  ProcessMetrics,
} from '../types/process';

export const STORAGE_KEY = 'cws-process-intelligence:v1';
const SCHEMA_VERSION = 1;

interface StoredPayload {
  version: number;
  processes: unknown[];
}

export type LoadSource = 'stored' | 'demo' | 'recovered';

export interface LoadResult {
  processes: BusinessProcess[];
  source: LoadSource;
  /** User-facing message when something went wrong. */
  warning?: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

const DEPARTMENT_KEYS = DEPARTMENTS.map((d) => d.value);
const SYSTEM_KEYS = SYSTEMS.map((s) => s.value);
const STATUS_KEYS = STATUSES.map((s) => s.value);

/** Returns a valid process or null if the record is unusable. */
export function sanitizeProcess(raw: unknown): BusinessProcess | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id, 100);
  const name = str(raw.name, 200).trim();
  const department = oneOf(raw.department, DEPARTMENT_KEYS);
  if (!id || !name || !department) return null;

  const m = isObject(raw.metrics) ? raw.metrics : {};
  const a = isObject(raw.assessment) ? raw.assessment : {};
  const s = isObject(raw.scenario) ? raw.scenario : {};

  const metrics: ProcessMetrics = {
    transactionsPerMonth: num(m.transactionsPerMonth),
    minutesPerTransaction: num(m.minutesPerTransaction),
    hourlyCost: num(m.hourlyCost),
    errorRatePct: num(m.errorRatePct),
    reworkMinutesPerError: num(m.reworkMinutesPerError),
  };
  const assessment: ProcessAssessment = {
    standardization: oneOf(a.standardization, ['low', 'medium', 'high'] as const),
    ruleBased: oneOf(a.ruleBased, ['yes', 'partial', 'no'] as const),
    digitalData: oneOf(a.digitalData, ['yes', 'partial', 'no'] as const),
    integration: oneOf(a.integration, ['yes', 'unknown', 'no'] as const),
    exceptionRate: oneOf(a.exceptionRate, ['low', 'medium', 'high'] as const),
    unstructuredInfo: oneOf(a.unstructuredInfo, ['yes', 'no'] as const),
    complianceConcerns: oneOf(a.complianceConcerns, ['yes', 'unknown', 'no'] as const),
  };
  const scenario: AutomationScenario = {
    timeReductionPct: num(s.timeReductionPct),
    errorReductionPct: num(s.errorReductionPct),
    implementationCost: num(s.implementationCost),
    monthlyOperatingCost: num(s.monthlyOperatingCost),
    annualHardSavings: num(s.annualHardSavings),
  };

  const ai = isObject(raw.aiProfile) ? raw.aiProfile : {};
  const aiProfile: AiProfileInput = {
    ...EMPTY_AI_PROFILE,
    taskType: oneOf(ai.taskType, ['summarize', 'draft', 'classify', 'extract', 'knowledge', 'analyze', 'translate'] as const),
    interactionMode: oneOf(ai.interactionMode, ['interactive', 'automated'] as const),
    dataSensitivity: oneOf(ai.dataSensitivity, ['public', 'internal', 'confidential', 'personal'] as const),
    complexity: oneOf(ai.complexity, ['simple', 'standard', 'complex'] as const),
    inputTokensPerTransaction: num(ai.inputTokensPerTransaction),
    outputTokensPerTransaction: num(ai.outputTokensPerTransaction),
    usersInvolved: num(ai.usersInvolved),
    usersWithCopilot: num(ai.usersWithCopilot),
  };

  const now = new Date().toISOString();
  const systems = Array.isArray(raw.systems)
    ? Array.from(new Set(raw.systems.map((x) => oneOf(x, SYSTEM_KEYS)).filter((x) => x !== null)))
    : [];

  return {
    id,
    name,
    department,
    description: str(raw.description),
    systems,
    otherSystems: str(raw.otherSystems, 200),
    metrics,
    assessment,
    scenario,
    aiProfile,
    status: oneOf(raw.status, STATUS_KEYS) ?? 'new',
    isDemo: raw.isDemo === true,
    createdAt: str(raw.createdAt, 40) || now,
    updatedAt: str(raw.updatedAt, 40) || now,
  };
}

export function loadProcesses(storage: StorageLike | null): LoadResult {
  if (!storage) {
    return {
      processes: createDemoProcesses(),
      source: 'demo',
      warning: 'Lokaler Speicher ist nicht verfügbar – Änderungen gehen beim Schließen des Browsers verloren.',
    };
  }

  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      processes: createDemoProcesses(),
      source: 'demo',
      warning: 'Lokaler Speicher konnte nicht gelesen werden – Demo-Daten wurden geladen.',
    };
  }

  if (text === null) return { processes: createDemoProcesses(), source: 'demo' };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isObject(parsed) || !Array.isArray((parsed as unknown as StoredPayload).processes)) {
      throw new Error('invalid payload');
    }
    const rawList = (parsed as unknown as StoredPayload).processes;
    const processes = rawList.map(sanitizeProcess).filter((p): p is BusinessProcess => p !== null);
    const dropped = rawList.length - processes.length;
    return {
      processes,
      source: dropped > 0 ? 'recovered' : 'stored',
      warning:
        dropped === 0
          ? undefined
          : dropped === 1
            ? 'Ein beschädigter Datensatz wurde beim Laden übersprungen.'
            : `${dropped} beschädigte Datensätze wurden beim Laden übersprungen.`,
    };
  } catch {
    return {
      processes: createDemoProcesses(),
      source: 'recovered',
      warning: 'Gespeicherte Daten waren beschädigt – Demo-Daten wurden wiederhergestellt.',
    };
  }
}

/** Returns an error message or null on success. */
export function saveProcesses(storage: StorageLike | null, processes: BusinessProcess[]): string | null {
  if (!storage) return 'Lokaler Speicher ist nicht verfügbar.';
  try {
    const payload: StoredPayload = { version: SCHEMA_VERSION, processes };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return null;
  } catch {
    return 'Speichern fehlgeschlagen – der lokale Speicher ist voll oder blockiert.';
  }
}

/** localStorage can throw on access (privacy modes, blocked site data). */
export function getBrowserStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__cws_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
