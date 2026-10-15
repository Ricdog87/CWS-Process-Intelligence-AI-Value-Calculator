import { ExternalLink, Gauge, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { TierBadge } from '../components/ai/AiBadges';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/FormFields';
import { InfoTip } from '../components/ui/InfoTip';
import { ConfirmDialog } from '../components/ui/Modal';
import {
  COPILOT_CREDIT_BASIS,
  COPILOT_STUDIO_CREDITS_PER_RUN,
  DATA_SENSITIVITIES,
  SECURITY_TIERS,
  TASK_TOKEN_DEFAULTS,
  TASK_TYPES,
} from '../config/aiConfig';
import { AI_CATALOG, FX_SOURCE, PRICE_FACTS, PRICES_AS_OF } from '../config/aiPlatforms';
import { applyCatalogSettings, costPer1000, userPriceEur } from '../lib/aiCost';
import type { AiSettings, PriceOverride } from '../lib/aiSettings';
import { formatCurrency, formatNumber } from '../lib/format';
import { paths } from '../state/router';
import { useProcessStore } from '../state/ProcessStore';
import { useToast } from '../state/Toast';
import type { AiOption, DataSensitivity, SecurityTier, TaskType } from '../types/ai';

const TIERS: SecurityTier[] = ['A', 'B', 'C', 'D'];

/** Smallest quality that is enough for standard tasks; below it the matrix cell is greyed out. */
const STANDARD_QUALITY = 2;

const twoDecimals = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtEur(value: number | null): string {
  if (value === null) return '–';
  if (value < 10) return `${twoDecimals.format(value)} €`;
  return formatCurrency(value);
}

function PriceInput({
  label,
  optionName,
  value,
  listValue,
  unit,
  decimals,
  onChange,
}: {
  label: string;
  optionName: string;
  value: number;
  listValue: number;
  unit: string;
  decimals: number;
  onChange: (v: number | null) => void;
}) {
  const changed = value !== listValue;
  return (
    <label className="block w-[8.5rem]">
      <span className="mb-1 block text-[11px] text-slate-500">{label}</span>
      <NumberInput
        value={value}
        decimals={decimals}
        unit={unit}
        ariaLabel={`${optionName}: ${label}`}
        onChange={(v) => {
          if (v === null) onChange(null);
          else if (Number.isFinite(v) && v >= 0) onChange(v);
        }}
      />
      {changed && (
        <span className="mt-0.5 block text-[11px] text-amber-700">
          Liste: {formatNumber(listValue, decimals)} {unit}
        </span>
      )}
    </label>
  );
}

function AssumptionField({
  label,
  hint,
  value,
  unit,
  min,
  max,
  decimals = 2,
  onCommit,
}: {
  label: string;
  hint: ReactNode;
  value: number;
  unit: string;
  min: number;
  max: number;
  decimals?: number;
  onCommit: (v: number) => void;
}) {
  const [error, setError] = useState<string | undefined>();
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {label}
        <InfoTip content={hint} label={`Erläuterung: ${label}`} />
      </div>
      <NumberInput
        value={value}
        unit={unit}
        decimals={decimals}
        ariaLabel={label}
        error={error}
        onChange={(v) => {
          if (v !== null && Number.isFinite(v) && v >= min && v <= max) {
            setError(undefined);
            onCommit(v);
          } else {
            setError(`Bitte einen Wert zwischen ${formatNumber(min, decimals)} und ${formatNumber(max, decimals)} eingeben.`);
          }
        }}
        onBlur={() => setError(undefined)}
      />
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

function modeLabel(o: AiOption): string {
  if (o.modes.length === 2) return 'interaktiv + automatisiert';
  return o.modes[0] === 'interactive' ? 'interaktiv' : 'automatisiert';
}

export function PricingPage() {
  const { aiSettings, updateAiSettings, resetAiSettings } = useProcessStore();
  const { notify } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const effective = useMemo(() => applyCatalogSettings(AI_CATALOG, { ...aiSettings, disabledOptions: [] }), [aiSettings]);
  const active = effective.filter((o) => !aiSettings.disabledOptions.includes(o.id));
  const scalable = active.filter((o) => o.pricing.model !== 'per_user');
  const seats = active.filter((o) => o.pricing.model === 'per_user');

  /** Cheapest closed-environment option (tier A/B) per task with standard quality – highlighted in the matrix. */
  const bestSecure = useMemo(() => {
    const out = {} as Record<TaskType, string | null>;
    for (const t of TASK_TYPES) {
      const d = TASK_TOKEN_DEFAULTS[t.value];
      let best: { id: string; cost: number } | null = null;
      for (const o of scalable) {
        if ((o.tier !== 'A' && o.tier !== 'B') || o.quality[t.value] < STANDARD_QUALITY) continue;
        const c = costPer1000(o, t.value, d.input, d.output, aiSettings);
        if (c !== null && (!best || c < best.cost)) best = { id: o.id, cost: c };
      }
      out[t.value] = best?.id ?? null;
    }
    return out;
  }, [scalable, aiSettings]);

  const setOverride = (id: string, patch: PriceOverride) => {
    const current = { ...(aiSettings.priceOverrides[id] ?? {}), ...patch };
    const clean = Object.fromEntries(Object.entries(current).filter(([, v]) => v !== undefined)) as PriceOverride;
    const next = { ...aiSettings.priceOverrides };
    if (Object.keys(clean).length) next[id] = clean;
    else delete next[id];
    updateAiSettings({ priceOverrides: next });
  };

  /** Sets the price field back to the list price when it is cleared or equals the list price. */
  const priceChange = (o: AiOption, field: keyof PriceOverride, list: number) => (v: number | null) =>
    setOverride(o.id, { [field]: v === null || v === list ? undefined : v });

  const toggleOption = (id: string, enabled: boolean) => {
    const set = new Set(aiSettings.disabledOptions);
    if (enabled) set.delete(id);
    else set.add(id);
    updateAiSettings({ disabledOptions: [...set] });
  };

  const togglePolicy = (cls: DataSensitivity, tier: SecurityTier, allowed: boolean) => {
    const list = new Set(aiSettings.tierPolicy[cls]);
    if (allowed) list.add(tier);
    else list.delete(tier);
    updateAiSettings({ tierPolicy: { ...aiSettings.tierPolicy, [cls]: TIERS.filter((t) => list.has(t)) } });
  };

  const assumption = (key: keyof AiSettings) => (v: number) => updateAiSettings({ [key]: v } as Partial<AiSettings>);
  const overrideCount = Object.keys(aiSettings.priceOverrides).length + aiSettings.disabledOptions.length;

  return (
    <>
      <PageHeader
        title="Preise & Annahmen"
        subtitle={`Alle Listenpreise, Kurse und Regeln des KI-Kostenmodells – mit Quelle und Preisstand ${PRICES_AS_OF}. Änderungen wirken sofort auf alle Use Cases und das Cockpit.`}
        back={{ href: paths.cockpit(), label: 'KI-Cockpit' }}
        actions={
          <>
            <LinkButton href={paths.cockpit()} icon={Gauge}>
              Zum Cockpit
            </LinkButton>
            <Button icon={RotateCcw} onClick={() => setConfirmReset(true)}>
              Auf Listenpreise zurücksetzen
            </Button>
          </>
        }
        meta={
          <>
            <Badge tone="outline">Preisstand {PRICES_AS_OF}</Badge>
            <Badge tone="outline">ohne MwSt., ohne Rabatte</Badge>
            {overrideCount > 0 && <Badge tone="amber">{overrideCount} Anpassung(en) aktiv</Badge>}
          </>
        }
      />

      <Card
        title="Kosten je 1.000 Vorgänge"
        subtitle="Laufende KI-Kosten je Aufgabentyp mit den Standard-Tokenmengen. Markiert: günstigste Option in geschlossener Umgebung (Stufe A/B) mit ausreichender Qualität."
        bodyClassName=""
      >
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th scope="col" className="px-3 py-2.5 pl-5 text-left font-medium">
                  Plattform / Modell
                </th>
                {TASK_TYPES.map((t) => (
                  <th key={t.value} scope="col" className="px-3 py-2.5 text-right font-medium">
                    {t.label}
                    <span className="block font-normal text-slate-400">
                      {formatNumber(TASK_TOKEN_DEFAULTS[t.value].input / 1000, 1)}k / {formatNumber(TASK_TOKEN_DEFAULTS[t.value].output / 1000, 1)}k Tokens
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scalable.map((o) => (
                <tr key={o.id}>
                  <th scope="row" className="px-3 py-2.5 pl-5 text-left font-normal">
                    <span className="block font-medium text-slate-900">{o.name}</span>
                    <span className="mt-1 inline-block">
                      <TierBadge tier={o.tier} />
                    </span>
                  </th>
                  {TASK_TYPES.map((t) => {
                    const d = TASK_TOKEN_DEFAULTS[t.value];
                    const cost = costPer1000(o, t.value, d.input, d.output, aiSettings);
                    const weak = o.quality[t.value] < STANDARD_QUALITY;
                    const best = bestSecure[t.value] === o.id;
                    return (
                      <td
                        key={t.value}
                        title={weak ? 'Qualität nur für einfache Aufgaben ausreichend' : undefined}
                        className={`tabular px-3 py-2.5 text-right whitespace-nowrap ${weak ? 'text-slate-400' : 'text-slate-800'}`}
                      >
                        {best ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900">{fmtEur(cost)}</span> : fmtEur(cost)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Grau = Modellqualität nur für einfache Aufgaben. Token-Kosten inkl. {formatNumber(aiSettings.tokenOverheadPct, 0)} % Aufschlag für Systemanweisungen und
          Wiederholungen, umgerechnet mit {formatNumber(aiSettings.eurPerUsd, 3)} €/$. Copilot Credits je Vorgang siehe unten.
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2" title="Lizenzen je Nutzer" subtitle="Für interaktive Nutzung – unabhängig von der Anzahl der Vorgänge.">
          <ul className="divide-y divide-slate-100 text-sm">
            {seats.map((o) => {
              const eur = o.pricing.model === 'per_user' ? userPriceEur(o.pricing, aiSettings) : 0;
              return (
                <li key={o.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{o.name}</span>
                    <span className="mt-1 inline-block">
                      <TierBadge tier={o.tier} />
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className="block font-semibold text-slate-900">{twoDecimals.format(eur)} € / Monat</span>
                    <span className="block text-xs text-slate-500">{formatCurrency(eur * 12)} pro Jahr</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Copilot-Lizenzen rechnet das Tool nur für Nutzer ohne Lizenz. Mitarbeitende mit Lizenz nutzen interaktive Agenten ohne Credit-Kosten.
          </p>
        </Card>

        <Card
          className="xl:col-span-3"
          title="Sicherheitsrichtlinie"
          subtitle="Welche Umgebung darf welche Daten verarbeiten? Das Tool empfiehlt nur freigegebene Plattformen."
          bodyClassName=""
        >
          <div className="scrollbar-thin relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-3 py-2.5 pl-5 text-left font-medium">
                    Datenklasse
                  </th>
                  {TIERS.map((t) => (
                    <th key={t} scope="col" className="px-3 py-2.5 text-center font-medium">
                      <span className="block font-semibold text-slate-700">Stufe {t}</span>
                      <span className="block font-normal">{SECURITY_TIERS[t].short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DATA_SENSITIVITIES.map((cls) => (
                  <tr key={cls.value}>
                    <th scope="row" className="px-3 py-2.5 pl-5 text-left font-medium text-slate-800">
                      {cls.label}
                    </th>
                    {TIERS.map((t) => {
                      const allowed = aiSettings.tierPolicy[cls.value].includes(t);
                      return (
                        <td key={t} className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-[#231F20]"
                            checked={allowed}
                            aria-label={`${cls.label}: Stufe ${t} ${SECURITY_TIERS[t].short} erlaubt`}
                            onChange={(e) => togglePolicy(cls.value, t, e.target.checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1.5 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
            {TIERS.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="font-semibold text-slate-800">{t}:</span>
                {SECURITY_TIERS[t].description}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        className="mt-6"
        title="Plattformen & Listenpreise"
        subtitle="Verhandelte Preise (z. B. aus dem Enterprise Agreement) direkt eintragen; leeres Feld = Listenpreis. Deaktivierte Plattformen werden nie empfohlen."
        bodyClassName=""
      >
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="w-full min-w-[1060px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th scope="col" className="w-14 px-3 py-2.5 pl-5 text-left font-medium">
                  Aktiv
                </th>
                <th scope="col" className="w-64 px-3 py-2.5 text-left font-medium">
                  Plattform / Modell
                </th>
                <th scope="col" className="w-[19rem] px-3 py-2.5 text-left font-medium">
                  Preis
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Einordnung
                </th>
                <th scope="col" className="w-32 px-3 py-2.5 pr-5 text-left font-medium">
                  Quelle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {effective.map((o) => {
                const list = AI_CATALOG.find((x) => x.id === o.id)!;
                const enabled = !aiSettings.disabledOptions.includes(o.id);
                const p = o.pricing;
                const lp = list.pricing;
                return (
                  <tr key={o.id} className={`align-top ${enabled ? '' : 'bg-slate-50/70 text-slate-400'}`}>
                    <td className="px-3 py-3 pl-5">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-[#231F20]"
                        checked={enabled}
                        aria-label={`${o.name} aktiv`}
                        onChange={(e) => toggleOption(o.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`block font-medium ${enabled ? 'text-slate-900' : ''}`}>{o.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <TierBadge tier={o.tier} />
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {modeLabel(o)} · {o.euDataResidency ? 'EU-Verarbeitung möglich' : 'keine EU-Datenzone'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {p.model === 'per_token' && lp.model === 'per_token' && (
                        <div className="flex gap-2">
                          <PriceInput optionName={o.name} label="Input je Mio. Tokens" value={p.inputUsdPer1M} listValue={lp.inputUsdPer1M} unit="$" decimals={4} onChange={priceChange(o, 'inputUsdPer1M', lp.inputUsdPer1M)} />
                          <PriceInput optionName={o.name} label="Output je Mio. Tokens" value={p.outputUsdPer1M} listValue={lp.outputUsdPer1M} unit="$" decimals={4} onChange={priceChange(o, 'outputUsdPer1M', lp.outputUsdPer1M)} />
                        </div>
                      )}
                      {p.model === 'per_user' && lp.model === 'per_user' && (
                        <PriceInput
                          optionName={o.name}
                          label="je Nutzer und Monat"
                          value={p.pricePerUserMonth}
                          listValue={lp.pricePerUserMonth}
                          unit={p.currency === 'USD' ? '$' : '€'}
                          decimals={2}
                          onChange={priceChange(o, 'pricePerUserMonth', lp.pricePerUserMonth)}
                        />
                      )}
                      {p.model === 'per_credit' && lp.model === 'per_credit' && (
                        <PriceInput optionName={o.name} label="je Copilot Credit" value={p.eurPerCredit} listValue={lp.eurPerCredit} unit="€" decimals={6} onChange={priceChange(o, 'eurPerCredit', lp.eurPerCredit)} />
                      )}
                      {o.tokenFactor && o.tokenFactor !== 1 && (
                        <span className="mt-1 block text-[11px] text-slate-500">Tokenizer: ×{formatNumber(o.tokenFactor, 2)} Tokens</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs leading-relaxed text-slate-600">{o.notes}</td>
                    <td className="px-3 py-3 pr-5">
                      <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-600 underline hover:text-slate-900">
                        {new URL(o.sourceUrl).hostname.replace(/^www\./, '')}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Card title="Annahmen des Kostenmodells" subtitle="Gelten für alle Use Cases, sofern dort nichts anderes erfasst ist.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AssumptionField
              label="Wechselkurs"
              unit="€/$"
              decimals={4}
              min={0.3}
              max={3}
              value={aiSettings.eurPerUsd}
              onCommit={assumption('eurPerUsd')}
              hint={`Euro je US-Dollar für Preise in USD (Tokens, ChatGPT/Claude-Lizenzen, OpenRouter). Standard: ${FX_SOURCE}. Microsoft-Euro-Listenpreise (Copilot, Credits) werden direkt verwendet.`}
            />
            <AssumptionField
              label="Token-Aufschlag"
              unit="%"
              decimals={0}
              min={0}
              max={300}
              value={aiSettings.tokenOverheadPct}
              onCommit={assumption('tokenOverheadPct')}
              hint="Zusätzliche Input-Tokens für Systemanweisungen, Wiederholungen und Tool-Aufrufe."
            />
            <AssumptionField
              label="Sicherheits-Toleranz"
              unit="%"
              decimals={0}
              min={0}
              max={1000}
              value={aiSettings.m365PreferenceMarginPct}
              onCommit={assumption('m365PreferenceMarginPct')}
              hint="Microsoft 365 first, dann Azure-Tenant: Die sicherere Plattform wird empfohlen, solange sie höchstens so viel Prozent teurer ist als die günstigste freigegebene Alternative …"
            />
            <AssumptionField
              label="… oder Mehrkosten p. a. bis"
              unit="€"
              decimals={0}
              min={0}
              max={10_000_000}
              value={aiSettings.m365PreferenceAbsoluteEur}
              onCommit={assumption('m365PreferenceAbsoluteEur')}
              hint="… oder ihre Mehrkosten pro Jahr unter diesem Betrag bleiben. Kleine Beträge rechtfertigen keinen Plattformwechsel."
            />
            <AssumptionField
              label="Copilot-Abdeckung"
              unit="%"
              decimals={0}
              min={0}
              max={100}
              value={aiSettings.defaultCopilotCoveragePct}
              onCommit={assumption('defaultCopilotCoveragePct')}
              hint="Anteil der beteiligten Mitarbeitenden mit Copilot-Lizenz, wenn im Use Case nichts erfasst ist."
            />
            <AssumptionField
              label="Stunden je Nutzer/Monat"
              unit="h"
              decimals={0}
              min={1}
              max={200}
              value={aiSettings.hoursPerUserPerMonth}
              onCommit={assumption('hoursPerUserPerMonth')}
              hint="Schätzt die Zahl der beteiligten Nutzer aus der monatlichen Arbeitszeit des Prozesses, wenn sie nicht erfasst ist."
            />
            <AssumptionField
              label="Volumenschwelle/Monat"
              unit="Vorg."
              decimals={0}
              min={1}
              max={10_000_000}
              value={aiSettings.highVolumeThreshold}
              onCommit={assumption('highVolumeThreshold')}
              hint="Ab diesem Monatsvolumen empfiehlt der Copilot-Check für automatisierte Verarbeitung den Azure-Tenant statt eines Copilot-Agenten."
            />
          </div>
        </Card>

        <Card title="Mengengerüst je Vorgang" subtitle="Standardwerte je Aufgabentyp – im Use Case überschreibbar." bodyClassName="">
          <div className="scrollbar-thin relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-3 py-2.5 pl-5 text-left font-medium">
                    Aufgabe
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Input
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Output
                  </th>
                  <th scope="col" className="px-3 py-2.5 pr-5 text-right font-medium">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TASK_TYPES.map((t) => {
                  const d = TASK_TOKEN_DEFAULTS[t.value];
                  return (
                    <tr key={t.value} className="align-top">
                      <th scope="row" className="px-3 py-2.5 pl-5 text-left font-normal">
                        <span className="block font-medium text-slate-900">{t.label}</span>
                        <span className="block text-xs text-slate-500">{d.basis}</span>
                      </th>
                      <td className="tabular px-3 py-2.5 text-right whitespace-nowrap">{formatNumber(d.input)}</td>
                      <td className="tabular px-3 py-2.5 text-right whitespace-nowrap">{formatNumber(d.output)}</td>
                      <td className="tabular px-3 py-2.5 pr-5 text-right whitespace-nowrap" title={COPILOT_CREDIT_BASIS[t.value]}>
                        {COPILOT_STUDIO_CREDITS_PER_RUN[t.value]}
                        <span className="block text-[11px] text-slate-500">{COPILOT_CREDIT_BASIS[t.value]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">1 deutsches Wort ≈ 1,65 Tokens (OpenAI-Tokenizer, gemessen), 1 A4-Seite ≈ 780 Tokens. Input = Anweisungen + Dokument/E-Mail; Output = Antwort der KI.</p>
        </Card>
      </div>

      <Card className="mt-6" title="Fakten hinter den Preisen" subtitle="Was die Zahlen bedeuten – mit Quelle.">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRICE_FACTS.map((f) => (
            <li key={f.title} className="rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {f.tone === 'secure' && <ShieldCheck className="size-4 text-emerald-700" aria-hidden />}
                {f.tone === 'risk' && <Lock className="size-4 text-rose-700" aria-hidden />}
                {f.title}
              </p>
              <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
              <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 underline hover:text-slate-900">
                Quelle: {new URL(f.sourceUrl).hostname.replace(/^www\./, '')}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Auf Listenpreise zurücksetzen?"
        tone="primary"
        confirmLabel="Zurücksetzen"
        message="Alle angepassten Preise, deaktivierten Plattformen, die Sicherheitsrichtlinie und die Annahmen werden auf den Stand der Recherche zurückgesetzt. Erfasste Use Cases bleiben unverändert."
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAiSettings();
          setConfirmReset(false);
          notify('Preise und Annahmen wurden zurückgesetzt.');
        }}
      />
    </>
  );
}
