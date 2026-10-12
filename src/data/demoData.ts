/**
 * DEMO DATA – NOT ACTUAL CWS FIGURES.
 * Fictional, illustrative processes for demonstration purposes only.
 */
import type { BusinessProcess, ProcessDraft } from '../types/process';

const DEMO_PROCESSES: (ProcessDraft & { id: string })[] = [
  {
    id: 'demo-invoice-validation',
    name: 'Manuelle Eingangsrechnungsprüfung',
    department: 'finance',
    description:
      'Lieferantenrechnungen kommen als PDF per E-Mail, werden manuell gegen Bestellung und Wareneingang in SAP geprüft und zur Buchung freigegeben.',
    systems: ['sap', 'outlook', 'excel'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 2400,
      minutesPerTransaction: 6,
      hourlyCost: 52,
      errorRatePct: 4,
      reworkMinutesPerError: 20,
    },
    assessment: {
      standardization: 'high',
      ruleBased: 'yes',
      digitalData: 'yes',
      integration: 'yes',
      exceptionRate: 'medium',
      unstructuredInfo: 'yes',
      complianceConcerns: 'no',
    },
    scenario: {
      timeReductionPct: 70,
      errorReductionPct: 60,
      implementationCost: 45000,
      monthlyOperatingCost: 1200,
      annualHardSavings: 12000,
    },
    status: 'approved_discovery',
  },
  {
    id: 'demo-customer-onboarding',
    name: 'Kunden-Onboarding Neukunden',
    department: 'sales',
    description:
      'Anlage neuer Geschäftskunden inkl. Stammdaten, Bonitätsprüfung, Vertragsanlage und Übergabe an Service-Disposition.',
    systems: ['salesforce', 'sap', 'outlook', 'excel'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 180,
      minutesPerTransaction: 45,
      hourlyCost: 58,
      errorRatePct: 8,
      reworkMinutesPerError: 40,
    },
    assessment: {
      standardization: 'medium',
      ruleBased: 'partial',
      digitalData: 'partial',
      integration: 'yes',
      exceptionRate: 'medium',
      unstructuredInfo: 'no',
      complianceConcerns: 'yes',
    },
    scenario: {
      timeReductionPct: 50,
      errorReductionPct: 50,
      implementationCost: 60000,
      monthlyOperatingCost: 900,
      annualHardSavings: 0,
    },
    status: 'under_assessment',
  },
  {
    id: 'demo-service-request-classification',
    name: 'Klassifizierung von Serviceanfragen',
    department: 'customer_service',
    description:
      'Kundenanfragen per E-Mail und Kontaktformular (z. B. Abholung, Reklamation, Vertragsänderung) werden gelesen, kategorisiert und an das zuständige Team weitergeleitet.',
    systems: ['outlook', 'salesforce', 'teams'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 6500,
      minutesPerTransaction: 4,
      hourlyCost: 45,
      errorRatePct: 7,
      reworkMinutesPerError: 15,
    },
    assessment: {
      standardization: 'medium',
      ruleBased: 'partial',
      digitalData: 'yes',
      integration: 'yes',
      exceptionRate: 'medium',
      unstructuredInfo: 'yes',
      complianceConcerns: 'unknown',
    },
    scenario: {
      timeReductionPct: 60,
      errorReductionPct: 50,
      implementationCost: 55000,
      monthlyOperatingCost: 1500,
      annualHardSavings: 0,
    },
    status: 'pilot',
  },
  {
    id: 'demo-lead-qualification',
    name: 'Vertriebs-Lead-Qualifizierung',
    department: 'sales',
    description:
      'Eingehende Leads aus Messen, Website und Telefon werden recherchiert, nach Potenzial bewertet und dem Außendienst zugeordnet.',
    systems: ['salesforce', 'excel', 'outlook'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 400,
      minutesPerTransaction: 20,
      hourlyCost: 62,
      errorRatePct: 12,
      reworkMinutesPerError: 30,
    },
    assessment: {
      standardization: 'low',
      ruleBased: 'partial',
      digitalData: 'partial',
      integration: 'yes',
      exceptionRate: 'high',
      unstructuredInfo: 'yes',
      complianceConcerns: 'yes',
    },
    scenario: {
      timeReductionPct: 40,
      errorReductionPct: 30,
      implementationCost: 35000,
      monthlyOperatingCost: 800,
      annualHardSavings: 0,
    },
    status: 'new',
  },
  {
    id: 'demo-contract-extraction',
    name: 'Vertragsdatenextraktion',
    department: 'other',
    description:
      'Vertragsmanagement: Kerndaten (Laufzeit, Preise, Kündigungsfristen) aus Kundenverträgen und Nachträgen werden manuell in SAP und eine Excel-Übersicht übertragen.',
    systems: ['sharepoint', 'sap', 'excel'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 350,
      minutesPerTransaction: 25,
      hourlyCost: 60,
      errorRatePct: 6,
      reworkMinutesPerError: 30,
    },
    assessment: {
      standardization: 'medium',
      ruleBased: 'partial',
      digitalData: 'yes',
      integration: 'unknown',
      exceptionRate: 'medium',
      unstructuredInfo: 'yes',
      complianceConcerns: 'yes',
    },
    scenario: {
      timeReductionPct: 55,
      errorReductionPct: 50,
      implementationCost: 70000,
      monthlyOperatingCost: 1800,
      annualHardSavings: 0,
    },
    status: 'under_assessment',
  },
  {
    id: 'demo-management-reporting',
    name: 'Monatliches Management-Reporting',
    department: 'finance',
    description:
      'Monatliche KPI-Berichte je Region werden aus SAP-Exporten in Excel konsolidiert, plausibilisiert und als Präsentation verteilt.',
    systems: ['sap', 'excel', 'm365', 'sharepoint'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 40,
      minutesPerTransaction: 180,
      hourlyCost: 70,
      errorRatePct: 10,
      reworkMinutesPerError: 90,
    },
    assessment: {
      standardization: 'high',
      ruleBased: 'yes',
      digitalData: 'yes',
      integration: 'yes',
      exceptionRate: 'low',
      unstructuredInfo: 'no',
      complianceConcerns: 'no',
    },
    scenario: {
      timeReductionPct: 75,
      errorReductionPct: 80,
      implementationCost: 30000,
      monthlyOperatingCost: 400,
      annualHardSavings: 0,
    },
    status: 'implemented',
  },
  {
    id: 'demo-hr-onboarding',
    name: 'HR-Onboarding-Administration',
    department: 'hr',
    description:
      'Administrative Schritte für neue Mitarbeitende: Personalakte, Zugänge, Arbeitskleidung, Schulungstermine und Unterlagenversand.',
    systems: ['sap', 'm365', 'outlook', 'teams', 'excel'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 60,
      minutesPerTransaction: 120,
      hourlyCost: 50,
      errorRatePct: 9,
      reworkMinutesPerError: 45,
    },
    assessment: {
      standardization: 'medium',
      ruleBased: 'yes',
      digitalData: 'partial',
      integration: 'unknown',
      exceptionRate: 'medium',
      unstructuredInfo: 'no',
      complianceConcerns: 'yes',
    },
    scenario: {
      timeReductionPct: 50,
      errorReductionPct: 60,
      implementationCost: 40000,
      monthlyOperatingCost: 600,
      annualHardSavings: 0,
    },
    status: 'new',
  },
  {
    id: 'demo-supplier-documentation',
    name: 'Verarbeitung von Lieferantendokumentation',
    department: 'procurement',
    description:
      'Zertifikate, Sicherheitsdatenblätter und Textil-Nachweise von Lieferanten werden geprüft, verschlagwortet und im Lieferantenstamm hinterlegt.',
    systems: ['sap', 'outlook', 'sharepoint', 'excel'],
    otherSystems: '',
    metrics: {
      transactionsPerMonth: 900,
      minutesPerTransaction: 12,
      hourlyCost: 48,
      errorRatePct: 5,
      reworkMinutesPerError: 25,
    },
    assessment: {
      standardization: 'medium',
      ruleBased: 'partial',
      digitalData: 'yes',
      integration: 'yes',
      exceptionRate: 'medium',
      unstructuredInfo: 'yes',
      complianceConcerns: 'no',
    },
    scenario: {
      timeReductionPct: 60,
      errorReductionPct: 50,
      implementationCost: 50000,
      monthlyOperatingCost: 1100,
      annualHardSavings: 4800,
    },
    status: 'under_assessment',
  },
];

export function createDemoProcesses(now: Date = new Date()): BusinessProcess[] {
  return DEMO_PROCESSES.map((p, index) => {
    // Stagger timestamps so "created" sorting looks natural.
    const timestamp = new Date(now.getTime() - (DEMO_PROCESSES.length - index) * 86_400_000).toISOString();
    return {
      ...p,
      systems: [...p.systems],
      metrics: { ...p.metrics },
      assessment: { ...p.assessment },
      scenario: { ...p.scenario },
      isDemo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}
