# CWS Process Intelligence – AI & Automation Value Calculator

MVP für das **AI Center of Excellence** und das **Business Process Management** von CWS Workwear.
Fachbereiche erfassen wiederkehrende Prozesse und erhalten sofort:

1. einen nachvollziehbaren **Automation Opportunity Score** (0–100),
2. eine regelbasierte Empfehlung: **klassische Automatisierung, KI, hybrid oder zuerst Prozessoptimierung**,
3. einen **Copilot-Check** und die **günstigste sichere KI-Plattform** (Microsoft 365 first) mit Token-, Credit- und Lizenzkosten,
4. eine **Wirtschaftlichkeitsrechnung** (Stunden, Kapazitätswert, Qualitätsnutzen, KI-Nutzungskosten, Netto-Nutzen, ROI, Amortisation),
5. eine **Entscheidung** (Umsetzen · Prüfen · Nicht jetzt · Ohne KI) und ein **KI-Investitionscockpit** für die Geschäftsführung.

> **DEMO-DATEN – KEINE TATSÄCHLICHEN CWS-ZAHLEN.** Alle mitgelieferten Prozesse und Ergebnisse sind fiktiv.
> Bitte keine echten Unternehmens- oder Mitarbeiterdaten eingeben.

## Live-Demo

**https://cws-process-intelligence.vercel.app**

Gehostet auf Vercel (Projekt `cws-process-intelligence`, verknüpft mit diesem GitHub-Repo). Jeder Push auf den
Production-Branch löst automatisch ein neues Deployment aus. `vercel.json` setzt Security-Header (CSP, Frame-Schutz u. a.),
`noindex` gegen Suchmaschinen-Indexierung und einen SPA-Fallback, damit auch Links ohne `#` die App öffnen.

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
| **KI-Cockpit** (Startseite) | C-Level-Sicht: Nutzen, KI-Kosten, Netto-Nutzen, ROI/Amortisation, Anteil im M365-Tenant und in geschlossener Umgebung, Entscheidungen, automatisch erzeugte Kernaussagen, Kosten nach Plattform, Szenariovergleich (Empfehlung vs. nur M365 vs. Kostenminimum ohne Sicherheitsfilter), Tabelle „Wo macht KI Sinn?“, CSV-Export |
| **Preise & Annahmen** | Recherchierte Listenpreise (Stand 15.10.2026) mit Quelle: Microsoft 365 Copilot, Copilot Credits, Azure OpenAI (EU-Datenzone), Claude, OpenAI, ChatGPT/Claude-Lizenzen, OpenRouter; Kosten je 1.000 Vorgänge, Sicherheitsrichtlinie je Datenklasse, editierbare Preise (z. B. EA-Konditionen), Wechselkurs, Toleranzen, Token-Mengengerüst |
| **AI-CoE-Portfolio** | KPIs (Prozesse, hohes Potenzial, Stunden p. a. inkl. FTE-Äquivalent, Kapazitätswert), Priorisierungsmatrix, Top-Chancen, Status-Pipeline, Portfolio-Tabelle mit Suche, Fachbereichsfilter, Sortierung, Status-Pflege und CSV-Export (Excel-DE-kompatibel) |
| **Use Cases** | Liste, Erfassung in 5 Schritten mit **Live-Bewertung** (inkl. KI-Einsatz & Datenschutz – automatisch erkannt, überschreibbar), Bearbeiten, Löschen, Detailbewertung mit Score-Herleitung, Lösungsansatz, Copilot-Check, Plattformvergleich und Sicherheitsaufschlag |
| **Business Case** | Interaktive Szenarien (Schieberegler), 6 KPI-Karten, Wirtschaftliche Sicht vs. Cash-Sicht, Wasserfall Jahr 1, kumulierter Nutzen über 36 Monate, Sensitivität (50/75/100 % Effekt), vollständiger Rechenweg; Szenario speichern oder verwerfen |
| **Bewertungsmethodik** | Alle Gewichte, Schwellen, Regeln und Formeln inkl. KI-Kostenmodell – direkt aus der Konfiguration gerendert |

### KI-Kostenmodell – Microsoft 365 first, immer sicher

| Stufe | Umgebung | Standard-Freigabe |
|---|---|---|
| A | Microsoft-365-Tenant (Copilot-Lizenz, Copilot Chat + Agent über Credits) | alle Datenklassen |
| B | CWS-Azure-Tenant (Azure OpenAI / Foundry, EU-Datenzone) | alle Datenklassen |
| C | Anbieter mit Enterprise-Vertrag (Claude, OpenAI API, ChatGPT/Claude-Lizenzen) | öffentlich, intern |
| D | Offener Router (OpenRouter) | nur öffentlich – sonst reiner Kostenbenchmark |

Das Tool wählt die günstigste freigegebene Plattform mit ausreichender Qualität, bevorzugt aber M365 und danach den Azure-Tenant,
solange die Mehrkosten ≤ 25 % bzw. ≤ 500 € p. a. sind. Der Abstand zur günstigsten Option ohne Sicherheitsfilter wird als
„Preis der Sicherheit“ ausgewiesen. Vorhandene Copilot-Lizenzen verursachen keine Zusatzkosten; Lizenzkosten entstehen nur für fehlende Lizenzen.
Alle Preise und Regeln sind unter „Preise & Annahmen“ anpassbar (eigener `localStorage`-Schlüssel).

Daten werden im `localStorage` des Browsers gespeichert (Schema-versioniert, beschädigte Daten werden erkannt und ersetzt).
Über die Sidebar lassen sich die Demo-Daten zurücksetzen oder alle Prozesse löschen.

## Architektur

```
src/
  config/        scoringConfig.ts (alle Gewichte, Schwellen, Bänder), options.ts (Labels), helpTexts.ts,
                 aiPlatforms.ts (Preiskatalog mit Quellen), aiConfig.ts (Sicherheitsstufen, Token-/Credit-Annahmen, Erkennung)
  lib/           reine Fachlogik ohne UI – vollständig getestet
    calculations.ts    Wirtschaftlichkeitsrechnung (inkl. KI-Nutzungskosten)
    aiProfile.ts       Erkennung von Aufgabentyp, Betriebsart, Datenklasse, Komplexität
    aiCost.ts          Kosten je Plattform, Sicherheitsfilter, M365-first-Empfehlung, Copilot-Check, Benchmark
    aiSettings.ts      Editierbare Preise/Annahmen (localStorage)
    cockpit.ts         C-Level-Aggregation, Szenarien, Kernaussagen
    scoring.ts         Automation Opportunity Score
    recommendation.ts  Lösungsansatz (Regeln R1–R5)
    priority.ts        Portfolio-Priorität
    evaluation.ts      Zusammenführung + nächster Schritt
    portfolio.ts       Filter, Sortierung, Summen
    validation.ts      Formularvalidierung
    storage.ts         localStorage-Persistenz
    csv.ts, format.ts  Export, deutsche Formatierung/Eingabe
    __tests__/         Vitest
  data/demoData.ts     11 fiktive Beispielprozesse
  state/               Store (React Context), Toasts, Hash-Router
  components/          UI-Bausteine, Layout, Dashboard, Prozesse, Wertrechner
  pages/               KI-Cockpit, Preise & Annahmen, AI-CoE-Portfolio, Use Cases, Formular, Detail, Business Case, Methodik
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
KI-Nutzungskosten p. a.  = Tokens, Copilot Credits oder fehlende Lizenzen der empfohlenen Plattform
Netto-Nutzen laufend     = Kapazitätswert + Qualitätsnutzen + harte Einsparungen − Betrieb × 12 − KI-Nutzungskosten
Netto-Nutzen Jahr 1      = Netto-Nutzen laufend − Implementierung
ROI Jahr 1               = Netto-Nutzen Jahr 1 / (Implementierung + Betrieb × 12 + KI-Nutzungskosten)
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
Freigabe-Workflows, Backend, Mehrbenutzer-Synchronisation, automatische Preisaktualisierung (Preise werden manuell gepflegt).
