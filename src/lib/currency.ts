import { toPersianDigits } from './utils';

export type CurrencyUnit = 'IRT' | 'IRR';

export const CURRENCY_LABELS: Record<CurrencyUnit, string> = {
  IRT: 'تومان',
  IRR: 'ریال',
};

/**
 * دریافت عنوان فارسی واحد پول
 */
export function getCurrencyLabel(unit: CurrencyUnit): string {
  return CURRENCY_LABELS[unit] || 'تومان';
}

/**
 * تبدیل مبلغ از تومان (واحد پایه دیتابیس) به ریال
 */
export function tomanToRial(toman: number): number {
  return Math.round(toman * 10);
}

/**
 * تبدیل مبلغ از ریال به تومان (واحد پایه دیتابیس)
 */
export function rialToToman(rial: number): number {
  return Math.round(rial / 10);
}

/**
 * تبدیل از واحد پایه دیتابیس (همیشه تومان) به واحد مقصد
 */
export function convertFromBase(amountInToman: number, targetUnit: CurrencyUnit): number {
  if (targetUnit === 'IRR') {
    return tomanToRial(amountInToman);
  }
  return amountInToman;
}

/**
 * تبدیل از واحد ورودی به واحد پایه دیتابیس (همیشه تومان)
 */
export function convertToBase(amount: number, sourceUnit: CurrencyUnit): number {
  if (sourceUnit === 'IRR') {
    return rialToToman(amount);
  }
  return amount;
}

/**
 * تبدیل مستقیم بین دو واحد مشخص
 */
export function convertCurrency(amount: number, fromUnit: CurrencyUnit, toUnit: CurrencyUnit): number {
  if (fromUnit === toUnit) return amount;
  if (fromUnit === 'IRT' && toUnit === 'IRR') {
    return tomanToRial(amount);
  }
  if (fromUnit === 'IRR' && toUnit === 'IRT') {
    return rialToToman(amount);
  }
  return amount;
}

export interface FormatCurrencyOptions {
  showUnit?: boolean;
  persianDigits?: boolean;
}

/**
 * فرمت‌بندی مبلغ متناسب با واحد مورد نظر
 */
export function formatCurrency(
  amountInToman: number | string | null | undefined,
  unit: CurrencyUnit = 'IRT',
  options: FormatCurrencyOptions = {}
): string {
  const { showUnit = true, persianDigits = true } = options;
  if (amountInToman === undefined || amountInToman === null || amountInToman === '') {
    return showUnit ? `۰ ${getCurrencyLabel(unit)}` : '۰';
  }

  const rawNum = typeof amountInToman === 'string' 
    ? Number(amountInToman.replace(/[,،_\s]/g, ''))
    : Number(amountInToman);

  const num = isNaN(rawNum) ? 0 : rawNum;
  const converted = convertFromBase(num, unit);
  const formatted = Math.round(converted).toLocaleString('en-US');
  const resultDigits = persianDigits ? toPersianDigits(formatted) : formatted;

  if (showUnit) {
    return `${resultDigits} ${getCurrencyLabel(unit)}`;
  }
  return resultDigits;
}
