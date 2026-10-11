/** Small, deterministic helpers shared by the hardware scanner and POS tests. */
export function normalizeScannedBarcode(value: string): string {
  return value.replace(/\s/g, '').trim();
}

/**
 * Only suppress duplicate events that are effectively the same event.
 * A cashier must be able to scan the same item repeatedly in quick succession.
 */
export function isDuplicateScan(
  code: string,
  previous: { code: string; timestamp: number },
  now: number,
  windowMs = 80
): boolean {
  return code === previous.code && now >= previous.timestamp && now - previous.timestamp < windowMs;
}
