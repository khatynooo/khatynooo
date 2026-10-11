import { toEnglishDigits } from './utils';

/** Normalize common keyboard-wedge scanner output without losing leading zeroes. */
export function normalizeScannedBarcode(value: string): string {
  let code = toEnglishDigits(value ?? '').trim();
  // Remove common AIM symbology identifiers such as ]C1 or ]d2.
  code = code.replace(/^\][A-Za-z][0-9]/, '');
  // Scanner-added control characters and whitespace are not part of a retail barcode.
  code = code.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s/g, '');
  return code;
}

/** Suppress only effectively simultaneous duplicate events. */
export function isDuplicateScan(
  code: string,
  previous: { code: string; timestamp: number },
  now: number,
  windowMs = 80
): boolean {
  return code === previous.code && now >= previous.timestamp && now - previous.timestamp < windowMs;
}
