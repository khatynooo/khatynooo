import test from 'node:test';
import assert from 'node:assert/strict';
import { isDuplicateScan, normalizeScannedBarcode } from '../src/lib/barcodeScannerUtils';

test('normalizes Persian numerals and scanner whitespace', () => {
  assert.equal(normalizeScannedBarcode(' ۱۲۳۴۵\t\r\n '), '12345');
});

test('removes common AIM prefix while preserving leading zeroes', () => {
  assert.equal(normalizeScannedBarcode(']C10001234567890'), '0001234567890');
});

test('removes control characters but preserves barcode payload', () => {
  assert.equal(normalizeScannedBarcode('ABC\u0000-123\u001D'), 'ABC-123');
});

test('deduplicates only near-simultaneous duplicate events', () => {
  const previous = { code: '123456', timestamp: 1000 };
  assert.equal(isDuplicateScan('123456', previous, 1050), true);
  assert.equal(isDuplicateScan('123456', previous, 1100), false);
  assert.equal(isDuplicateScan('654321', previous, 1010), false);
});
