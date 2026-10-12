import { FlaskConical } from 'lucide-react';
import { DEMO_DATA_NOTICE } from '../../config/options';

export function DemoNotice({ text }: { text?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-400 bg-brand-50 px-4 py-2.5 text-sm text-ink-900">
      <span className="inline-flex items-center gap-2 font-semibold tracking-wide">
        <FlaskConical className="size-4" aria-hidden />
        {DEMO_DATA_NOTICE}
      </span>
      <span className="text-ink-700">
        {text ?? 'Alle Beispielprozesse und berechneten Ergebnisse sind fiktiv und dienen nur der Demonstration.'}
      </span>
    </div>
  );
}

export function EstimateNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      Alle Werte sind Schätzungen auf Basis der erfassten Annahmen und bis zur Validierung durch Fachbereich und Controlling nicht belastbar.
      Freigesetzte Kapazität ist wirtschaftliches Potenzial – keine realisierte Kosteneinsparung.
    </p>
  );
}
