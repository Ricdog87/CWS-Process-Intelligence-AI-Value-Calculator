/**
 * CSV export for the opportunity portfolio.
 * Semicolon separator, decimal comma and UTF-8 BOM so the file opens correctly in German Excel.
 */
import { DEMO_DATA_NOTICE, departmentLabel, statusLabel } from '../config/options';
import type { BusinessProcess } from '../types/process';
import type { ProcessEvaluation } from './evaluation';

export interface PortfolioRow {
  process: BusinessProcess;
  evaluation: ProcessEvaluation;
}

const SEPARATOR = ';';

/** Quotes a cell and neutralizes spreadsheet formula injection in text cells. */
export function escapeCsvText(value: string): string {
  let text = value.replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Numbers without thousands separators and with decimal comma (Excel DE). */
export function formatCsvNumber(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return '';
  return value.toFixed(decimals).replace('.', ',');
}

const HEADERS = [
  'Prozess',
  'Fachbereich',
  'Automation Score',
  'Bewertung',
  'Empfohlener Lösungsansatz',
  'Eingesparte Stunden p. a.',
  'Kapazitätswert p. a. (EUR)',
  'Qualitätsnutzen p. a. (EUR)',
  'Harte Einsparungen p. a. (EUR)',
  'Implementierungskosten (EUR)',
  'Betriebskosten p. a. (EUR)',
  'Netto-Nutzen Jahr 1 (EUR)',
  'Amortisation (Monate)',
  'Prioritätsscore',
  'Priorität',
  'Status',
  'Vorläufig',
  'Datenbasis',
];

export function buildPortfolioCsv(rows: PortfolioRow[]): string {
  const lines = [HEADERS.map(escapeCsvText).join(SEPARATOR)];
  for (const { process: p, evaluation: e } of rows) {
    const eco = e.economics;
    lines.push(
      [
        escapeCsvText(p.name),
        escapeCsvText(departmentLabel(p.department)),
        formatCsvNumber(e.score.score),
        escapeCsvText(e.score.category.label),
        escapeCsvText(e.recommendation.decided ? e.recommendation.label : `Offen – Tendenz: ${e.recommendation.label}`),
        formatCsvNumber(eco.totalAnnualHoursSaved),
        formatCsvNumber(eco.annualCapacityValue),
        formatCsvNumber(eco.annualAvoidedReworkValue),
        formatCsvNumber(eco.annualHardSavings),
        formatCsvNumber(p.scenario.implementationCost),
        formatCsvNumber(eco.annualOperatingCosts),
        formatCsvNumber(eco.firstYearNetBenefit),
        eco.paybackMonths === null ? escapeCsvText('nicht erreichbar') : formatCsvNumber(eco.paybackMonths, 1),
        formatCsvNumber(e.priority.score),
        escapeCsvText(e.priority.label),
        escapeCsvText(statusLabel(p.status)),
        escapeCsvText(e.isPreliminary ? 'ja' : 'nein'),
        escapeCsvText(p.isDemo ? DEMO_DATA_NOTICE : 'Eigene Eingabe – Schätzung, nicht validiert'),
      ].join(SEPARATOR),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
