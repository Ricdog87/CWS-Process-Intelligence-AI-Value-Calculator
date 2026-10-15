/** German number, currency and date formatting plus tolerant parsing of user input. */

const LOCALE = 'de-DE';

const numberFormatters = new Map<number, Intl.NumberFormat>();
function numberFormatter(decimals: number): Intl.NumberFormat {
  let f = numberFormatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    numberFormatters.set(decimals, f);
  }
  return f;
}

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });

/** Avoids "-0" in output. */
const clean = (value: number) => (Object.is(value, -0) || Math.abs(value) < 1e-9 ? 0 : value);

/** Typographic minus (U+2212) for every displayed negative value – consistent with signed amounts. */
const minus = (text: string) => text.replace('-', '\u2212');

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return minus(numberFormatter(decimals).format(clean(value)));
}

export function formatCurrency(value: number | null | undefined, options: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  const v = clean(Math.round(value));
  if (options.compact) return formatCompactCurrency(v);
  return minus(currencyFormatter.format(v));
}

/** Short German notation for KPI cards and chart axes: "1,2 Mio. €", "85 Tsd. €", "950 €". */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, abs >= 10_000_000 ? 0 : 1)} Mio. €`;
  if (abs >= 10_000) return `${sign}${formatNumber(abs / 1_000, 0)} Tsd. €`;
  if (abs >= 1_000) return `${sign}${formatNumber(abs / 1_000, 1)} Tsd. €`;
  return `${sign}${formatNumber(abs, 0)} €`;
}

/** Compact axis ticks in German finance notation: "1,2 Mio. €", "150 T€", "500 €". */
export function formatAxisCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, 1)} Mio. €`;
  if (abs >= 1_000) return `${sign}${formatNumber(abs / 1_000, abs >= 10_000 ? 0 : 1)} T€`;
  return `${sign}${formatNumber(abs, 0)} €`;
}

/** Unit costs that can be fractions of a cent: "0,045 ct", "0,12 €", "28,10 €". */
export function formatUnitCost(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  const abs = Math.abs(value);
  if (abs === 0) return '0 €';
  if (abs < 0.01) return `${formatNumber(value * 100, abs < 0.0001 ? 4 : 3)} ct`;
  if (abs < 1) return `${formatNumber(value, 3)} €`;
  return `${formatNumber(value, 2)} €`;
}

/** Currency with explicit sign, e.g. "+12.000 €" / "−4.000 €". */
export function formatSignedCurrency(value: number): string {
  const v = clean(Math.round(value));
  if (v === 0) return formatCurrency(0);
  return `${v > 0 ? '+' : '−'}${formatCurrency(Math.abs(v))}`;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${formatNumber(value, decimals)} %`;
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${formatNumber(value, value < 10 ? 1 : 0)} h`;
}

/** Hours with up to two decimals – for calculation trails that must add up when checked by hand. */
export function formatHoursExact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${formatNumber(value, 2)} h`;
}

export function formatMonths(value: number | null): string {
  if (value === null) return 'nicht erreichbar';
  if (value === 0) return 'sofort';
  if (value < 1) return '< 1 Monat';
  return `${formatNumber(value, 1)} Monate`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateFormatter.format(d);
}

/** Formats a raw number for an input field (no thousands grouping noise for small numbers). */
export function formatInputNumber(value: number | null, decimals = 2): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: decimals, useGrouping: true }).format(value);
}

/**
 * Parses German and international number input.
 * "1.234,5" → 1234.5 · "1234,5" → 1234.5 · "1.234" → 1234 · "12.5" → 12.5 · "" → null · "abc" → NaN
 */
export function parseNumberInput(raw: string): number | null {
  const text = raw.replace(/[\s €%]/g, '').replace(/−/g, '-');
  if (text === '') return null;
  let normalized: string;
  if (text.includes(',')) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(text)) {
    // "1.234" is a thousands separator; "0.055" stays a decimal.
    normalized = text.replace(/\./g, '');
  } else {
    normalized = text;
  }
  if (!/^-?\d*\.?\d+$/.test(normalized) && !/^-?\d+\.?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}
