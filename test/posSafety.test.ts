import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLRC, createSimulatedPasargadResponse, parsePasargadResponse, sendToPasargadPos } from '../server/posProtocol';
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

test('parses a valid simulated protocol frame without inventing transaction identifiers', () => {
  const response = parsePasargadResponse(createSimulatedPasargadResponse(250000, true));
  assert.equal(response.success, true);
  assert.equal(response.responseCode, '00');
  assert.equal(response.amountRials, 250000);
  assert.ok(response.rrn);
});

test('rejects a response with an invalid LRC checksum', () => {
  const frame = createSimulatedPasargadResponse(250000, true);
  frame[frame.length - 1] ^= 0xff;
  const response = parsePasargadResponse(frame);
  assert.equal(response.success, false);
  assert.equal(response.responseCode, 'ERR_INVALID_LRC');
});


test('does not invent transaction identifiers when the terminal omits them', () => {
  const payload = Buffer.from('01', 'ascii');
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length, 0);
  const covered = Buffer.concat([length, payload, Buffer.from([0x03])]);
  const frame = Buffer.concat([Buffer.from([0x02]), covered, Buffer.from([calculateLRC(covered)])]);
  const response = parsePasargadResponse(frame);
  assert.equal(response.success, false);
  assert.equal(response.rrn, undefined);
  assert.equal(response.refNumber, undefined);
});

test('does not send zero or invalid amounts to a payment terminal', async () => {
  const result = await sendToPasargadPos(
    { ip: '192.0.2.1', port: 7000, timeoutMs: 100, terminalId: '12345678', isSimulation: false },
    { amountRials: 0, invoiceNumber: 'TEST-1' }
  );
  assert.equal(result.result.success, false);
  assert.equal(result.result.responseCode, 'INVALID_AMOUNT');
  assert.equal(result.rawRequestHex, '');
});
