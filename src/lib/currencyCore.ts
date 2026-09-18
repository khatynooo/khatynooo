export type CurrencyUnit = 'IRT' | 'IRR';

export const CURRENCY_LABELS: Record<CurrencyUnit, string> = {
  IRT: 'تومان',
  IRR: 'ریال',
};

/**
 * Single source of truth for money representation.
 * The database stores all monetary values in TOMAN (IRT).
 * IRR is a display/input unit only and is exactly 10x IRT.
 */
export const BASE_CURRENCY: CurrencyUnit = 'IRT';
export const RIALS_PER_TOMAN = 10;

export function normalizeCurrencyUnit(value: unknown, fallback: CurrencyUnit = BASE_CURRENCY): CurrencyUnit {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'irr' || normalized === 'rial' || normalized === 'riyal' || normalized === 'ریال') return 'IRR';
  if (normalized === 'irt' || normalized === 'toman' || normalized === 'tomans' || normalized === 'تومان') return 'IRT';
  return fallback;
}

export function getCurrencyLabel(unit: CurrencyUnit): string {
  return CURRENCY_LABELS[unit] || CURRENCY_LABELS[BASE_CURRENCY];
}

export function tomanToRial(toman: number): number {
  return Math.round(Number(toman || 0) * RIALS_PER_TOMAN);
}

export function rialToToman(rial: number): number {
  return Math.round(Number(rial || 0) / RIALS_PER_TOMAN);
}

export function convertFromBase(amountInToman: number, targetUnit: CurrencyUnit): number {
  return targetUnit === 'IRR' ? tomanToRial(amountInToman) : Math.round(Number(amountInToman || 0));
}

export function convertToBase(amount: number, sourceUnit: CurrencyUnit): number {
  return sourceUnit === 'IRR' ? rialToToman(amount) : Math.round(Number(amount || 0));
}

export function convertCurrency(amount: number, fromUnit: CurrencyUnit, toUnit: CurrencyUnit): number {
  if (fromUnit === toUnit) return Math.round(Number(amount || 0));
  return fromUnit === 'IRT' ? tomanToRial(amount) : rialToToman(amount);
}

export function sourceCurrencyToUnit(value: unknown): CurrencyUnit {
  return normalizeCurrencyUnit(value, BASE_CURRENCY);
}

export function unitToSourceCurrency(unit: CurrencyUnit): 'toman' | 'rial' {
  return unit === 'IRR' ? 'rial' : 'toman';
}

export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value)
    .replace(/[٠-٩]/g, (ch) => persianDigits[ch.charCodeAt(0) - 1632])
    .replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export interface FormatCurrencyOptions {
  showUnit?: boolean;
  persianDigits?: boolean;
}

export function parseMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value)
    .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 1632))
    .replace(/[,،_\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Format a database amount (always TOMAN) in the selected display unit. */
export function formatCurrency(
  amountInToman: number | string | null | undefined,
  unit: CurrencyUnit = BASE_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  const { showUnit = true, persianDigits = true } = options;
  const converted = convertFromBase(parseMoney(amountInToman), unit);
  const formatted = Math.round(converted).toLocaleString('en-US');
  const digits = persianDigits ? toPersianDigits(formatted) : formatted;
  return showUnit ? `${digits} ${getCurrencyLabel(unit)}` : digits;
}
