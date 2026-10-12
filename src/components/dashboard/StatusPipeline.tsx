import { STATUSES } from '../../config/options';
import type { BusinessProcess } from '../../types/process';

export function StatusPipeline({ processes }: { processes: BusinessProcess[] }) {
  const counts = STATUSES.map((s) => ({ ...s, count: processes.filter((p) => p.status === s.value).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <ul className="space-y-2.5">
      {counts.map((c) => (
        <li key={c.value} className="grid grid-cols-[minmax(0,10.5rem)_1fr_1.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-600">{c.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <span className="block h-full rounded-full bg-[#2a78d6]" style={{ width: `${(c.count / max) * 100}%` }} />
          </span>
          <span className="tabular text-right font-semibold text-slate-900">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}
