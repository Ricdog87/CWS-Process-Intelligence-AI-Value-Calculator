/**
 * Editable assumptions of the AI cost model (exchange rate, licence coverage, policy, price overrides).
 * Stored separately from the processes so a controller can calibrate prices without touching use cases.
 */
import { AI_ASSUMPTIONS, DEFAULT_TIER_POLICY } from '../config/aiConfig';
import type { DataSensitivity, SecurityTier } from '../types/ai';

export const AI_SETTINGS_KEY = 'cws-process-intelligence:ai-settings:v1';

export interface PriceOverride {
  inputUsdPer1M?: number;
  outputUsdPer1M?: number;
  /** Per-user price in the option's own currency. */
  pricePerUserMonth?: number;
  eurPerCredit?: number;
}

export interface AiSettings {
  /** EUR per 1 USD. */
  eurPerUsd: number;
  tokenOverheadPct: number;
  m365PreferenceMarginPct: number;
  m365PreferenceAbsoluteEur: number;
  defaultCopilotCoveragePct: number;
  hoursPerUserPerMonth: number;
  highVolumeThreshold: number;
  tierPolicy: Record<DataSensitivity, SecurityTier[]>;
  priceOverrides: Record<string, PriceOverride>;
  disabledOptions: string[];
}

export function defaultAiSettings(eurPerUsd: number): AiSettings {
  return {
    eurPerUsd,
    tokenOverheadPct: AI_ASSUMPTIONS.tokenOverheadPct,
    m365PreferenceMarginPct: AI_ASSUMPTIONS.m365PreferenceMarginPct,
    m365PreferenceAbsoluteEur: AI_ASSUMPTIONS.m365PreferenceAbsoluteEur,
    defaultCopilotCoveragePct: AI_ASSUMPTIONS.defaultCopilotCoveragePct,
    hoursPerUserPerMonth: AI_ASSUMPTIONS.hoursPerUserPerMonth,
    highVolumeThreshold: AI_ASSUMPTIONS.highVolumeThreshold,
    tierPolicy: structuredClone(DEFAULT_TIER_POLICY),
    priceOverrides: {},
    disabledOptions: [],
  };
}

const TIERS: SecurityTier[] = ['A', 'B', 'C', 'D'];
const CLASSES: DataSensitivity[] = ['public', 'internal', 'confidential', 'personal'];

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1_000_000 ? value : undefined;
}

/** Accepts anything (e.g. parsed localStorage) and returns valid settings. */
export function sanitizeAiSettings(raw: unknown, defaults: AiSettings): AiSettings {
  if (typeof raw !== 'object' || raw === null) return structuredClone(defaults);
  const r = raw as Record<string, unknown>;

  const tierPolicy = structuredClone(defaults.tierPolicy);
  if (typeof r.tierPolicy === 'object' && r.tierPolicy !== null) {
    for (const cls of CLASSES) {
      const list = (r.tierPolicy as Record<string, unknown>)[cls];
      if (Array.isArray(list)) tierPolicy[cls] = TIERS.filter((t) => list.includes(t));
    }
  }

  const priceOverrides: Record<string, PriceOverride> = {};
  if (typeof r.priceOverrides === 'object' && r.priceOverrides !== null) {
    for (const [id, value] of Object.entries(r.priceOverrides as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null || id.length > 80) continue;
      const v = value as Record<string, unknown>;
      const o: PriceOverride = {
        inputUsdPer1M: positive(v.inputUsdPer1M),
        outputUsdPer1M: positive(v.outputUsdPer1M),
        pricePerUserMonth: positive(v.pricePerUserMonth),
        eurPerCredit: positive(v.eurPerCredit),
      };
      const clean = Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as PriceOverride;
      if (Object.keys(clean).length) priceOverrides[id] = clean;
    }
  }

  return {
    eurPerUsd: num(r.eurPerUsd, defaults.eurPerUsd, 0.3, 3),
    tokenOverheadPct: num(r.tokenOverheadPct, defaults.tokenOverheadPct, 0, 300),
    m365PreferenceMarginPct: num(r.m365PreferenceMarginPct, defaults.m365PreferenceMarginPct, 0, 1000),
    m365PreferenceAbsoluteEur: num(r.m365PreferenceAbsoluteEur, defaults.m365PreferenceAbsoluteEur, 0, 10_000_000),
    defaultCopilotCoveragePct: num(r.defaultCopilotCoveragePct, defaults.defaultCopilotCoveragePct, 0, 100),
    hoursPerUserPerMonth: num(r.hoursPerUserPerMonth, defaults.hoursPerUserPerMonth, 1, 200),
    highVolumeThreshold: num(r.highVolumeThreshold, defaults.highVolumeThreshold, 1, 10_000_000),
    tierPolicy,
    priceOverrides,
    disabledOptions: Array.isArray(r.disabledOptions) ? r.disabledOptions.filter((x): x is string => typeof x === 'string').slice(0, 100) : [],
  };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadAiSettings(storage: StorageLike | null, defaults: AiSettings): AiSettings {
  if (!storage) return structuredClone(defaults);
  try {
    const text = storage.getItem(AI_SETTINGS_KEY);
    return text ? sanitizeAiSettings(JSON.parse(text), defaults) : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

export function saveAiSettings(storage: StorageLike | null, settings: AiSettings): string | null {
  if (!storage) return 'Lokaler Speicher ist nicht verfügbar.';
  try {
    storage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
    return null;
  } catch {
    return 'Einstellungen konnten nicht gespeichert werden.';
  }
}
