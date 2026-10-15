/**
 * Labels, detection lexicon and default assumptions of the AI cost model.
 * Prices live in aiPlatforms.ts; everything a controller may want to tune is editable on the
 * "Preise & Annahmen" page (stored as settings) – these values are the documented defaults.
 */
import type { Option } from './options';
import type { Complexity, DataSensitivity, InteractionMode, SecurityTier, TaskType } from '../types/ai';

export const TASK_TYPES: Option<TaskType>[] = [
  { value: 'summarize', label: 'Zusammenfassen' },
  { value: 'draft', label: 'Texte entwerfen' },
  { value: 'classify', label: 'Klassifizieren / Weiterleiten' },
  { value: 'extract', label: 'Daten extrahieren' },
  { value: 'knowledge', label: 'Wissensabfrage / Recherche' },
  { value: 'analyze', label: 'Analysieren / Prüfen' },
  { value: 'translate', label: 'Übersetzen' },
];

export const INTERACTION_MODES: Option<InteractionMode>[] = [
  { value: 'interactive', label: 'Interaktiv (Mitarbeitende mit Assistent)' },
  { value: 'automated', label: 'Automatisiert (je Vorgang im Hintergrund)' },
];

export const DATA_SENSITIVITIES: Option<DataSensitivity>[] = [
  { value: 'public', label: 'Öffentlich' },
  { value: 'internal', label: 'Intern' },
  { value: 'confidential', label: 'Vertraulich' },
  { value: 'personal', label: 'Personenbezogen' },
];

export const COMPLEXITIES: Option<Complexity>[] = [
  { value: 'simple', label: 'Einfach' },
  { value: 'standard', label: 'Standard' },
  { value: 'complex', label: 'Komplex' },
];

export const SECURITY_TIERS: Record<SecurityTier, { label: string; short: string; description: string }> = {
  A: {
    label: 'Stufe A – Microsoft-365-Tenant',
    short: 'M365-Tenant',
    description: 'Verarbeitung im CWS-Microsoft-365-Tenant (Copilot, Enterprise Data Protection, keine Nutzung für Training).',
  },
  B: {
    label: 'Stufe B – CWS-Azure-Tenant',
    short: 'Azure-Tenant',
    description: 'Eigene Bereitstellung in Microsoft Foundry / Azure OpenAI mit EU-Datenzone und Azure-Vertrag.',
  },
  C: {
    label: 'Stufe C – Anbieter mit Enterprise-Vertrag',
    short: 'Anbieter-Vertrag',
    description: 'Direkte API bei Anthropic oder OpenAI mit Auftragsverarbeitungsvertrag, außerhalb des Microsoft-Tenants.',
  },
  D: {
    label: 'Stufe D – Offener Router',
    short: 'Offener Router',
    description: 'OpenRouter leitet an wechselnde Drittanbieter weiter – keine geschlossene Umgebung.',
  },
};

/**
 * Default security policy: which tiers are allowed per data class.
 * "Immer in einem sicheren, geschlossenen Environment" – open routers only for public data.
 */
export const DEFAULT_TIER_POLICY: Record<DataSensitivity, SecurityTier[]> = {
  public: ['A', 'B', 'C', 'D'],
  internal: ['A', 'B', 'C'],
  confidential: ['A', 'B'],
  personal: ['A', 'B'],
};

/** Minimum model quality per complexity (1 basic, 2 good, 3 excellent). */
export const REQUIRED_QUALITY: Record<Complexity, 1 | 2 | 3> = { simple: 1, standard: 2, complex: 3 };

/**
 * Default tokens per transaction (input incl. instructions and document, output) for German business text.
 * Derivation and sources: see "Preise & Annahmen" page.
 */
export const TASK_TOKEN_DEFAULTS: Record<TaskType, { input: number; output: number; basis: string }> = {
  classify: { input: 1_200, output: 80, basis: 'E-Mail (ca. 450 Tokens) + Anweisungen und Kategorienliste, kurze Kategorie als Antwort' },
  extract: { input: 2_500, output: 700, basis: '1–2 Seiten Beleg nach OCR (ca. 720 Tokens/Seite) + Feldschema, JSON mit Positionen' },
  summarize: { input: 15_000, output: 1_000, basis: '1-stündiges Teams-Transkript (ca. 8.000 Wörter), 1 Seite Protokoll mit Aufgaben' },
  draft: { input: 2_500, output: 1_200, basis: 'Vorlage, Kontext und Stichpunkte, 1–2 Seiten Entwurf' },
  knowledge: { input: 6_000, output: 600, basis: 'Frage + gefundene Dokumentausschnitte (Grounding), kurze Antwort' },
  analyze: { input: 9_000, output: 1_500, basis: '10-seitiger Vertrag (ca. 7.800 Tokens) + Prüfanweisungen, strukturierte Bewertung' },
  translate: { input: 2_000, output: 2_000, basis: '1–2 Seiten Text, Ausgabe gleicher Länge' },
};

/**
 * Copilot Credits per run, from Microsoft's rates: generative answer 2, agent action 5,
 * grounding on tenant data 10, document processing 8 per page.
 */
export const COPILOT_STUDIO_CREDITS_PER_RUN: Record<TaskType, number> = {
  classify: 7, // answer 2 + action 5
  extract: 15, // document ~1 page 8 + answer 2 + action 5
  summarize: 12, // answer 2 + grounding 10
  draft: 12, // answer 2 + grounding 10
  knowledge: 12, // answer 2 + grounding 10
  analyze: 17, // answer 2 + grounding 10 + action 5
  translate: 7, // answer 2 + action 5
};

export const COPILOT_CREDIT_BASIS: Record<TaskType, string> = {
  classify: 'Antwort 2 + Aktion 5',
  extract: 'Dokument (ca. 1 Seite) 8 + Antwort 2 + Aktion 5',
  summarize: 'Antwort 2 + Grounding 10',
  draft: 'Antwort 2 + Grounding 10',
  knowledge: 'Antwort 2 + Grounding 10',
  analyze: 'Antwort 2 + Grounding 10 + Aktion 5',
  translate: 'Antwort 2 + Aktion 5',
};

/** Keyword stems (lower case) used to detect the task type from name and description. */
export const TASK_LEXICON: Record<TaskType, string[]> = {
  summarize: ['zusammenfass', 'protokoll', 'meeting', 'besprechung', 'kurzfassung', 'transkript', 'überblick', 'mitschrift'],
  draft: ['entwurf', 'entwürf', 'entwerf', 'formulier', 'verfass', 'erstellen von', 'angebotserstell', 'anschreiben', 'präsentation', 'texte'],
  classify: ['klassifiz', 'kategoris', 'zuordn', 'zugeordnet', 'zugewiesen', 'weiterleit', 'weitergeleitet', 'routing', 'priorisier', 'triage', 'sortier', 'verschlagwort'],
  extract: ['extrah', 'extrakt', 'auslesen', 'übertrag', 'erfass', 'rechnung', 'beleg', 'formular', 'ocr', 'stammdaten', 'datenübernahme'],
  knowledge: ['wissen', 'faq', 'richtlinie', 'handbuch', 'recherch', 'auskunft', 'nachschlag', 'intranet', 'fragen beantwort'],
  analyze: ['analys', 'bewert', 'prüf', 'vergleich', 'auswert', 'risiko', 'plausibilis', 'qualifiz', 'vertrag'],
  translate: ['übersetz', 'translation', 'mehrsprach', 'fremdsprach'],
};

export const AUTOMATED_LEXICON = ['automatisch', 'eingehend', 'eingang', 'batch', 'massen', 'jede ', 'alle eingehenden', 'schnittstelle', 'im hintergrund', 'täglich'];
export const INTERACTIVE_LEXICON = ['mitarbeitende', 'führungskr', 'erstellen', 'entwurf', 'meeting', 'besprechung', 'recherch', 'präsentation', 'auf anfrage'];
export const M365_LEXICON = ['outlook', 'e-mail', 'email', 'teams', 'word', 'excel', 'powerpoint', 'sharepoint', 'onedrive', 'besprechung', 'meeting', 'kalender'];
export const PERSONAL_DATA_LEXICON = ['personal', 'mitarbeitende', 'bewerb', 'gehalt', 'lohn', 'gesundheit', 'krank', 'kontakt', 'bonität', 'privat'];
export const COMPLEX_LEXICON = ['vertrag', 'recht', 'risiko', 'analyse', 'komplex', 'verhandl', 'strategie', 'bewertung'];

/** Default model-run assumptions; editable in settings. */
export const AI_ASSUMPTIONS = {
  /** Extra tokens for system prompts, retries and tool calls, in percent of input tokens. */
  tokenOverheadPct: 20,
  /**
   * Closed environment first: prefer the Microsoft 365 tenant, then the CWS Azure tenant, unless an alternative
   * is cheaper by more than this percentage…
   */
  m365PreferenceMarginPct: 25,
  /** …or unless the extra cost of the more secure option stays below this amount per year. */
  m365PreferenceAbsoluteEur: 500,
  /** Share of employees involved in processes who already hold a Microsoft 365 Copilot licence (default if not entered per use case). */
  defaultCopilotCoveragePct: 100,
  /** Monthly hours an involved employee spends on the process – used to estimate the number of users. */
  hoursPerUserPerMonth: 20,
  /** Above this monthly volume, per-transaction API processing is preferred over Copilot Studio credits for automated runs. */
  highVolumeThreshold: 5_000,
};
