/**
 * AI platform cost model: annual run cost per option, security gate, M365-first recommendation,
 * Copilot capability check and the OpenRouter cost benchmark. Pure functions – no UI, no network.
 */
import { COPILOT_STUDIO_CREDITS_PER_RUN, DATA_SENSITIVITIES, REQUIRED_QUALITY, SECURITY_TIERS, TASK_TYPES } from '../config/aiConfig';
import type { AiOption, AiPricing, TaskType } from '../types/ai';
import type { ResolvedAiProfile } from './aiProfile';
import type { AiSettings } from './aiSettings';
import { formatCurrency, formatNumber } from './format';

export interface OptionCost {
  option: AiOption;
  annualCostEur: number;
  costPerTransactionEur: number;
  /** How the annual cost was calculated, in words. */
  basis: string;
  eligible: boolean;
  /** Reasons why the option is not eligible (security policy, quality, operating mode). */
  blockers: string[];
  /** Blocked only by the data-class policy (used for the "cost of security" benchmark). */
  blockedOnlyByPolicy: boolean;
}

export type CopilotVerdict = 'yes_license' | 'yes_studio' | 'partial' | 'no' | 'not_needed';

export interface CopilotCheck {
  verdict: CopilotVerdict;
  title: string;
  reasons: string[];
}

export interface AiRecommendation {
  copilot: CopilotCheck;
  options: OptionCost[];
  recommended: OptionCost | null;
  reasons: string[];
  /** Cheapest option that fulfils quality and operating mode, ignoring the security policy. */
  cheapestIgnoringPolicy: OptionCost | null;
  /** Cheapest OpenRouter option as cost benchmark. */
  openRouterBenchmark: OptionCost | null;
  /** Extra annual cost of the compliant recommendation vs. the cheapest option ignoring policy. */
  securityPremiumEur: number;
  annualInputTokens: number;
  annualOutputTokens: number;
  llmNeeded: boolean;
}

const fmtInt = (n: number) => formatNumber(n, 0);
const taskLabel = (t: TaskType) => TASK_TYPES.find((x) => x.value === t)?.label ?? t;
const classLabel = (c: string) => DATA_SENSITIVITIES.find((x) => x.value === c)?.label ?? c;

/** Applies price overrides and removes disabled options. */
export function applyCatalogSettings(catalog: AiOption[], settings: AiSettings): AiOption[] {
  return catalog
    .filter((o) => !settings.disabledOptions.includes(o.id))
    .map((o) => {
      const ov = settings.priceOverrides[o.id];
      if (!ov) return o;
      let pricing: AiPricing = o.pricing;
      if (pricing.model === 'per_token') {
        pricing = {
          ...pricing,
          inputUsdPer1M: ov.inputUsdPer1M ?? pricing.inputUsdPer1M,
          outputUsdPer1M: ov.outputUsdPer1M ?? pricing.outputUsdPer1M,
        };
      } else if (pricing.model === 'per_user') {
        pricing = { ...pricing, pricePerUserMonth: ov.pricePerUserMonth ?? pricing.pricePerUserMonth };
      } else {
        pricing = { ...pricing, eurPerCredit: ov.eurPerCredit ?? pricing.eurPerCredit };
      }
      return { ...o, pricing };
    });
}

/** Annual tokens in reference-tokenizer terms (before a model's own token factor). */
export function annualTokens(profile: ResolvedAiProfile, settings: AiSettings) {
  const runs = profile.monthlyTransactions * 12;
  return {
    input: runs * profile.inputTokens * (1 + settings.tokenOverheadPct / 100),
    output: runs * profile.outputTokens,
  };
}

/** Monthly per-user price in EUR. */
export function userPriceEur(pricing: { pricePerUserMonth: number; currency: 'EUR' | 'USD' }, settings: AiSettings): number {
  return pricing.currency === 'USD' ? pricing.pricePerUserMonth * settings.eurPerUsd : pricing.pricePerUserMonth;
}

const userPriceText = (pricing: { pricePerUserMonth: number; currency: 'EUR' | 'USD' }, settings: AiSettings) =>
  pricing.currency === 'USD'
    ? `${formatNumber(pricing.pricePerUserMonth, 2)} $ × ${formatNumber(settings.eurPerUsd, 3)} €/$`
    : `${formatNumber(pricing.pricePerUserMonth, 2)} €`;

/** Annual run cost of one option for one use case. */
export function optionCost(option: AiOption, profile: ResolvedAiProfile, settings: AiSettings): { annual: number; basis: string } {
  const runs = profile.monthlyTransactions * 12;
  const p = option.pricing;

  if (p.model === 'per_token') {
    const t = annualTokens(profile, settings);
    const f = option.tokenFactor ?? 1;
    const usd = (f * (t.input * p.inputUsdPer1M + t.output * p.outputUsdPer1M)) / 1_000_000;
    return {
      annual: usd * settings.eurPerUsd,
      basis: `${fmtInt(runs)} Vorgänge × (${fmtInt(profile.inputTokens * (1 + settings.tokenOverheadPct / 100) * f)} Input-Tokens à ${formatNumber(p.inputUsdPer1M, 4)} $/Mio. + ${fmtInt(profile.outputTokens * f)} Output-Tokens à ${formatNumber(p.outputUsdPer1M, 4)} $/Mio.) × ${formatNumber(settings.eurPerUsd, 3)} €/$${f !== 1 ? ` – inkl. ${formatNumber((f - 1) * 100, 0)} % mehr Tokens durch den Tokenizer des Modells` : ''}`,
    };
  }

  if (p.model === 'per_user') {
    if (option.channel === 'm365_copilot') {
      const missing = Math.max(0, profile.usersInvolved - profile.usersWithCopilot);
      return {
        annual: missing * userPriceEur(p, settings) * 12,
        basis:
          missing === 0
            ? `alle ${profile.usersInvolved} beteiligten Nutzer bereits lizenziert – keine Zusatzkosten`
            : `${missing} zusätzliche Lizenz(en) × ${userPriceText(p, settings)} × 12 (${profile.usersWithCopilot} bereits lizenziert)`,
      };
    }
    return {
      annual: profile.usersInvolved * userPriceEur(p, settings) * 12,
      basis: `${profile.usersInvolved} Nutzer × ${userPriceText(p, settings)} × 12`,
    };
  }

  // Copilot Studio credits. Interactive agent use by Microsoft-365-Copilot-licensed users carries no credit cost.
  const credits = COPILOT_STUDIO_CREDITS_PER_RUN[profile.taskType];
  const billableShare =
    profile.interactionMode === 'interactive' ? Math.max(0, profile.usersInvolved - profile.usersWithCopilot) / Math.max(1, profile.usersInvolved) : 1;
  return {
    annual: runs * credits * p.eurPerCredit * billableShare,
    basis:
      profile.interactionMode === 'interactive' && billableShare < 1
        ? `${fmtInt(runs)} Vorgänge × ${credits} Credits × ${formatNumber(p.eurPerCredit, 4)} € × ${formatNumber(billableShare * 100, 0)} % nicht lizenzierte Nutzer`
        : `${fmtInt(runs)} Vorgänge × ${credits} Credits × ${formatNumber(p.eurPerCredit, 4)} €`,
  };
}

function blockersFor(option: AiOption, profile: ResolvedAiProfile, settings: AiSettings): { policy: string[]; other: string[] } {
  const policy: string[] = [];
  const other: string[] = [];
  const allowed = settings.tierPolicy[profile.dataSensitivity];
  if (!allowed.includes(option.tier)) {
    policy.push(`Datenklasse „${classLabel(profile.dataSensitivity)}“ erlaubt nur ${allowed.length ? allowed.map((t) => `Stufe ${t}`).join(', ') : 'keine Stufe'}`);
  }
  if (!option.modes.includes(profile.interactionMode)) {
    other.push(profile.interactionMode === 'automated' ? 'nur für interaktive Nutzung' : 'nur für automatisierte Verarbeitung');
  }
  const need = REQUIRED_QUALITY[profile.complexity];
  if (option.quality[profile.taskType] < need) {
    other.push(`Qualität für „${taskLabel(profile.taskType)}“ bei dieser Komplexität nicht ausreichend`);
  }
  return { policy, other };
}

export function copilotCheck(profile: ResolvedAiProfile, options: OptionCost[], settings: AiSettings, llmNeeded: boolean): CopilotCheck {
  if (!llmNeeded) {
    return {
      verdict: 'not_needed',
      title: 'Kein Sprachmodell nötig',
      reasons: ['Strukturierte Daten und feste Regeln – klassische Automatisierung (z. B. Power Automate) genügt; keine KI-Nutzungskosten.'],
    };
  }
  const m365 = options.filter((o) => o.option.tier === 'A');
  const qualityOk = (channel: string) => m365.some((o) => o.option.channel === channel && !o.blockers.some((b) => b.startsWith('Qualität')));
  const fmtTx = fmtInt(profile.monthlyTransactions);

  if (profile.interactionMode === 'interactive') {
    if ((profile.m365Context || ['summarize', 'draft', 'knowledge', 'translate'].includes(profile.taskType)) && qualityOk('m365_copilot')) {
      return {
        verdict: 'yes_license',
        title: 'Ja – mit Microsoft 365 Copilot',
        reasons: [
          `Interaktive Aufgabe „${taskLabel(profile.taskType)}“ durch Mitarbeitende${profile.m365Context ? ' im Microsoft-365-Kontext' : ''}.`,
          profile.usersWithCopilot >= profile.usersInvolved
            ? 'Alle beteiligten Nutzer haben bereits eine Copilot-Lizenz – keine Zusatzkosten.'
            : `${profile.usersInvolved - profile.usersWithCopilot} von ${profile.usersInvolved} Nutzern bräuchten zusätzlich eine Copilot-Lizenz.`,
          'Verarbeitung im CWS-Tenant mit Enterprise Data Protection.',
        ],
      };
    }
    return {
      verdict: 'partial',
      title: 'Teilweise – Copilot mit Agent bzw. Konnektor',
      reasons: [
        profile.needsSystemIntegration ? 'Daten liegen in Systemen außerhalb von Microsoft 365 – ein Copilot-Studio-Agent mit Konnektor ist nötig.' : 'Aufgabe geht über den Standard-Copilot hinaus.',
        'Komplexe Analysen ggf. mit stärkerem Modell im Azure-Tenant prüfen.',
      ],
    };
  }

  if (profile.monthlyTransactions <= settings.highVolumeThreshold && qualityOk('copilot_studio')) {
    return {
      verdict: 'yes_studio',
      title: 'Ja – als Copilot-Studio-Agent',
      reasons: [
        `Automatisierte Verarbeitung von ${fmtTx} Vorgängen/Monat ist mit einem Agenten im Microsoft-365-Tenant umsetzbar (Abrechnung über Copilot Credits).`,
        profile.needsSystemIntegration ? 'Anbindung von SAP/Salesforce über Power-Platform-Konnektoren.' : 'Auslöser und Daten im Microsoft-365-Umfeld (z. B. Postfach, SharePoint).',
      ],
    };
  }
  return {
    verdict: 'no',
    title: 'Nein – besser als Verarbeitung im Azure-Tenant',
    reasons: [
      profile.monthlyTransactions > settings.highVolumeThreshold
        ? `${fmtTx} Vorgänge/Monat liegen über der Schwelle von ${fmtInt(settings.highVolumeThreshold)} – Abrechnung nach Tokens ist deutlich günstiger als Copilot Credits.`
        : 'Die Copilot-Optionen erreichen für diese Aufgabe nicht die nötige Qualität.',
      'Empfehlung: Modell in Microsoft Foundry / Azure OpenAI im CWS-Tenant (EU-Datenzone) – weiterhin geschlossene Umgebung.',
    ],
  };
}

export function recommendAiPlatform(
  profile: ResolvedAiProfile,
  catalog: AiOption[],
  settings: AiSettings,
  llmNeeded: boolean,
): AiRecommendation {
  const runs = profile.monthlyTransactions * 12;
  const options: OptionCost[] = applyCatalogSettings(catalog, settings)
    .map((option) => {
      const { annual, basis } = optionCost(option, profile, settings);
      const { policy, other } = blockersFor(option, profile, settings);
      return {
        option,
        annualCostEur: annual,
        costPerTransactionEur: runs > 0 ? annual / runs : 0,
        basis,
        eligible: policy.length === 0 && other.length === 0,
        blockers: [...policy, ...other],
        blockedOnlyByPolicy: policy.length > 0 && other.length === 0,
      };
    })
    .sort((a, b) => a.annualCostEur - b.annualCostEur || a.option.tier.localeCompare(b.option.tier));

  const tokens = annualTokens(profile, settings);
  const base = {
    options,
    annualInputTokens: tokens.input,
    annualOutputTokens: tokens.output,
    llmNeeded,
  };
  const copilot = copilotCheck(profile, options, settings, llmNeeded);

  const technicallyFit = options.filter((o) => o.eligible || o.blockedOnlyByPolicy);
  const cheapestIgnoringPolicy = technicallyFit[0] ?? null;
  const openRouterBenchmark = technicallyFit.find((o) => o.option.channel === 'openrouter') ?? null;

  const eligible = options.filter((o) => o.eligible);
  if (eligible.length === 0) {
    return {
      ...base,
      copilot,
      recommended: null,
      reasons: [`Keine freigegebene Option für Datenklasse „${classLabel(profile.dataSensitivity)}“ mit ausreichender Qualität – Policy oder Anforderungen prüfen.`],
      cheapestIgnoringPolicy,
      openRouterBenchmark,
      securityPremiumEur: 0,
    };
  }

  const cheapest = eligible[0];
  const bestM365 = eligible.find((o) => o.option.tier === 'A');
  const bestAzure = eligible.find((o) => o.option.tier === 'B');
  const margin = settings.m365PreferenceMarginPct / 100;
  const extraOf = (o: OptionCost) => o.annualCostEur - cheapest.annualCostEur;
  // Closed environment first: stay in the Microsoft 365 tenant, then in the CWS Azure tenant,
  // unless a less integrated option is clearly cheaper (tolerance in percent or absolute euros).
  const withinTolerance = (o: OptionCost) => extraOf(o) <= cheapest.annualCostEur * margin || extraOf(o) <= settings.m365PreferenceAbsoluteEur;
  const toleranceText = `${formatNumber(settings.m365PreferenceMarginPct, 0)} % bzw. ${formatCurrency(settings.m365PreferenceAbsoluteEur)}`;
  const reasons: string[] = [];
  let recommended = cheapest;

  if (bestM365 && bestM365 !== cheapest) {
    if (withinTolerance(bestM365)) {
      recommended = bestM365;
      reasons.push(`M365-first: ${bestM365.option.name} im eigenen Tenant; Mehrkosten gegenüber ${cheapest.option.name} nur ${formatCurrency(extraOf(bestM365))} p. a.`);
    } else {
      reasons.push(`${cheapest.option.name} ist ${formatCurrency(extraOf(bestM365))} p. a. günstiger als ${bestM365.option.name} – mehr als die M365-first-Toleranz (${toleranceText}).`);
    }
  } else if (bestM365) {
    reasons.push(`${bestM365.option.name} ist die günstigste freigegebene Option und läuft im CWS-Microsoft-365-Tenant.`);
  } else {
    reasons.push('Keine Microsoft-365-Option erfüllt Betriebsart und Qualität – günstigste freigegebene Alternative im sichersten Umfeld gewählt.');
  }

  if (recommended.option.tier !== 'A' && bestAzure && bestAzure !== cheapest) {
    if (withinTolerance(bestAzure)) {
      recommended = bestAzure;
      reasons.push(`Geschlossene Umgebung zuerst: ${bestAzure.option.name} im CWS-Azure-Tenant; Mehrkosten gegenüber ${cheapest.option.name} nur ${formatCurrency(extraOf(bestAzure))} p. a.`);
    } else {
      reasons.push(`${cheapest.option.name} ist ${formatCurrency(extraOf(bestAzure))} p. a. günstiger als ${bestAzure.option.name} im Azure-Tenant – mehr als die Toleranz (${toleranceText}).`);
    }
  }
  reasons.push(`${SECURITY_TIERS[recommended.option.tier].label}: ${SECURITY_TIERS[recommended.option.tier].description}`);
  if (recommended.option.channel === 'azure_foundry' || recommended.option.channel === 'vendor_api') {
    reasons.push('Erfordert eine technische Integration (Entwicklung, Betrieb) – im Business Case als Implementierungskosten berücksichtigen.');
  }

  return {
    ...base,
    copilot,
    recommended,
    reasons,
    cheapestIgnoringPolicy,
    openRouterBenchmark,
    securityPremiumEur: cheapestIgnoringPolicy ? Math.max(0, recommended.annualCostEur - cheapestIgnoringPolicy.annualCostEur) : 0,
  };
}

/** Cost of 1,000 transactions of a task type – for the platform price matrix. */
export function costPer1000(option: AiOption, taskType: TaskType, inputTokens: number, outputTokens: number, settings: AiSettings): number | null {
  const p = option.pricing;
  if (p.model === 'per_token') {
    const f = option.tokenFactor ?? 1;
    const usd = (f * (1000 * inputTokens * (1 + settings.tokenOverheadPct / 100) * p.inputUsdPer1M + 1000 * outputTokens * p.outputUsdPer1M)) / 1_000_000;
    return usd * settings.eurPerUsd;
  }
  if (p.model === 'per_credit') return 1000 * COPILOT_STUDIO_CREDITS_PER_RUN[taskType] * p.eurPerCredit;
  return null; // per-user licences do not scale with transactions
}
