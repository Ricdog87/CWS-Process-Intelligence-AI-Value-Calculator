/** Tooltip texts for the intake form and the value calculator. */
export const HELP = {
  name: 'Kurzer, eindeutiger Name, z. B. „Eingangsrechnungsprüfung Kreditoren“.',
  department: 'Fachbereich, der den Prozess heute verantwortet.',
  description: 'Was passiert im Prozess? Eingang, wesentliche Arbeitsschritte und Ergebnis in zwei bis drei Sätzen.',
  systems: 'Welche Anwendungen werden heute im Prozess genutzt? Mehrfachauswahl möglich.',

  transactionsPerMonth: 'Wie oft wird der Prozess pro Monat durchgeführt – z. B. Anzahl Rechnungen, Anfragen oder Neuanlagen.',
  minutesPerTransaction:
    'Durchschnittliche manuelle Bearbeitungszeit je Vorgang in Minuten – ohne Nacharbeit. Nacharbeit wird separat erfasst, damit nichts doppelt gezählt wird.',
  hourlyCost:
    'Interner Vollkostensatz pro Stunde inkl. Lohnnebenkosten und Arbeitsplatzkosten. Im Zweifel mit dem Controlling abstimmen.',
  errorRatePct: 'Anteil der Vorgänge, die korrigiert oder nachbearbeitet werden müssen.',
  reworkMinutesPerError: 'Durchschnittliche Zeit für die Korrektur eines fehlerhaften Vorgangs (Rückfragen, Korrekturbuchung …).',

  standardization: 'Läuft der Prozess immer gleich ab? Hoch = einheitlicher Ablauf mit kaum Varianten. Niedrig = jeder Fall wird anders bearbeitet.',
  ruleBased: 'Lassen sich die Entscheidungen als klare Wenn-dann-Regeln beschreiben, und wiederholen sich die Arbeitsschritte?',
  digitalData: 'Liegen die Eingangsdaten digital vor (E-Mail, PDF, Systemdaten)? „Nein“ = Papier, Telefon oder mündliche Information.',
  integration: 'Bieten die beteiligten Systeme Schnittstellen (API) oder stabile Exportmöglichkeiten? Im Zweifel „Unbekannt“ wählen.',
  exceptionRate: 'Wie oft weicht ein Vorgang vom Standard ab? Orientierung: Niedrig < 10 %, Mittel 10–30 %, Hoch > 30 %.',
  unstructuredInfo: 'Müssen Freitexte, E-Mails, Dokumente oder Bilder gelesen und inhaltlich interpretiert werden?',
  complianceConcerns: 'Werden personenbezogene, vertrauliche oder regulierte Daten verarbeitet (z. B. Personal-, Gesundheits- oder Vertragsdaten)?',

  timeReductionPct: 'Um wie viel Prozent sinkt die manuelle Bearbeitungszeit durch die Automatisierung? Typische Werte: 30–70 %.',
  errorReductionPct: 'Um wie viel Prozent sinkt die Fehlerquote durch die Automatisierung?',
  implementationCost: 'Einmalige Kosten für Konzeption, Entwicklung, Tests und Einführung – intern und extern.',
  monthlyOperatingCost: 'Laufende Kosten pro Monat: Lizenzen, KI-Nutzung, Betrieb, Wartung und Support.',
  annualHardSavings:
    'Optional: tatsächlich realisierbare Kosteneinsparungen pro Jahr (z. B. zusätzliche Skonti, weniger externe Dienstleister, Lizenzen). Keine Personalkosten – diese sind bereits als Kapazitätswert erfasst.',
} as const;
