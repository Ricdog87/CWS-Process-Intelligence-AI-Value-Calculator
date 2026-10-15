import { AlertCircle, Check, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatInputNumber, parseNumberInput } from '../../lib/format';
import type { Option } from '../../config/options';
import { InfoTip } from './InfoTip';

interface ShellProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  tooltip?: ReactNode;
  error?: string;
  warning?: string;
  children: ReactNode;
  className?: string;
  /** Use a fieldset/legend (for radio groups and checkbox groups). */
  asGroup?: boolean;
}

export function FieldShell({ label, htmlFor, required, hint, tooltip, error, warning, children, className = '', asGroup }: ShellProps) {
  const labelContent = (
    <>
      {label}
      {required && (
        <span className="ml-0.5 text-rose-600" aria-hidden>
          *
        </span>
      )}
    </>
  );
  const messages = (
    <>
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-rose-700" role="alert">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : warning ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-700">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </>
  );

  if (asGroup) {
    return (
      <fieldset className={`min-w-0 ${className}`}>
        <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
          {labelContent}
          {tooltip && <InfoTip content={tooltip} label={`Hilfe: ${label}`} />}
        </legend>
        {children}
        {messages}
      </fieldset>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
          {labelContent}
        </label>
        {tooltip && <InfoTip content={tooltip} label={`Hilfe: ${label}`} />}
      </div>
      {children}
      {messages}
    </div>
  );
}

const inputBase =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500';

function inputState(error?: string) {
  return error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
    : 'border-slate-300 hover:border-slate-400 focus:border-ink-700 focus:ring-brand-300';
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  tooltip?: ReactNode;
  error?: string;
  warning?: string;
  maxLength?: number;
  className?: string;
  id?: string;
}

export function TextField({ label, value, onChange, onBlur, required, placeholder, hint, tooltip, error, warning, maxLength, className, id }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} required={required} hint={hint} tooltip={tooltip} error={error} warning={warning} className={className}>
      <input
        id={inputId}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-required={required}
        className={`${inputBase} ${inputState(error)} h-10`}
      />
    </FieldShell>
  );
}

interface TextAreaProps extends Omit<TextFieldProps, 'required'> {
  rows?: number;
}

export function TextArea({ label, value, onChange, onBlur, placeholder, hint, tooltip, error, maxLength, rows = 3, className, id }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      hint={hint ?? (maxLength ? `${value.length} / ${maxLength} Zeichen` : undefined)}
      tooltip={tooltip}
      error={error}
      className={className}
    >
      <textarea
        id={inputId}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        className={`${inputBase} ${inputState(error)} resize-y py-2`}
      />
    </FieldShell>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T | '';
  options: Option<T>[];
  onChange: (value: T | '') => void;
  required?: boolean;
  placeholder?: string;
  tooltip?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  id?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, required, placeholder = 'Bitte auswählen', tooltip, hint, error, className, id }: SelectFieldProps<T>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} required={required} tooltip={tooltip} hint={hint} error={error} className={className}>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value as T | '')}
        aria-invalid={!!error}
        aria-required={required}
        className={`${inputBase} ${inputState(error)} h-10 pr-8`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  unit?: string;
  placeholder?: string;
  error?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  /** Maximum decimals shown when the value is formatted (default 2). */
  decimals?: number;
}

/**
 * Text input with German number parsing ("1.250,5"). Keeps the raw text while typing,
 * reports null for empty and NaN for unparsable input (caught by validation).
 */
export function NumberInput({ value, onChange, onBlur, unit, placeholder, error, id, ariaLabel, className = '', decimals = 2 }: NumberInputProps) {
  const [text, setText] = useState(() => formatInputNumber(value, decimals));
  const [focused, setFocused] = useState(false);

  // Sync external changes (e.g. slider, reset) while the field is not being edited.
  useEffect(() => {
    if (focused) return;
    // Keep unparsable text visible so the user can correct it.
    if (typeof value === 'number' && Number.isNaN(value)) return;
    setText(formatInputNumber(value, decimals));
  }, [value, focused, decimals]);

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNumberInput(e.target.value));
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        className={`${inputBase} ${inputState(error)} tabular h-10 text-right ${unit ? 'pr-16' : ''}`}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-start border-l border-slate-200 pl-2 text-xs whitespace-nowrap text-slate-500">
          {unit}
        </span>
      )}
    </div>
  );
}

interface NumberFieldProps extends NumberInputProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  tooltip?: ReactNode;
  warning?: string;
}

export function NumberField({ label, required, hint, tooltip, warning, error, className, ...input }: NumberFieldProps) {
  const autoId = useId();
  const inputId = input.id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} required={required} hint={hint} tooltip={tooltip} error={error} warning={warning} className={className}>
      <NumberInput {...input} id={inputId} error={error} />
    </FieldShell>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T | null) => void;
  tooltip?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Radio group styled as segmented control. Clicking the active option clears the answer. */
export function SegmentedField<T extends string>({ label, value, options, onChange, tooltip, hint, className }: SegmentedProps<T>) {
  const name = useId();
  return (
    <FieldShell label={label} tooltip={tooltip} hint={hint ?? (value === null ? 'Noch nicht bewertet' : undefined)} asGroup className={className}>
      <div className="inline-flex w-full rounded-lg border border-slate-300 bg-slate-50 p-0.5 shadow-sm">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ink-900 ${
                active ? 'bg-ink-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                onClick={() => {
                  if (active) onChange(null);
                }}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

interface ChipGroupProps<T extends string> {
  label: string;
  values: T[];
  options: Option<T>[];
  onChange: (values: T[]) => void;
  tooltip?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function ChipCheckboxGroup<T extends string>({ label, values, options, onChange, tooltip, hint, className }: ChipGroupProps<T>) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <FieldShell label={label} tooltip={tooltip} hint={hint} asGroup className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-900 ${
                active
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input type="checkbox" className="sr-only" checked={active} onChange={() => toggle(o.value)} />
              {active && <Check className="size-3.5" aria-hidden />}
              {o.label}
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

interface SliderFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: ReactNode;
  error?: string;
  warning?: string;
}

export function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, unit = '%', tooltip, error, warning }: SliderFieldProps) {
  const id = useId();
  const sliderValue = value !== null && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
  return (
    <FieldShell label={label} htmlFor={id} tooltip={tooltip} error={error} warning={warning}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} (Schieberegler)`}
          className="h-2 min-w-0 flex-1 cursor-pointer"
        />
        <NumberInput id={id} value={value} onChange={onChange} unit={unit} error={error} className="w-28 shrink-0" />
      </div>
    </FieldShell>
  );
}
