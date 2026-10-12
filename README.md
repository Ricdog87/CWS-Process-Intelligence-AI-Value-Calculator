# CWS Process Intelligence – AI & Automation Value Calculator

MVP für das **AI Center of Excellence** und das **Business Process Management** von CWS Workwear.
Fachbereiche erfassen wiederkehrende Prozesse und erhalten sofort:

1. einen nachvollziehbaren **Automation Opportunity Score** (0–100),
2. eine regelbasierte Empfehlung: **klassische Automatisierung, KI, hybrid oder zuerst Prozessoptimierung**,
3. eine **Wirtschaftlichkeitsrechnung** (Stunden, Kapazitätswert, Qualitätsnutzen, Netto-Nutzen, ROI, Amortisation),
4. eine **Portfolio-Priorität** für das AI CoE.

> **DEMO-DATEN – KEINE TATSÄCHLICHEN CWS-ZAHLEN.** Alle mitgelieferten Prozesse und Ergebnisse sind fiktiv.
> Bitte keine echten Unternehmens- oder Mitarbeiterdaten eingeben.

## Schnellstart

Voraussetzung: Node.js ≥ 20.19

```bash
npm install
npm run dev        # http://localhost:5173
```

Weitere Befehle:

| Befehl | Zweck |
|---|---|
| `npm test` | Unit-Tests (Formeln, Scoring, Empfehlung, Priorität, Persistenz, CSV) |
| `npm run build` | Typecheck + Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen |

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Dashboard** | KPIs (Prozesse, hohes Potenzial, Stunden p. a. inkl. FTE-Äquivalent, Kapazitätswert), Priorisierungsmatrix, Top-Chancen, Status-Pipeline, Portfolio-Tabelle mit Suche, Fachbereichsfilter, Sortierung, Status-Pflege und CSV-Export (Excel-DE-kompatibel) |
| **Prozesse** | Prozessliste, Erfassung in 4 Schritten mit **Live-Bewertung**, Bearbeiten, Löschen, Detailbewertung mit Score-Herleitung, Stärken/Herausforderungen, Lösungsansatz mit Begründung und nächstem Schritt |
| **Wertrechner** | Interaktive Szenarien (Schieberegler), 6 KPI-Karten, Wirtschaftliche Sicht vs. Cash-Sicht, Wasserfall Jahr 1, kumulierter Nutzen über 36 Monate, Sensitivität (50/75/100 % Effekt), vollständiger Rechenweg; Szenario speichern oder verwerfen |
| **Bewertungsmethodik** | Alle Gewichte, Schwellen, Regeln und Formeln – direkt aus der Konfiguration gerendert |

Daten werden im `localStorage` des Browsers gespeichert (Schema-versioniert, beschädigte Daten werden erkannt und ersetzt).
Über die Sidebar lassen sich die Demo-Daten zurücksetzen oder alle Prozesse löschen.

## Architektur

```
src/
  config/        scoringConfig.ts (alle Gewichte, Schwellen, Bänder), options.ts (Labels), helpTexts.ts
  lib/           reine Fachlogik ohne UI – vollständig getestet
    calculations.ts    Wirtschaftlichkeitsrechnung
    scoring.ts         Automation Opportunity Score
    recommendation.ts  Lösungsansatz (Regeln R1–R5)
    priority.ts        Portfolio-Priorität
    evaluation.ts      Zusammenführung + nächster Schritt
    portfolio.ts       Filter, Sortierung, Summen
    validation.ts      Formularvalidierung
    storage.ts         localStorage-Persistenz
    csv.ts, format.ts  Export, deutsche Formatierung/Eingabe
    __tests__/         Vitest
  data/demoData.ts     8 fiktive Beispielprozesse
  state/               Store (React Context), Toasts, Hash-Router
  components/          UI-Bausteine, Layout, Dashboard, Prozesse, Wertrechner
  pages/               Dashboard, Prozesse, Formular, Detail, Wertrechner, Methodik
```

## Bewertungslogik (Kurzfassung)

**Automation Score** – 7 Kriterien, Summe 100 Punkte: Häufigkeit 15 · Regelbasiertheit 20 · Standardisierung 20 ·
digitale Daten 15 · Integration 15 · geringe Ausnahmequote 10 · geringe Compliance-Komplexität 5.
Fehlende Angaben = 0 Punkte, „Unbekannt“ = vorsichtiger Teilwert; in beiden Fällen ist das Ergebnis **vorläufig**
und zeigt die mögliche Spanne. Klassen: ≥ 80 hoch · 60–79 gut · 40–59 prüfen · < 40 gering.

**Lösungsansatz** – feste Regeln, erste zutreffende gilt:
R1 Score (auch im besten Fall) < 40 oder geringe Standardisierung bei fehlenden Regeln/hohen Ausnahmen → *Zuerst Prozessoptimierung* ·
R2 unstrukturierte Infos + feste Regeln → *Hybrid* · R3 unstrukturierte Infos + teilweise/keine Regeln → *KI* ·
R4 strukturiert, aber keine Regeln → *KI (Entscheidungsunterstützung)* · R5 strukturiert + Regeln → *Klassisch*.

**Wirtschaftlichkeit**

```
Aufwand/Monat (h)        = Vorgänge × Minuten / 60
Kapazität p. a. (h)      = Aufwand × Zeitreduktion × 12
Kapazitätswert p. a.     = Kapazität × Stundensatz                     (Potenzial, kein Cash)
Nacharbeit/Monat (h)     = Vorgänge × Fehlerquote × Nacharbeitsminuten / 60
Qualitätsnutzen p. a.    = Nacharbeit × Fehlerreduktion × 12 × Stundensatz
Netto-Nutzen Jahr 1      = Kapazitätswert + Qualitätsnutzen + harte Einsparungen − Implementierung − Betrieb × 12
ROI Jahr 1               = Netto-Nutzen / (Implementierung + Betrieb × 12)
Amortisation (Monate)    = Implementierung / (laufender Netto-Nutzen / 12)
```

Kapazität und Cash werden strikt getrennt: harte Einsparungen sind ein eigenes Feld, die Cash-Sicht wird separat ausgewiesen.
Bearbeitungszeit wird ohne Nacharbeit erfasst, deshalb gibt es keine Doppelzählung.

**Priorität** = Score × 45 % + Wertpunkte × 35 % + Aufwandspunkte × 20 % → Hoch ≥ 70 · Mittel ≥ 50 · Niedrig.

Alle Werte sind in `src/config/scoringConfig.ts` zentral kalibrierbar.

## Branding

Das Erscheinungsbild folgt der CWS-Workwear-CI (Rot `#EB0045`, Gelb `#F9E244`, Anthrazit `#231F20`).
Das Logo liegt unter `src/assets/cws-workwear-logo.png`. Vor einer Nutzung außerhalb einer internen Demo bitte mit dem CWS-Brand-Team abstimmen.

## Nicht im MVP (bewusst)

Authentifizierung, Entra ID, Dataverse, SAP-/Salesforce-APIs, echte LLM-Aufrufe, Copilot Studio, Power Automate,
Freigabe-Workflows, Backend, Cloud-Deployment, Mehrbenutzer-Synchronisation.
