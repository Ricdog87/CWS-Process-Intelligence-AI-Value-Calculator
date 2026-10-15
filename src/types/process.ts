import type { AiProfileInput } from './ai';

/**
 * Domain model for CWS Process Intelligence.
 * All enum-like values are stored as stable string keys; German labels live in config/options.ts.
 */

export type Department =
  | 'sales'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'customer_service'
  | 'procurement'
  | 'it'
  | 'other';

export type SystemKey =
  | 'm365'
  | 'sap'
  | 'salesforce'
  | 'excel'
  | 'outlook'
  | 'teams'
  | 'sharepoint'
  | 'other';

export type Level = 'low' | 'medium' | 'high';
export type YesPartialNo = 'yes' | 'partial' | 'no';
export type YesUnknownNo = 'yes' | 'unknown' | 'no';
export type YesNo = 'yes' | 'no';

export type ProcessStatus =
  | 'new'
  | 'under_assessment'
  | 'approved_discovery'
  | 'pilot'
  | 'implemented';

/** Volume, effort and cost of the process today. `null` = not provided. */
export interface ProcessMetrics {
  transactionsPerMonth: number | null;
  /** Average manual processing time per transaction in minutes, excluding rework. */
  minutesPerTransaction: number | null;
  /** Internal fully loaded hourly labor cost in EUR. */
  hourlyCost: number | null;
  /** Share of transactions that require rework, in percent (0–100). */
  errorRatePct: number | null;
  /** Average rework time per error in minutes. */
  reworkMinutesPerError: number | null;
}

/** Qualitative assessment answers. `null` = not answered yet. */
export interface ProcessAssessment {
  standardization: Level | null;
  ruleBased: YesPartialNo | null;
  digitalData: YesPartialNo | null;
  integration: YesUnknownNo | null;
  exceptionRate: Level | null;
  unstructuredInfo: YesNo | null;
  complianceConcerns: YesUnknownNo | null;
}

/** Expected effect and cost of the automation scenario. */
export interface AutomationScenario {
  timeReductionPct: number | null;
  errorReductionPct: number | null;
  implementationCost: number | null;
  monthlyOperatingCost: number | null;
  /** Realizable annual hard cost savings (cash), optional. */
  annualHardSavings: number | null;
}

export interface BusinessProcess {
  id: string;
  name: string;
  department: Department;
  description: string;
  systems: SystemKey[];
  otherSystems: string;
  metrics: ProcessMetrics;
  assessment: ProcessAssessment;
  scenario: AutomationScenario;
  /** AI usage profile overrides; null fields are detected automatically. */
  aiProfile: AiProfileInput;
  status: ProcessStatus;
  /** Fictional sample record – never actual CWS figures. */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Everything a user can enter in the intake form. */
export type ProcessDraft = Omit<BusinessProcess, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;
