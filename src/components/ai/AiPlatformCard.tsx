import { ArrowRight, CheckCircle2, Info, XCircle } from 'lucide-react';
import { DATA_SENSITIVITIES, SECURITY_TIERS } from '../../config/aiConfig';
import type { ProcessEvaluation } from '../../lib/evaluation';
import { formatCurrency, formatNumber, formatUnitCost } from '../../lib/format';
import { paths } from '../../state/router';
import { useProcessStore } from '../../state/ProcessStore';
import type { BusinessProcess } from '../../types/process';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { InfoTip } from '../ui/InfoTip';
import { CopilotVerdictBadge, DecisionBadge, TierBadge } from './AiBadges';

const classLabel = (c: string) => DATA_SENSITIVITIES.find((x) => x.value === c)?.label ?? c;

export function AiPlatformCard({ process, evaluation }: { process: BusinessProcess; evaluation: ProcessEvaluation }) {
  const { profile, recommendation: rec, decision, annualRunCost } = evaluation.ai;
  const recommended = rec.recommended;
  const indicative = evaluation.recommendation.approach === 'optimization_first';
  const { aiSettings } = useProcessStore();
  const allowedTiers = aiSettings.tierPolicy[profile.dataSensitivity];

  return (
    <Card
      className="mt-6"
      title="KI-Plattform & Nutzungskosten"
      subtitle="Copilot-Check, sichere Plattformwahl und laufende Kosten – regelbasiert und nachvollziehbar"
      actions={<DecisionBadge decision={decision.key} label={decision.label} title={decision.reason} />}
    >
      <p className="mb-4 text-sm text-slate-600">
        <span className="font-medium text-slate-900">Entscheidung: </span>
        {decision.reason}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Copilot-Check <CopilotVerdictBadge verdict={rec.copilot.verdict} />
          </h3>
          <p className="mt-2 font-semibold text-slate-900">{rec.copilot.title}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {rec.copilot.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-brand-400 bg-brand-50/60 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Empfohlene Plattform</h3>
          {recommended && rec.llmNeeded ? (
            <>
              <p className="mt-2 font-semibold text-slate-900">{recommended.option.name}</p>
              <div className="mt-1.5">
                <TierBadge tier={recommended.option.tier} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">KI-Kosten p.&nbsp;a.</dt>
                  <dd className="tabular font-semibold text-slate-900">{formatCurrency(recommended.annualCostEur)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">je Vorgang</dt>
                  <dd className="tabular font-semibold text-slate-900">{formatUnitCost(recommended.costPerTransactionEur)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-slate-500">{recommended.basis}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {rec.reasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              {indicative && (
                <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                  Indikativ – der Prozess sollte zuerst optimiert werden; KI-Kosten sind nicht in der Wirtschaftlichkeit enthalten.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{rec.llmNeeded ? rec.reasons[0] : 'Kein Sprachmodell nötig – keine KI-Nutzungskosten.'}</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Sicherheit & Kostenbenchmark</h3>
          <p className="mt-2 text-sm text-slate-700">
            Datenklasse <span className="font-semibold">{classLabel(profile.dataSensitivity)}</span> – freigegebene Umgebungen:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {allowedTiers.length === 0 ? (
              <span className="text-xs text-rose-700">keine Stufe – Policy prüfen</span>
            ) : (
              allowedTiers.map((t) => <TierBadge key={t} tier={t} />)
            )}
          </div>
          {rec.openRouterBenchmark && rec.llmNeeded ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">OpenRouter (günstigster Anbieter)</dt>
                <dd className="tabular font-medium">{formatCurrency(rec.openRouterBenchmark.annualCostEur)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Mehrkosten sichere Umgebung</dt>
                <dd className="tabular font-medium">{formatCurrency(rec.securityPremiumEur)} p.&nbsp;a.</dd>
              </div>
              <p className="text-xs text-slate-500">
                {rec.openRouterBenchmark.eligible
                  ? 'OpenRouter ist für diese Datenklasse freigegeben (nur öffentliche Daten).'
                  : `OpenRouter ist für „${classLabel(profile.dataSensitivity)}“ nicht freigegeben – nur als Kostenvergleich.`}
              </p>
            </dl>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Kein Token-Benchmark – interaktive Nutzung wird über Arbeitsplatzlizenzen bzw. Agenten abgerechnet.</p>
          )}
        </section>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Erkanntes Nutzungsprofil</h3>
          <a href={paths.processEdit(process.id)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
            Profil anpassen <ArrowRight className="size-3.5" aria-hidden />
          </a>
        </div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {profile.signals.map((s) => (
            <li key={s.field} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{s.field}</span>
                <Badge tone={s.source === 'manual' ? 'ink' : 'outline'}>{s.source === 'manual' ? 'manuell' : 'erkannt'}</Badge>
              </div>
              <p className="mt-0.5 font-medium text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.reason}</p>
            </li>
          ))}
        </ul>
        {rec.llmNeeded && (
          <p className="mt-2 text-xs text-slate-500">
            Jahresvolumen: {formatNumber(rec.annualInputTokens / 1_000_000, 1)} Mio. Input- und {formatNumber(rec.annualOutputTokens / 1_000_000, 1)} Mio. Output-Tokens.
          </p>
        )}
      </div>

      {rec.llmNeeded && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Plattformvergleich (Kosten p.&nbsp;a. für diesen Use Case)</h3>
          <div className="scrollbar-thin scroll-hint-x relative mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-3 py-2 text-left font-medium">Option</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Sicherheit</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Freigabe</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Kosten p.&nbsp;a.</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">je Vorgang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rec.options.map((o) => {
                  const isRec = recommended?.option.id === o.option.id;
                  const isBench = rec.openRouterBenchmark?.option.id === o.option.id;
                  return (
                    <tr key={o.option.id} className={isRec ? 'bg-brand-50' : o.eligible ? '' : 'text-slate-400'}>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${o.eligible ? 'text-slate-900' : ''}`}>{o.option.name}</span>
                        {isRec && (
                          <Badge tone="brand" className="ml-2">
                            Empfohlen
                          </Badge>
                        )}
                        {isBench && !isRec && (
                          <Badge tone="outline" className="ml-2">
                            Benchmark
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <TierBadge tier={o.option.tier} short />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {o.eligible ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-3.5" aria-hidden /> freigegeben
                          </span>
                        ) : (
                          <span className="inline-flex items-start gap-1">
                            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {o.blockers.join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(o.annualCostEur)}
                        <InfoTip content={o.basis} label={`Rechenweg ${o.option.name}`} align="right" className="ml-1" />
                      </td>
                      <td className="tabular px-3 py-2 text-right whitespace-nowrap">{formatUnitCost(o.costPerTransactionEur)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Sicherheitsstufen: {(['A', 'B', 'C', 'D'] as const).map((t) => `${t} = ${SECURITY_TIERS[t].short}`).join(' · ')}. Laufende KI-Kosten im Business Case: {formatCurrency(annualRunCost)} p.&nbsp;a.
          </p>
        </div>
      )}
    </Card>
  );
}
