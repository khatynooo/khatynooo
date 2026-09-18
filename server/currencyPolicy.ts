export type Currency = 'IRT' | 'IRR';

/**
 * Canonical money policy for Khatinoo:
 * - PostgreSQL/API business amounts are always stored and transported internally as TOMAN (IRT).
 * - IRR is a presentation/input currency only.
 * - 1 IRT = 10 IRR.
 */
export const BASE_CURRENCY: Currency = 'IRT';
export const RIALS_PER_TOMAN = 10;

export function normalizeCurrency(value: unknown): Currency {
  const v = String(value ?? '').trim().toUpperCase();
  return v === 'IRR' || v === 'RIAL' || v === 'RIALS' ? 'IRR' : 'IRT';
}

export function toBaseToman(amount: unknown, currency: unknown = BASE_CURRENCY): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error('Invalid monetary amount');
  return normalizeCurrency(currency) === 'IRR' ? n / RIALS_PER_TOMAN : n;
}

export function fromBaseToman(amount: unknown, currency: unknown = BASE_CURRENCY): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error('Invalid monetary amount');
  return normalizeCurrency(currency) === 'IRR' ? n * RIALS_PER_TOMAN : n;
}

export function assertBaseToman(amount: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error('Invalid monetary amount');
  return n;
}

export function roundMoney(amount: number, currency: Currency = BASE_CURRENCY): number {
  const decimals = currency === 'IRR' ? 0 : 0;
  const p = 10 ** decimals;
  return Math.round(amount * p) / p;
}
