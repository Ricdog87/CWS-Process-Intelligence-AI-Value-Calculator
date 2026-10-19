/**
 * Catalog of AI platforms and models with list prices (excl. VAT, no negotiated discounts).
 * Researched from the vendors' official price pages at PRICES_AS_OF – source per entry.
 * A controller can override every price on the "Preise & Annahmen" page (e.g. with Enterprise-Agreement prices).
 */
import type { AiOption, TaskType } from '../types/ai';

export const PRICES_AS_OF = '15.10.2026';

/** EUR per USD: ECB reference rate of 14.10.2026 (1 € = 1,1195 $). */
export const DEFAULT_EUR_PER_USD = 0.8933;
export const FX_SOURCE = 'EZB-Referenzkurs 14.10.2026 (1 € = 1,1195 $)';

type Quality = Record<TaskType, 1 | 2 | 3>;
const SMALL: Quality = { summarize: 2, draft: 1, classify: 2, extract: 2, knowledge: 2, analyze: 1, translate: 2 };
const MID: Quality = { summarize: 3, draft: 2, classify: 3, extract: 3, knowledge: 2, analyze: 2, translate: 3 };
const FRONTIER: Quality = { summarize: 3, draft: 3, classify: 3, extract: 3, knowledge: 3, analyze: 3, translate: 3 };

/**
 * Claude 4.7+ uses a new tokenizer (Anthropic: about 30 % more tokens than its predecessors).
 * Measured on German text it counts about twice as many tokens as OpenAI's o200k tokenizer, which the token defaults use.
 */
const CLAUDE_TOKEN_FACTOR = 2;
/** OpenRouter: provider list price plus 5.5 % platform fee on credit purchases (Standard plan). */
const OPENROUTER_FEE = 1.055;
const or = (usd: number) => Math.round(usd * OPENROUTER_FEE * 10_000) / 10_000;

const AZURE_PRICES = 'https://azure.microsoft.com/de-de/pricing/details/azure-openai/';
const ANTHROPIC_PRICES = 'https://platform.claude.com/docs/en/about-claude/pricing';
const OPENROUTER_MODELS = 'https://openrouter.ai/models';

export const AI_CATALOG: AiOption[] = [
  // --- Stufe A: Microsoft-365-Tenant
  {
    id: 'm365-copilot',
    name: 'Microsoft 365 Copilot (Lizenz)',
    vendor: 'Microsoft',
    channel: 'm365_copilot',
    tier: 'A',
    modes: ['interactive'],
    quality: { summarize: 3, draft: 3, classify: 2, extract: 2, knowledge: 3, analyze: 3, translate: 3 },
    pricing: { model: 'per_user', pricePerUserMonth: 26, currency: 'EUR' },
    euDataResidency: true,
    notes:
      'Seit 08/2026 „Microsoft Copilot“. 26,00 € je Nutzer/Monat bei jährlicher Zahlung (27,30 € bei monatlicher Zahlung); Copilot Business 18,20 € nur bis 300 Nutzer. In Outlook, Teams, Word, Excel, PowerPoint und SharePoint; EU Data Boundary. Bereits lizenzierte Nutzer verursachen keine Zusatzkosten.',
    sourceUrl: 'https://www.microsoft.com/de-de/microsoft-365-copilot/enterprise',
  },
  {
    id: 'copilot-studio',
    name: 'Copilot Chat + Agent (Credits)',
    vendor: 'Microsoft',
    channel: 'copilot_studio',
    tier: 'A',
    modes: ['interactive', 'automated'],
    quality: { summarize: 3, draft: 2, classify: 2, extract: 2, knowledge: 3, analyze: 2, translate: 2 },
    pricing: { model: 'per_credit', eurPerCredit: 0.006932 },
    euDataResidency: true,
    notes:
      'Agent (Copilot Studio) im Microsoft-365-Tenant, nutzbar auch ohne Copilot-Lizenz über Copilot Chat. Credit-Pack 173,30 € je 25.000 Credits/Monat (= 0,0069 €/Credit, nicht genutzte Credits verfallen); Pay-as-you-go 0,01 $/Credit. Für lizenzierte Nutzer sind interaktive Agenten enthalten.',
    sourceUrl: 'https://www.microsoft.com/de-de/microsoft-copilot/microsoft-copilot-studio',
  },
  // --- Stufe B: CWS-Azure-Tenant (Microsoft Foundry, EU-Datenzone)
  {
    id: 'azure-gpt5-nano',
    name: 'GPT-5 nano (Azure, EU-Datenzone)',
    vendor: 'Microsoft / OpenAI',
    channel: 'azure_foundry',
    tier: 'B',
    modes: ['automated'],
    quality: SMALL,
    pricing: { model: 'per_token', inputUsdPer1M: 0.055, outputUsdPer1M: 0.44 },
    euDataResidency: true,
    notes: 'Kleinstes Modell – für Klassifikation und einfache Extraktion. EU-Datenzone = Global-Preis +10 %.',
    sourceUrl: AZURE_PRICES,
  },
  {
    id: 'azure-gpt6-luna',
    name: 'GPT-6 Luna (Azure, EU-Datenzone)',
    vendor: 'Microsoft / OpenAI',
    channel: 'azure_foundry',
    tier: 'B',
    modes: ['automated'],
    quality: MID,
    pricing: { model: 'per_token', inputUsdPer1M: 0.12, outputUsdPer1M: 0.6 },
    euDataResidency: true,
    notes: 'Aktuelles Volumenmodell der GPT-6-Familie. EU-Datenzone = Global-Preis +20 %; Flex-Verarbeitung (nicht zeitkritisch) 50 % günstiger – nicht eingerechnet.',
    sourceUrl: AZURE_PRICES,
  },
  {
    id: 'azure-gpt61-sol',
    name: 'GPT-6.1 Sol (Azure, EU-Datenzone)',
    vendor: 'Microsoft / OpenAI',
    channel: 'azure_foundry',
    tier: 'B',
    modes: ['automated'],
    quality: FRONTIER,
    pricing: { model: 'per_token', inputUsdPer1M: 2.4, outputUsdPer1M: 12 },
    euDataResidency: true,
    notes: 'Spitzenklasse für komplexe Analysen und lange Dokumente (nahe GPT-6 Astra zu einem Fünftel des Preises). EU-Datenzone = Global-Preis +20 %.',
    sourceUrl: AZURE_PRICES,
  },
  // --- Stufe C: Anbieter mit Enterprise-Vertrag
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 5.5 (Anthropic / Foundry)',
    vendor: 'Anthropic',
    channel: 'vendor_api',
    tier: 'C',
    modes: ['automated'],
    quality: MID,
    pricing: { model: 'per_token', inputUsdPer1M: 0.1, outputUsdPer1M: 0.5 },
    tokenFactor: CLAUDE_TOKEN_FACTOR,
    euDataResidency: false,
    notes:
      'Gleicher Preis direkt oder über Microsoft Foundry (Azure-Rechnung). Anthropic verarbeitet als eigenständiger Auftragsverarbeiter; nur Global/US, keine EU-Datenzone. Prompts > 100.000 Tokens: 0,50 $/2,50 $.',
    sourceUrl: ANTHROPIC_PRICES,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 5.5 (Anthropic / Foundry)',
    vendor: 'Anthropic',
    channel: 'vendor_api',
    tier: 'C',
    modes: ['automated'],
    quality: FRONTIER,
    pricing: { model: 'per_token', inputUsdPer1M: 2, outputUsdPer1M: 10 },
    tokenFactor: CLAUDE_TOKEN_FACTOR,
    euDataResidency: false,
    notes: 'Stark bei langen Dokumenten und Analysen. Gleicher Preis direkt oder über Microsoft Foundry; keine EU-Datenzone.',
    sourceUrl: ANTHROPIC_PRICES,
  },
  {
    id: 'openai-gpt6-luna-eu',
    name: 'GPT-6 Luna (OpenAI API, EU-Residenz)',
    vendor: 'OpenAI',
    channel: 'vendor_api',
    tier: 'C',
    modes: ['automated'],
    quality: MID,
    pricing: { model: 'per_token', inputUsdPer1M: 0.11, outputUsdPer1M: 0.55 },
    euDataResidency: true,
    notes: 'Direkte API mit EU-Datenresidenz (+10 %); setzt Freigabe durch OpenAI-Vertrieb und Zero-Data-Retention-Vereinbarung voraus.',
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
  },
  {
    id: 'chatgpt-business',
    name: 'ChatGPT Business (Arbeitsplatz)',
    vendor: 'OpenAI',
    channel: 'vendor_api',
    tier: 'C',
    modes: ['interactive'],
    quality: FRONTIER,
    pricing: { model: 'per_user', pricePerUserMonth: 20, currency: 'USD' },
    euDataResidency: false,
    notes:
      '20 $ je Nutzer/Monat bei jährlicher Zahlung (2–200 Plätze). ChatGPT Enterprise ohne Listenpreis (Angebot); EU-Datenresidenz nur bei Enterprise. Kein Zugriff auf M365-Daten ohne Konnektoren.',
    sourceUrl: 'https://help.openai.com/en/articles/8542115-chatgpt-business-general-faq',
  },
  {
    id: 'claude-team',
    name: 'Claude Team (Arbeitsplatz)',
    vendor: 'Anthropic',
    channel: 'vendor_api',
    tier: 'C',
    modes: ['interactive'],
    quality: FRONTIER,
    pricing: { model: 'per_user', pricePerUserMonth: 20, currency: 'USD' },
    euDataResidency: false,
    notes: '20 $ je Nutzer/Monat bei jährlicher Zahlung (2–150 Plätze). Claude Enterprise: 20 $ je Platz plus Nutzung zu API-Preisen, ab 20 Plätzen.',
    sourceUrl: 'https://claude.com/pricing',
  },
  // --- Stufe D: Offener Router (Kosten-Benchmark)
  {
    id: 'openrouter-floor',
    name: 'OpenRouter – günstigstes Modell',
    vendor: 'OpenRouter (wechselnde Anbieter)',
    channel: 'openrouter',
    tier: 'D',
    modes: ['automated'],
    quality: SMALL,
    pricing: { model: 'per_token', inputUsdPer1M: or(0.09), outputUsdPer1M: or(0.18) },
    euDataResidency: false,
    notes:
      'Preis-Routing auf den billigsten Anbieter (z. B. DeepSeek V4 Flash, US-Hosting) inkl. 5,5 % Plattformgebühr. US-Unternehmen, wechselnde Unterauftragnehmer – nur Kostenbenchmark bzw. für öffentliche Daten.',
    sourceUrl: OPENROUTER_MODELS,
  },
  {
    id: 'openrouter-nano',
    name: 'OpenRouter – GPT-5 nano',
    vendor: 'OpenRouter (wechselnde Anbieter)',
    channel: 'openrouter',
    tier: 'D',
    modes: ['automated'],
    quality: SMALL,
    pricing: { model: 'per_token', inputUsdPer1M: or(0.05), outputUsdPer1M: or(0.4) },
    euDataResidency: false,
    notes: 'Günstigster Input-Preis am Markt inkl. 5,5 % Plattformgebühr – dasselbe Modell wie im Azure-Tenant, aber ohne EU-Datenzone.',
    sourceUrl: OPENROUTER_MODELS,
  },
  {
    id: 'openrouter-value',
    name: 'OpenRouter – Mittelklasse (Mistral Small 4)',
    vendor: 'OpenRouter (wechselnde Anbieter)',
    channel: 'openrouter',
    tier: 'D',
    modes: ['automated'],
    quality: MID,
    pricing: { model: 'per_token', inputUsdPer1M: or(0.15), outputUsdPer1M: or(0.6) },
    euDataResidency: false,
    notes: 'Günstiges Mittelklasse-Modell inkl. 5,5 % Plattformgebühr. Keine geschlossene Umgebung.',
    sourceUrl: OPENROUTER_MODELS,
  },
  {
    id: 'openrouter-large',
    name: 'OpenRouter – Spitzenklasse (Mistral Large 4)',
    vendor: 'OpenRouter (wechselnde Anbieter)',
    channel: 'openrouter',
    tier: 'D',
    modes: ['automated'],
    quality: FRONTIER,
    pricing: { model: 'per_token', inputUsdPer1M: or(1.36), outputUsdPer1M: or(4.18) },
    euDataResidency: false,
    notes:
      'Regulärer Listenpreis 1,36 $/4,18 $ je Mio. Tokens (der befristete Aktionspreis 0,68 $/2,09 $ ist nicht angesetzt), inkl. 5,5 % Plattformgebühr. Keine geschlossene Umgebung – nur Benchmark.',
    sourceUrl: OPENROUTER_MODELS,
  },
];

/** Facts behind the prices – shown on the "Preise & Annahmen" page. */
export const PRICE_FACTS: { title: string; text: string; sourceUrl: string; tone?: 'secure' | 'risk' }[] = [
  {
    title: 'Listenpreise ohne Rabatte',
    text: 'Alle Preise sind Listenpreise ohne MwSt. Rabatte aus Enterprise Agreement, MACC oder Rahmenverträgen sind nicht berücksichtigt – verhandelte Preise unten eintragen.',
    sourceUrl: 'https://www.microsoft.com/de-de/microsoft-365-copilot/enterprise',
  },
  {
    title: 'Copilot Credits',
    text: 'Generative Antwort 2 Credits, Aktion 5, Grounding auf Tenant-Daten 10, Dokumentverarbeitung 8 je Seite. Pack: 173,30 € für 25.000 Credits pro Monat; Pay-as-you-go 0,01 $ je Credit.',
    sourceUrl: 'https://learn.microsoft.com/de-de/microsoft-copilot-studio/requirements-messages-management',
  },
  {
    title: 'Azure EU-Datenzone',
    text: 'Verarbeitung nur in EU-Rechenzentren: GPT-6-Familie +20 %, GPT-5.x +10 % gegenüber Global. Batch/Flex für nicht zeitkritische Läufe 50 % günstiger – im Tool konservativ nicht eingerechnet.',
    sourceUrl: AZURE_PRICES,
  },
  {
    title: '„Immer das günstigste Modell“ – auch im eigenen Tenant',
    text: 'Der Azure Model Router wählt je Anfrage das günstigste geeignete Modell, bleibt aber im CWS-Tenant (Gebühr 0,154 $ je Mio. Input-Tokens in der Datenzone).',
    sourceUrl: AZURE_PRICES,
    tone: 'secure',
  },
  {
    title: 'Claude-Modelle',
    text: 'Gleiche Preise direkt bei Anthropic oder über Microsoft Foundry. Keine EU-Datenzone; Anthropic verarbeitet als eigenständiger Auftragsverarbeiter. Der Claude-Tokenizer zählt bei deutschem Text etwa doppelt so viele Tokens wie der OpenAI-Tokenizer – im Tool eingerechnet (×2).',
    sourceUrl: ANTHROPIC_PRICES,
  },
  {
    title: 'Tokens im Deutschen',
    text: 'Gemessen mit dem OpenAI-Tokenizer: 1 deutsches Wort ≈ 1,65 Tokens, eine A4-Seite ≈ 780 Tokens, ein 1-stündiges Teams-Transkript ≈ 15.000 Tokens. Reasoning-Tokens werden als Output abgerechnet.',
    sourceUrl: 'https://github.com/openai/tiktoken',
  },
  {
    title: 'Wechselkurs',
    text: 'USD-Preise werden mit dem EZB-Referenzkurs vom 14.10.2026 umgerechnet (1 € = 1,1195 $ → 0,8933 €/$). Microsoft-Euro-Listenpreise (Copilot, Credits) gelten direkt.',
    sourceUrl: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
  },
  {
    title: 'OpenRouter',
    text: 'Anbieter-Listenpreise plus 5,5 % Plattformgebühr (Business 8 %). OpenRouter Inc. sitzt in New York; Metadaten können die EU verlassen, auch mit EU-Routing. Deshalb nur Benchmark bzw. für öffentliche Daten.',
    sourceUrl: 'https://openrouter.ai/pricing',
    tone: 'risk',
  },
];
