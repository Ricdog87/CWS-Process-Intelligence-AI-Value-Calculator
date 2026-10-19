/**
 * C-level cockpit aggregation: portfolio totals, platform mix, scenario comparison and key statements.
 * Pure functions over evaluated use cases.
 */
import type { AiChannel } from '../types/ai';
import type { PortfolioRow } from './csv';
import type { AiDecisionKey } from './evaluation';
import { formatCurrency, formatNumber } from './format';
import { paybackPeriodMonths } from './calculations';

export const CHANNEL_LABELS: Record<AiChannel, string> = {
  m365_copilot: 'Microsoft 365 Copilot (Lizenzen)',
  copilot_studio: 'Copilot Chat + Agenten (Credits)',
  azure_foundry: 'Azure OpenAI / Foundry (Tokens)',
  vendor_api: 'Anthropic / OpenAI (Anbieter-Vertrag)',
  openrouter: 'OpenRouter',
};

export const DECISION_ORDER: AiDecisionKey[] = ['go', 'check', 'no_go', 'no_ai'];

export interface CockpitSummary {
  total: number;
  aiUseCases: number;
  /** AI use cases with decision go or check – the realistic pipeline. */
  inScope: number;
  decisions: Record<AiDecisionKey, { count: number; netRecurring: number }>;
  grossBenefit: number;
  aiRunCost: number;
  otherOperatingCost: number;
  implementationCost: number;
  netRecurring: number;
  firstYearNet: number;
  roiFirstYearPct: number | null;
  paybackMonths: number | null;
  costByChannel: { channel: AiChannel; label: string; cost: number; count: number }[];
  m365Count: number;
  m365NoExtraCostCount: number;
  closedEnvironmentCount: number;
  scenarios: {
    recommended: number;
    m365Only: number;
    m365OnlyCoverable: number;
    cheapestIgnoringPolicy: number;
  };
  securityPremium: number;
  insights: string[];
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export function sortForCockpit(rows: PortfolioRow[]): PortfolioRow[] {
  return [...rows].sort((a, b) => {
    const d = DECISION_ORDER.indexOf(a.evaluation.ai.decision.key) - DECISION_ORDER.indexOf(b.evaluation.ai.decision.key);
    return d !== 0 ? d : b.evaluation.economics.annualRecurringNetValue - a.evaluation.economics.annualRecurringNetValue;
  });
}

export function summarizeCockpit(rows: PortfolioRow[]): CockpitSummary {
  const decisions = Object.fromEntries(DECISION_ORDER.map((k) => [k, { count: 0, netRecurring: 0 }])) as CockpitSummary['decisions'];
  for (const { evaluation: e } of rows) {
    decisions[e.ai.decision.key].count++;
    decisions[e.ai.decision.key].netRecurring += e.economics.annualRecurringNetValue;
  }

  const ai = rows.filter((r) => r.evaluation.ai.recommendation.llmNeeded);
  const scope = ai.filter((r) => r.evaluation.ai.decision.key === 'go' || r.evaluation.ai.decision.key === 'check');

  let grossBenefit = 0;
  let aiRunCost = 0;
  let otherOperatingCost = 0;
  let implementationCost = 0;
  const byChannel = new Map<AiChannel, { cost: number; count: number }>();
  let m365Count = 0;
  let m365NoExtraCostCount = 0;
  let closedEnvironmentCount = 0;
  let m365Only = 0;
  let m365OnlyCoverable = 0;
  let cheapestIgnoringPolicy = 0;
  let securityPremium = 0;
  let azureVsCreditsSaving = 0;
  let azureVsCreditsCount = 0;
  let agentVsLicenceSaving = 0;
  let agentVsLicenceCount = 0;

  for (const { evaluation: e } of scope) {
    const eco = e.economics;
    const rec = e.ai.recommendation;
    grossBenefit += eco.annualGrossBenefit;
    aiRunCost += eco.annualAiRunCost;
    otherOperatingCost += eco.annualOperatingCosts;
    implementationCost += eco.implementationCost;
    if (!rec.recommended) continue;

    const ch = rec.recommended.option.channel;
    const entry = byChannel.get(ch) ?? { cost: 0, count: 0 };
    entry.cost += rec.recommended.annualCostEur;
    entry.count++;
    byChannel.set(ch, entry);

    if (rec.recommended.option.tier === 'A') {
      m365Count++;
      if (rec.recommended.annualCostEur === 0) m365NoExtraCostCount++;
    }
    if (rec.recommended.option.tier === 'A' || rec.recommended.option.tier === 'B') closedEnvironmentCount++;

    const bestA = rec.options.find((o) => o.eligible && o.option.tier === 'A');
    if (bestA) {
      m365Only += bestA.annualCostEur;
      m365OnlyCoverable++;
    }
    cheapestIgnoringPolicy += rec.cheapestIgnoringPolicy?.annualCostEur ?? rec.recommended.annualCostEur;
    securityPremium += rec.securityPremiumEur;

    const studio = rec.options.find((o) => o.eligible && o.option.channel === 'copilot_studio');
    if (ch === 'azure_foundry' && studio && studio.annualCostEur > rec.recommended.annualCostEur) {
      azureVsCreditsSaving += studio.annualCostEur - rec.recommended.annualCostEur;
      azureVsCreditsCount++;
    }
    const licence = rec.options.find((o) => o.eligible && o.option.channel === 'm365_copilot');
    if (ch === 'copilot_studio' && licence && licence.annualCostEur > rec.recommended.annualCostEur) {
      agentVsLicenceSaving += licence.annualCostEur - rec.recommended.annualCostEur;
      agentVsLicenceCount++;
    }
  }

  const netRecurring = grossBenefit - otherOperatingCost - aiRunCost;
  const firstYearCosts = implementationCost + otherOperatingCost + aiRunCost;
  const firstYearNet = grossBenefit - firstYearCosts;

  const insights: string[] = [];
  if (scope.length > 0) {
    insights.push(
      `${m365Count} von ${scope.length} umsetzbaren KI-Use-Cases laufen im Microsoft-365-Tenant${m365NoExtraCostCount ? `, ${m365NoExtraCostCount} davon mit vorhandenen Copilot-Lizenzen ohne Zusatzkosten` : ''}.`,
    );
    insights.push(
      `Laufende KI-Nutzungskosten ${formatCurrency(aiRunCost)} p. a. = ${formatNumber(pct(aiRunCost, grossBenefit), 1)} % des Nutzens (${formatCurrency(grossBenefit)}). Die Kostentreiber sind Implementierung (${formatCurrency(implementationCost)} einmalig) und Betrieb (${formatCurrency(otherOperatingCost)} p. a.).`,
    );
    if (azureVsCreditsCount > 0) {
      insights.push(
        `Bei hohem Volumen ist die Verarbeitung im CWS-Azure-Tenant günstiger als Copilot Credits: ${formatCurrency(azureVsCreditsSaving)} p. a. weniger bei ${azureVsCreditsCount} Use Case(s) – weiterhin geschlossene Umgebung.`,
      );
    }
    if (agentVsLicenceCount > 0) {
      insights.push(
        `Für ${agentVsLicenceCount} Use Case(s) ist ein Agent über Copilot Chat günstiger als zusätzliche Copilot-Lizenzen: ${formatCurrency(agentVsLicenceSaving)} p. a. weniger.`,
      );
    }
    const securityShare = pct(securityPremium, grossBenefit);
    insights.push(
      securityPremium < 1
        ? 'Preis der Sicherheit: praktisch null – die freigegebenen Plattformen im CWS-Tenant liegen auf dem Preisniveau des günstigsten offenen Anbieters (z. B. OpenRouter).'
        : securityShare < 0.05
          ? `Preis der Sicherheit: praktisch null – ${formatCurrency(securityPremium)} p. a. mehr als der günstigste offene Anbieter (z. B. OpenRouter), unter 0,05 % des Nutzens.`
          : `Preis der Sicherheit: Die geschlossene Umgebung kostet ${formatCurrency(securityPremium)} p. a. mehr als der günstigste offene Anbieter (z. B. OpenRouter) – ${formatNumber(securityShare, 2)} % des Nutzens.`,
    );
  }
  insights.push(
    `${decisions.go.count} Use Case(s) sofort umsetzbar, ${decisions.check.count} zu prüfen, ${decisions.no_go.count} nicht jetzt, ${decisions.no_ai.count} ohne KI automatisierbar.`,
  );

  return {
    total: rows.length,
    aiUseCases: ai.length,
    inScope: scope.length,
    decisions,
    grossBenefit,
    aiRunCost,
    otherOperatingCost,
    implementationCost,
    netRecurring,
    firstYearNet,
    roiFirstYearPct: firstYearCosts > 0 ? (firstYearNet / firstYearCosts) * 100 : null,
    paybackMonths: paybackPeriodMonths(implementationCost, netRecurring),
    costByChannel: [...byChannel.entries()]
      .map(([channel, v]) => ({ channel, label: CHANNEL_LABELS[channel], ...v }))
      .sort((a, b) => b.cost - a.cost || b.count - a.count),
    m365Count,
    m365NoExtraCostCount,
    closedEnvironmentCount,
    scenarios: { recommended: aiRunCost, m365Only, m365OnlyCoverable, cheapestIgnoringPolicy },
    securityPremium,
    insights,
  };
}
