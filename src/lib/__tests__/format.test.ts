import { describe, expect, it } from 'vitest';
import { formatCompactCurrency, formatCurrency, formatMonths, formatNumber, parseNumberInput } from '../format';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('German formatting', () => {
  it('formats numbers and currency', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(nbsp(formatCurrency(104832.4))).toBe('104.832 €');
    expect(formatCurrency(null)).toBe('–');
  });

  it('formats compact currency', () => {
    expect(formatCompactCurrency(1_250_000)).toBe('1,3 Mio. €');
    expect(formatCompactCurrency(85_400)).toBe('85 Tsd. €');
    expect(formatCompactCurrency(-4_500)).toBe('−4,5 Tsd. €');
    expect(formatCompactCurrency(950)).toBe('950 €');
  });

  it('formats payback months', () => {
    expect(formatMonths(null)).toBe('nicht erreichbar');
    expect(formatMonths(0)).toBe('sofort');
    expect(formatMonths(4.72)).toBe('4,7 Monate');
  });
});

describe('parseNumberInput', () => {
  it.each([
    ['1.234,5', 1234.5],
    ['1234,5', 1234.5],
    ['1.234', 1234],
    ['1.234.567', 1234567],
    ['12.5', 12.5],
    ['45 000', 45000],
    ['45.000 €', 45000],
    ['70 %', 70],
    ['0', 0],
    ['0.055', 0.055],
    ['0,006932', 0.006932],
  ])('%s → %f', (input, expected) => {
    expect(parseNumberInput(input)).toBe(expected);
  });

  it('returns null for empty input and NaN for garbage', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('   ')).toBeNull();
    expect(parseNumberInput('abc')).toBeNaN();
    expect(parseNumberInput('1,2,3')).toBeNaN();
  });
});

describe('formatAxisCurrency', () => {
  it('uses T€ and Mio. €', async () => {
    const { formatAxisCurrency } = await import('../format');
    expect(formatAxisCurrency(150_000)).toBe('150 T€');
    expect(formatAxisCurrency(-2_500)).toBe('−2,5 T€');
    expect(formatAxisCurrency(1_200_000)).toBe('1,2 Mio. €');
    expect(formatAxisCurrency(0)).toBe('0 €');
  });
});

describe('signs and exact hours', () => {
  it('uses the typographic minus for negative numbers and currency', async () => {
    const { formatNumber, formatCurrency, formatPercent } = await import('../format');
    expect(formatNumber(-29)).toBe('−29');
    expect(formatPercent(-33)).toBe('−33 %');
    expect(formatCurrency(-45000).replace(/ /g, ' ')).toBe('−45.000 €');
  });

  it('formats calculation-trail hours with two decimals so rows add up', async () => {
    const { formatHoursExact } = await import('../format');
    expect(formatHoursExact(67.5)).toBe('67,5 h');
    expect(formatHoursExact(53.3333)).toBe('53,33 h');
    expect(formatHoursExact(810)).toBe('810 h');
  });
});

describe('formatUnitCost', () => {
  it('shows fractions of a cent readably', async () => {
    const { formatUnitCost } = await import('../format');
    expect(formatUnitCost(0.00045)).toBe('0,045 ct');
    expect(formatUnitCost(0.12)).toBe('0,12 €');
    expect(formatUnitCost(28.1)).toBe('28,1 €');
    expect(formatUnitCost(0)).toBe('0 €');
  });
});
