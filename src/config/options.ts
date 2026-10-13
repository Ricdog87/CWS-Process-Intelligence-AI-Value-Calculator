import type {
  Department,
  Level,
  ProcessStatus,
  SystemKey,
  YesNo,
  YesPartialNo,
  YesUnknownNo,
} from '../types/process';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const DEPARTMENTS: Option<Department>[] = [
  { value: 'sales', label: 'Vertrieb' },
  { value: 'finance', label: 'Finanzen' },
  { value: 'hr', label: 'Personal (HR)' },
  { value: 'operations', label: 'Operations' },
  { value: 'customer_service', label: 'Kundenservice' },
  { value: 'procurement', label: 'Einkauf' },
  { value: 'it', label: 'IT' },
  { value: 'other', label: 'Sonstiges' },
];

export const SYSTEMS: Option<SystemKey>[] = [
  { value: 'm365', label: 'Microsoft 365' },
  { value: 'sap', label: 'SAP' },
  { value: 'salesforce', label: 'Salesforce' },
  { value: 'excel', label: 'Excel' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'teams', label: 'Teams' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'other', label: 'Sonstiges' },
];

export const LEVEL_OPTIONS: Option<Level>[] = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
];

export const YES_PARTIAL_NO_OPTIONS: Option<YesPartialNo>[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'partial', label: 'Teilweise' },
  { value: 'no', label: 'Nein' },
];

export const YES_UNKNOWN_NO_OPTIONS: Option<YesUnknownNo>[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'unknown', label: 'Unbekannt' },
  { value: 'no', label: 'Nein' },
];

export const YES_NO_OPTIONS: Option<YesNo>[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nein' },
];

export const STATUSES: Option<ProcessStatus>[] = [
  { value: 'new', label: 'Neu' },
  { value: 'under_assessment', label: 'In Bewertung' },
  { value: 'approved_discovery', label: 'Discovery-Freigabe' },
  { value: 'pilot', label: 'MVP / Pilot' },
  { value: 'implemented', label: 'Umgesetzt' },
];

function labelLookup<T extends string>(options: Option<T>[]) {
  const map = new Map(options.map((o) => [o.value, o.label]));
  return (value: T | null | undefined): string => (value ? (map.get(value) ?? value) : '–');
}

export const departmentLabel = labelLookup(DEPARTMENTS);
export const systemLabel = labelLookup(SYSTEMS);
export const statusLabel = labelLookup(STATUSES);
export const levelLabel = labelLookup(LEVEL_OPTIONS);
export const yesPartialNoLabel = labelLookup(YES_PARTIAL_NO_OPTIONS);
export const yesUnknownNoLabel = labelLookup(YES_UNKNOWN_NO_OPTIONS);
export const yesNoLabel = labelLookup(YES_NO_OPTIONS);

export const DEMO_DATA_NOTICE = 'DEMO-DATEN – KEINE TATSÄCHLICHEN CWS-ZAHLEN';
