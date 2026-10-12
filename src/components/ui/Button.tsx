import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-cws-red-500 text-white hover:bg-cws-red-600 active:bg-cws-red-700 border border-cws-red-600 shadow-sm disabled:border-cws-red-200 disabled:bg-cws-red-200',
  secondary:
    'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm disabled:text-slate-400 disabled:hover:bg-white',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-700 shadow-sm disabled:bg-rose-300',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 border border-ink-900 shadow-sm disabled:bg-ink-600',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
  className?: string;
}

const base =
  'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed select-none';

function classes(variant: Variant, size: Size, className = '', iconOnly = false) {
  return `${base} ${VARIANTS[variant]} ${SIZES[size]} ${iconOnly ? (size === 'sm' ? 'w-8 px-0' : 'w-10 px-0') : ''} ${className}`;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, className, !children)} {...rest}>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {children}
      {IconRight && <IconRight className="size-4 shrink-0" aria-hidden />}
    </button>
  );
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={classes(variant, size, className, !children)} {...rest}>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {children}
      {IconRight && <IconRight className="size-4 shrink-0" aria-hidden />}
    </a>
  );
}
