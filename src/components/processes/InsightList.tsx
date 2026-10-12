import type { LucideIcon } from 'lucide-react';

interface Props {
  items: string[];
  icon: LucideIcon;
  iconClassName: string;
  empty: string;
}

export function InsightList({ items, icon: Icon, iconClassName, empty }: Props) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
          <Icon className={`mt-0.5 size-4 shrink-0 ${iconClassName}`} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
