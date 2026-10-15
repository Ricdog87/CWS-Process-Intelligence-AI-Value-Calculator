import { describe, expect, it } from 'vitest';
import { createDemoProcesses } from '../../data/demoData';
import type { AiOption, TaskType } from '../../types/ai';
import { EMPTY_AI_PROFILE } from '../../types/ai';
import type { BusinessProcess } from '../../types/process';
import { applyCatalogSettings, costPer1000, optionCost, recommendAiPlatform } from '../aiCost';
import { detectTaskType, resolveAiProfile, type ResolvedAiProfile } from '../aiProfile';
import { defaultAiSettings, loadAiSettings, sanitizeAiSettings, AI_SETTINGS_KEY } from '../aiSettings';
import { calculateEconomics } from '../calculations';
import { evaluateProcess } from '../evaluation';

const settings = defaultAiSettings(0.9);
const ALL3: Record<TaskType, 1 | 2 | 3> = { summarize: 3, draft: 3, classify: 3, extract: 3, knowledge: 3, analyze: 3, translate: 3 };
const ALL1: Record<TaskType, 1 | 2 | 3> = { summarize: 1, draft: 1, classify: 1, extract: 1, knowledge: 1, analyze: 1, translate: 1 };

const opt = (o: Partial<AiOption> & Pick<AiOption, 'id' | 'tier' | 'channel' | 'pricing'>): AiOption => ({
  name: o.id,
  vendor: 'Test',
  modes: ['automated'],
  quality: ALL3,
  euDataResidency: true,
  notes: '',
  sourceUrl: 'https://example.com',
  ...o,
});

const CATALOG: AiOption[] = [
  opt({ id: 'copilot', tier: 'A', channel: 'm365_copilot', modes: ['interactive'], pricing: { model: 'per_user', pricePerUserMonth: 30, currency: 'EUR' } }),
  opt({ id: 'studio', tier: 'A', channel: 'copilot_studio', modes: ['interactive', 'automated'], pricing: { model: 'per_credit', eurPerCredit: 0.01 } }),
  opt({ id: 'azure', tier: 'B', channel: 'azure_foundry', pricing: { model: 'per_token', inputUsdPer1M: 1, outputUsdPer1M: 10 } }),
  opt({ id: 'vendor', tier: 'C', channel: 'vendor_api', pricing: { model: 'per_token', inputUsdPer1M: 0.5, outputUsdPer1M: 5 } }),
  opt({ id: 'router', tier: 'D', channel: 'openrouter', pricing: { model: 'per_token', inputUsdPer1M: 0.05, outputUsdPer1M: 0.2 } }),
  opt({ id: 'weak', tier: 'B', channel: 'azure_foundry', quality: ALL1, pricing: { model: 'per_token', inputUsdPer1M: 0.01, outputUsdPer1M: 0.01 } }),
];

const profile = (p: Partial<ResolvedAiProfile> = {}): ResolvedAiProfile => ({
  taskType: 'classify',
  interactionMode: 'automated',
  dataSensitivity: 'internal',
  complexity: 'standard',
  inputTokens: 1000,
  outputTokens: 100,
  usersInvolved: 10,
  usersWithCopilot: 6,
  monthlyTransactions: 1000,
  m365Context: true,
  needsSystemIntegration: false,
  signals: [],
  ...p,
});

const base = (): BusinessProcess => createDemoProcesses()[0];

describe('task detection', () => {
  it.each([
    ['Protokolle Führungskreis', 'Teams-Besprechungen werden zusammengefasst', 'summarize'],
    ['Klassifizierung von Serviceanfragen', 'Anfragen werden kategorisiert und weitergeleitet', 'classify'],
    ['Vertragsdatenextraktion', 'Daten werden in SAP übertragen', 'extract'],
    ['Angebotsentwürfe', 'Angebote in Word', 'draft'],
    ['Richtlinien-Auskunft', 'FAQ und Handbücher', 'knowledge'],
  ])('%s → %s', (name, description, expected) => {
    expect(detectTaskType(name, description).task).toBe(expected);
  });

  it('returns no task when nothing matches', () => {
    expect(detectTaskType('XYZ', 'abc').task).toBeNull();
  });
});

describe('resolveAiProfile', () => {
  it('lets manual entries win over detection', () => {
    const p = { ...base(), aiProfile: { ...EMPTY_AI_PROFILE, taskType: 'translate' as const, dataSensitivity: 'public' as const, inputTokensPerTransaction: 42 } };
    const r = resolveAiProfile(p, settings);
    expect(r.taskType).toBe('translate');
    expect(r.dataSensitivity).toBe('public');
    expect(r.inputTokens).toBe(42);
    expect(r.signals.find((s) => s.field === 'Aufgabentyp')?.source).toBe('manual');
  });

  it('classifies HR as personal data and unknown compliance as confidential – never public automatically', () => {
    const hr = resolveAiProfile({ ...base(), department: 'hr' }, settings);
    expect(hr.dataSensitivity).toBe('personal');
    const unknown = resolveAiProfile({ ...base(), assessment: { ...base().assessment, complianceConcerns: null } }, settings);
    expect(unknown.dataSensitivity).toBe('confidential');
    const none = resolveAiProfile({ ...base(), assessment: { ...base().assessment, complianceConcerns: 'no' } }, settings);
    expect(none.dataSensitivity).toBe('internal');
  });

  it('estimates involved users from manual hours and licence coverage', () => {
    // demo invoice: 2.400 × 6 min = 240 h/month ÷ 20 h per person = 12 users
    const r = resolveAiProfile(base(), { ...settings, defaultCopilotCoveragePct: 50 });
    expect(r.usersInvolved).toBe(12);
    expect(r.usersWithCopilot).toBe(6);
  });

  it('keeps classification simple even when the text mentions contracts', () => {
    const p = { ...base(), name: 'Klassifizierung Anfragen', description: 'Vertragsänderung, Reklamation – kategorisiert' };
    expect(resolveAiProfile(p, settings).complexity).toBe('simple');
  });
});

describe('optionCost', () => {
  it('per token: transactions × tokens (incl. overhead) × price × FX', () => {
    const c = optionCost(CATALOG[2], profile(), settings);
    // 12.000 runs × 1.200 input = 14,4 M × 1 $ + 12.000 × 100 = 1,2 M × 10 $ = 26,4 $ × 0,9
    expect(c.annual).toBeCloseTo(23.76, 6);
  });

  it('per user: only missing Copilot licences cost money', () => {
    expect(optionCost(CATALOG[0], profile(), settings).annual).toBe(4 * 30 * 12);
    expect(optionCost(CATALOG[0], profile({ usersWithCopilot: 10 }), settings).annual).toBe(0);
  });

  it('credits: automated runs pay fully, interactive only for unlicensed users', () => {
    // classify = 7 credits per run
    expect(optionCost(CATALOG[1], profile(), settings).annual).toBeCloseTo(12_000 * 7 * 0.01);
    expect(optionCost(CATALOG[1], profile({ interactionMode: 'interactive' }), settings).annual).toBeCloseTo(12_000 * 7 * 0.01 * 0.4);
  });

  it('cost per 1.000 transactions', () => {
    expect(costPer1000(CATALOG[2], 'classify', 1000, 100, settings)).toBeCloseTo((1000 * 1200 * 1 + 1000 * 100 * 10) / 1e6 * 0.9);
    expect(costPer1000(CATALOG[0], 'classify', 1000, 100, settings)).toBeNull();
  });
});

describe('recommendAiPlatform – security gate and M365-first', () => {
  it('blocks tiers C and D for confidential data and keeps the OpenRouter benchmark', () => {
    const r = recommendAiPlatform(profile({ dataSensitivity: 'confidential' }), CATALOG, settings, true);
    expect(r.recommended?.option.tier).toMatch(/[AB]/);
    expect(r.options.find((o) => o.option.id === 'router')?.eligible).toBe(false);
    expect(r.options.find((o) => o.option.id === 'vendor')?.blockedOnlyByPolicy).toBe(true);
    expect(r.openRouterBenchmark?.option.id).toBe('router');
    expect(r.securityPremiumEur).toBeGreaterThan(0);
  });

  it('allows the open router only for public data', () => {
    const r = recommendAiPlatform(profile({ dataSensitivity: 'public' }), CATALOG, { ...settings, m365PreferenceAbsoluteEur: 0, m365PreferenceMarginPct: 0 }, true);
    expect(r.recommended?.option.id).toBe('router');
    expect(r.securityPremiumEur).toBe(0);
  });

  it('prefers Microsoft 365 when it is within the tolerance', () => {
    const p = profile({ interactionMode: 'interactive', usersWithCopilot: 10 });
    const r = recommendAiPlatform(p, CATALOG, settings, true);
    expect(r.recommended?.option.id).toBe('copilot');
    expect(r.recommended?.annualCostEur).toBe(0);
  });

  it('chooses a cheaper non-M365 option when the difference exceeds the tolerance', () => {
    const p = profile({ monthlyTransactions: 50_000 }); // credits get expensive at high volume
    const r = recommendAiPlatform(p, CATALOG, settings, true);
    expect(r.recommended?.option.channel).not.toBe('copilot_studio');
    expect(r.reasons[0]).toContain('günstiger');
  });

  it('excludes options whose quality is insufficient', () => {
    const r = recommendAiPlatform(profile({ complexity: 'complex' }), CATALOG, settings, true);
    expect(r.options.find((o) => o.option.id === 'weak')?.eligible).toBe(false);
  });

  it('returns no recommendation if the policy allows no tier', () => {
    const strict = { ...settings, tierPolicy: { ...settings.tierPolicy, personal: [] } };
    const r = recommendAiPlatform(profile({ dataSensitivity: 'personal' }), CATALOG, strict, true);
    expect(r.recommended).toBeNull();
  });

  it('prefers the Azure tenant over a slightly cheaper vendor API (closed environment first)', () => {
    const cat = CATALOG.map((o) => (o.id === 'vendor' ? { ...o, pricing: { model: 'per_token' as const, inputUsdPer1M: 0.9, outputUsdPer1M: 9 } } : o));
    const r = recommendAiPlatform(profile({ monthlyTransactions: 50_000 }), cat, settings, true);
    expect(r.recommended?.option.id).toBe('azure');
    expect(r.reasons.some((x) => x.startsWith('Geschlossene Umgebung zuerst'))).toBe(true);
  });

  it('converts USD seat prices with the exchange rate and applies the token factor', () => {
    const seat = opt({ id: 'seat', tier: 'C', channel: 'vendor_api', modes: ['interactive'], pricing: { model: 'per_user', pricePerUserMonth: 20, currency: 'USD' } });
    expect(optionCost(seat, profile({ usersInvolved: 10 }), settings).annual).toBeCloseTo(10 * 20 * 0.9 * 12);
    const base = optionCost(CATALOG[2], profile(), settings).annual;
    expect(optionCost({ ...CATALOG[2], tokenFactor: 1.3 }, profile(), settings).annual).toBeCloseTo(base * 1.3);
  });

  it('respects disabled options and price overrides', () => {
    const s = { ...settings, disabledOptions: ['router'], priceOverrides: { azure: { inputUsdPer1M: 2 } } };
    const cat = applyCatalogSettings(CATALOG, s);
    expect(cat.some((o) => o.id === 'router')).toBe(false);
    const azure = cat.find((o) => o.id === 'azure')!;
    expect(azure.pricing.model === 'per_token' && azure.pricing.inputUsdPer1M).toBe(2);
  });
});

describe('Copilot check', () => {
  it.each([
    [profile({ interactionMode: 'interactive', taskType: 'summarize' }), true, 'yes_license'],
    [profile({ monthlyTransactions: 2_000 }), true, 'yes_studio'],
    [profile({ monthlyTransactions: 20_000 }), true, 'no'],
    [profile(), false, 'not_needed'],
  ])('%#', (p, needed, verdict) => {
    expect(recommendAiPlatform(p, CATALOG, settings, needed).copilot.verdict).toBe(verdict);
  });
});

describe('economics with AI run cost and decisions', () => {
  it('subtracts AI run cost from recurring value and adds it to first-year costs', () => {
    const inputs = { ...base().metrics, ...base().scenario };
    const without = calculateEconomics(inputs);
    const withAi = calculateEconomics(inputs, 1_000);
    expect(withAi.annualRecurringNetValue).toBeCloseTo(without.annualRecurringNetValue - 1_000);
    expect(withAi.firstYearCosts).toBeCloseTo(without.firstYearCosts + 1_000);
    expect(withAi.annualAiRunCost).toBe(1_000);
  });

  it('gives each demo use case a decision, and no KI costs for classical automation', () => {
    for (const p of createDemoProcesses()) {
      const e = evaluateProcess(p);
      expect(['go', 'check', 'no_go', 'no_ai']).toContain(e.ai.decision.key);
      if (e.recommendation.approach === 'classical') {
        expect(e.ai.decision.key).toBe('no_ai');
        expect(e.ai.annualRunCost).toBe(0);
      }
    }
  });

  it('serves the management meeting minutes with existing Copilot licences at no extra cost', () => {
    const p = createDemoProcesses().find((x) => x.id === 'demo-management-meeting-minutes')!;
    const e = evaluateProcess(p);
    expect(e.ai.recommendation.copilot.verdict).toBe('yes_license');
    expect(e.ai.recommendation.recommended?.option.channel).toBe('m365_copilot');
    expect(e.ai.annualRunCost).toBe(0);
  });
});

describe('AI settings persistence', () => {
  it('sanitizes invalid values and unknown tiers', () => {
    const s = sanitizeAiSettings({ eurPerUsd: -1, tokenOverheadPct: 'x', tierPolicy: { public: ['A', 'Z'] }, priceOverrides: { a: { inputUsdPer1M: -5, outputUsdPer1M: 3 } } }, settings);
    expect(s.eurPerUsd).toBe(settings.eurPerUsd);
    expect(s.tokenOverheadPct).toBe(settings.tokenOverheadPct);
    expect(s.tierPolicy.public).toEqual(['A']);
    expect(s.priceOverrides.a).toEqual({ outputUsdPer1M: 3 });
  });

  it('falls back to defaults on corrupt storage', () => {
    const storage = { getItem: (k: string) => (k === AI_SETTINGS_KEY ? '{broken' : null), setItem: () => undefined };
    expect(loadAiSettings(storage, settings)).toEqual(settings);
  });
});
