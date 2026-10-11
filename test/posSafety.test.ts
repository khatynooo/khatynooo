import test from 'node:test';
import assert from 'node:assert/strict';
import { isDuplicateScan, normalizeScannedBarcode } from '../src/lib/barcodeScannerUtils';

test('normalizes whitespace around scanned barcodes', () => {
  assert.equal(normalizeScannedBarcode('  ۱۲۳۴۵  '), '۱۲۳۴۵');
});

test('deduplicates only near-simultaneous duplicate events', () => {
  const previous = { code: '123456', timestamp: 1000 };
  assert.equal(isDuplicateScan('123456', previous, 1050), true);
  assert.equal(isDuplicateScan('123456', previous, 1100), false);
  assert.equal(isDuplicateScan('654321', previous, 1010), false);
});
