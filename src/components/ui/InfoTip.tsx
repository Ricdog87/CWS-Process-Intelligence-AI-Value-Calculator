import { Info } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

interface InfoTipProps {
  content: ReactNode;
  label?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

/** Accessible tooltip: opens on hover and keyboard focus, closes with Escape. */
export function InfoTip({ content, label = 'Erläuterung', className = '', align = 'center' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const position =
    align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex rounded-full text-slate-400 transition-colors hover:text-slate-700 focus-visible:text-slate-700"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`animate-fade-in absolute top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-ink-900 px-3 py-2 text-left text-xs leading-relaxed font-normal text-white normal-case shadow-pop ${position}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
