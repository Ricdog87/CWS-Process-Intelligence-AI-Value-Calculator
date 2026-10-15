/**
 * AI platform & token cost model.
 * Every field of AiProfileInput is an optional override – `null` means "detect automatically".
 */

export type TaskType = 'summarize' | 'draft' | 'classify' | 'extract' | 'knowledge' | 'analyze' | 'translate';

/** interactive = employees work with an assistant; automated = runs in the background per transaction. */
export type InteractionMode = 'interactive' | 'automated';

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'personal';

export type Complexity = 'simple' | 'standard' | 'complex';

/**
 * Security tiers of where data is processed.
 * A = Microsoft 365 tenant (Copilot, Enterprise Data Protection)
 * B = CWS Azure tenant (Azure OpenAI / Microsoft Foundry, EU data zone)
 * C = vendor with enterprise contract outside the Microsoft tenant (Anthropic / OpenAI API with DPA)
 * D = open router / marketplace (OpenRouter) – requests go to changing third-party providers
 */
export type SecurityTier = 'A' | 'B' | 'C' | 'D';

export type AiChannel = 'm365_copilot' | 'copilot_studio' | 'azure_foundry' | 'vendor_api' | 'openrouter';

export interface AiProfileInput {
  taskType: TaskType | null;
  interactionMode: InteractionMode | null;
  dataSensitivity: DataSensitivity | null;
  complexity: Complexity | null;
  /** Tokens sent to the model per transaction (prompt + document). */
  inputTokensPerTransaction: number | null;
  /** Tokens generated per transaction. */
  outputTokensPerTransaction: number | null;
  /** Employees who work on the process (relevant for per-user Copilot licences). */
  usersInvolved: number | null;
  /** Of those, employees who already hold a Microsoft 365 Copilot licence. */
  usersWithCopilot: number | null;
}

export const EMPTY_AI_PROFILE: AiProfileInput = {
  taskType: null,
  interactionMode: null,
  dataSensitivity: null,
  complexity: null,
  inputTokensPerTransaction: null,
  outputTokensPerTransaction: null,
  usersInvolved: null,
  usersWithCopilot: null,
};

export type TokenPricing = {
  model: 'per_token';
  /** USD per 1 million input tokens. */
  inputUsdPer1M: number;
  /** USD per 1 million output tokens. */
  outputUsdPer1M: number;
};

export type UserPricing = {
  model: 'per_user';
  /** List price per user and month (annual commitment) in `currency`. */
  pricePerUserMonth: number;
  currency: 'EUR' | 'USD';
};

export type CreditPricing = {
  model: 'per_credit';
  /** EUR per Copilot Credit (derived from the credit pack price). */
  eurPerCredit: number;
};

export type AiPricing = TokenPricing | UserPricing | CreditPricing;

export interface AiOption {
  id: string;
  name: string;
  vendor: string;
  channel: AiChannel;
  tier: SecurityTier;
  /** Which operating modes the option can serve. */
  modes: InteractionMode[];
  /** Quality per task type: 1 = basic, 2 = good, 3 = excellent. */
  quality: Record<TaskType, 1 | 2 | 3>;
  pricing: AiPricing;
  /**
   * Tokens this model counts for the same text relative to the reference tokenizer (OpenAI, used for the token defaults).
   * Claude 4.7+ counts about 30 % more tokens. Default 1.
   */
  tokenFactor?: number;
  euDataResidency: boolean;
  notes: string;
  sourceUrl: string;
}
