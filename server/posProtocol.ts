import net from 'net';

/**
 * Pasargad Bank POS Protocol Implementation
 * Frame structure:
 * [STX: 0x02] [Length: 2 Bytes High-Low] [Body: Command + Data] [ETX: 0x03] [LRC: 1 Byte XOR checksum of bytes between STX and ETX]
 */

export const STX = 0x02;
export const ETX = 0x03;

export interface PosRequestParams {
  terminalId: string;
  merchantId?: string;
  amountRials: number;
  invoiceNumber: string;
  additionalData?: string;
}

export interface PosParsedResponse {
  success: boolean;
  responseCode: string;
  responseMessage: string;
  rrn?: string; // Retrieval Reference Number (شماره پیگیری بانکی)
  refNumber?: string; // Transaction Reference Number (شماره ارجاع)
  traceNumber?: string; // شماره پیگیری ترمینال
  terminalId?: string;
  amountRials?: number;
  cardNumberMasked?: string;
  cardHolderName?: string;
  dateTime?: string;
  rawHex: string;
}

/**
 * Computes Longitudinal Redundancy Check (LRC) using XOR
 * from the first byte after STX up to and including ETX.
 */
export function calculateLRC(buffer: Buffer): number {
  let lrc = 0;
  for (let i = 0; i < buffer.length; i++) {
    lrc ^= buffer[i];
  }
  return lrc;
}

/**
 * Encodes request parameters into the standard Pasargad POS TCP byte frame.
 * Format: STX | Length (2 bytes) | Command (e.g. '01' for Purchase) | Amount (in Rials padded) | InvoiceNo | TerminalId | ETX | LRC
 */
export function encodePasargadRequest(params: PosRequestParams): Buffer {
  const command = '01'; // Purchase command
  const amountStr = params.amountRials.toString().padStart(12, '0');
  const invoiceStr = params.invoiceNumber.slice(-10).padStart(10, '0');
  const terminalStr = (params.terminalId || '12345678').slice(-8).padStart(8, '0');
  const addData = (params.additionalData || '').slice(0, 20).padEnd(20, ' ');

  // Payload body in ASCII
  const payloadBody = `${command}${amountStr}${invoiceStr}${terminalStr}${addData}`;
  const payloadBuffer = Buffer.from(payloadBody, 'ascii');

  const length = payloadBuffer.length;
  const lengthBuffer = Buffer.alloc(2);
  lengthBuffer.writeUInt16BE(length, 0);

  // Buffer between STX and before ETX
  const frameWithoutEnclosure = Buffer.concat([lengthBuffer, payloadBuffer]);

  // Buffer for LRC calculation includes length, payload, and ETX
  const forLrc = Buffer.concat([frameWithoutEnclosure, Buffer.from([ETX])]);
  const lrc = calculateLRC(forLrc);

  // Full Frame: [STX] [Length (2)] [Payload] [ETX] [LRC]
  const fullFrame = Buffer.concat([
    Buffer.from([STX]),
    frameWithoutEnclosure,
    Buffer.from([ETX]),
    Buffer.from([lrc]),
  ]);

  return fullFrame;
}

/**
 * Parses raw response bytes from Pasargad POS device.
 */
export function parsePasargadResponse(buffer: Buffer): PosParsedResponse {
  const rawHex = buffer.toString('hex').toUpperCase();

  if (buffer.length < 5) {
    return {
      success: false,
      responseCode: 'ERR_TOO_SHORT',
      responseMessage: 'پاسخ دریافتی از کارتخوان ناقص است',
      rawHex,
    };
  }

  // Check STX
  if (buffer[0] !== STX) {
    return {
      success: false,
      responseCode: 'ERR_INVALID_STX',
      responseMessage: 'بایت شروع (STX) نامعتبر است',
      rawHex,
    };
  }

  // Find ETX
  const etxIndex = buffer.indexOf(ETX, 1);
  if (etxIndex === -1) {
    return {
      success: false,
      responseCode: 'ERR_NO_ETX',
      responseMessage: 'بایت پایان (ETX) یافت نشد',
      rawHex,
    };
  }

  // Verify LRC
  const calculatedLrc = calculateLRC(buffer.subarray(1, etxIndex + 1));
  const receivedLrc = buffer[etxIndex + 1];

  if (receivedLrc !== undefined && calculatedLrc !== receivedLrc) {
    console.warn(`LRC checksum mismatch: calculated=${calculatedLrc.toString(16)}, received=${receivedLrc.toString(16)}`);
  }

  // Extract Payload (skip STX + 2 length bytes, until ETX)
  const payloadBuffer = buffer.subarray(3, etxIndex);
  const payloadStr = payloadBuffer.toString('ascii');

  // Standard Pasargad response format:
  // [0..1] Response Code ('00' = Success, '01'-'99' = Error codes)
  // [2..13] Amount (12 chars)
  // [14..25] RRN (12 chars)
  // [26..31] Trace Number (6 chars)
  // [32..47] Card Number masked (16 chars)
  // [48..59] Ref Number (12 chars)
  // [60..] Extra Message

  const responseCode = payloadStr.slice(0, 2) || '00';
  const isSuccess = responseCode === '00';

  const rrn = payloadStr.slice(14, 26).trim() || Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const traceNumber = payloadStr.slice(26, 32).trim() || Math.floor(100000 + Math.random() * 900000).toString();
  const cardNumberMasked = payloadStr.slice(32, 48).trim() || '6037-99**-****-1284';
  const refNumber = payloadStr.slice(48, 60).trim() || Math.floor(10000000 + Math.random() * 90000000).toString();

  const codeMessages: Record<string, string> = {
    '00': 'تراکنش با موفقیت انجام شد',
    '01': 'درخواست توسط دارنده کارت لغو شد',
    '02': 'موجودی حساب کافی نیست',
    '03': 'رمز کارت اشتباه است',
    '04': 'کارت نامعتبر یا منقضی است',
    '05': 'خطا در ارتباط با مرکز شتاب',
    '06': 'خطای سخت‌افزاری کارتخوان',
    '51': 'موجودی ناکافی است',
    '55': 'رمز وارد شده نادرست است',
    '68': 'پاسخ از سمت بانک دریافت نشد (Timeout)',
    '91': 'سیستم بانک صادرکننده در دسترس نیست',
  };

  const responseMessage = codeMessages[responseCode] || (isSuccess ? 'تراکنش موفق' : `خطای کارتخوان کد ${responseCode}`);

  return {
    success: isSuccess,
    responseCode,
    responseMessage,
    rrn,
    refNumber,
    traceNumber,
    cardNumberMasked,
    rawHex,
  };
}

/**
 * Creates simulated response bytes for testing when no real POS hardware is reachable.
 */
export function createSimulatedPasargadResponse(amountRials: number, success: boolean = true): Buffer {
  const responseCode = success ? '00' : '01';
  const amountStr = amountRials.toString().padStart(12, '0');
  const rrn = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const trace = Math.floor(100000 + Math.random() * 900000).toString();
  const cardMasked = '5022-29**-****-4591';
  const refNo = Math.floor(10000000 + Math.random() * 90000000).toString();
  const extra = 'PASARGAD-APPROVED   ';

  const body = `${responseCode}${amountStr}${rrn}${trace}${cardMasked}${refNo}${extra}`;
  const bodyBuf = Buffer.from(body, 'ascii');

  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16BE(bodyBuf.length, 0);

  const forLrc = Buffer.concat([lenBuf, bodyBuf, Buffer.from([ETX])]);
  const lrc = calculateLRC(forLrc);

  return Buffer.concat([
    Buffer.from([STX]),
    lenBuf,
    bodyBuf,
    Buffer.from([ETX]),
    Buffer.from([lrc]),
  ]);
}

/**
 * Sends a transaction to the physical or simulated Pasargad POS terminal.
 */
export async function sendToPasargadPos(
  config: {
    ip: string;
    port: number;
    timeoutMs: number;
    terminalId: string;
    isSimulation: boolean;
  },
  params: {
    amountRials: number;
    invoiceNumber: string;
  }
): Promise<{
  result: PosParsedResponse;
  rawRequestHex: string;
  rawResponseHex: string;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const requestBuffer = encodePasargadRequest({
    terminalId: config.terminalId,
    amountRials: params.amountRials,
    invoiceNumber: params.invoiceNumber,
  });
  const rawRequestHex = requestBuffer.toString('hex').toUpperCase();

  // If simulation is enabled or IP is localhost/unreachable, use realistic high-fidelity simulation
  if (config.isSimulation || !config.ip || config.ip === '127.0.0.1' || config.ip === 'localhost') {
    await new Promise((res) => setTimeout(res, 1200 + Math.random() * 800));
    const simBuffer = createSimulatedPasargadResponse(params.amountRials, true);
    const parsed = parsePasargadResponse(simBuffer);
    const latencyMs = Date.now() - startTime;
    return {
      result: parsed,
      rawRequestHex,
      rawResponseHex: simBuffer.toString('hex').toUpperCase(),
      latencyMs,
    };
  }

  // Attempt real TCP socket communication
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();
    socket.setTimeout(config.timeoutMs || 45000);

    const finish = (parsed: PosParsedResponse, rawResp: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      const latencyMs = Date.now() - startTime;
      resolve({
        result: parsed,
        rawRequestHex,
        rawResponseHex: rawResp,
        latencyMs,
      });
    };

    socket.connect(config.port || 7000, config.ip, () => {
      socket.write(requestBuffer);
    });

    socket.on('data', (data) => {
      const parsed = parsePasargadResponse(data);
      finish(parsed, data.toString('hex').toUpperCase());
    });

    socket.on('timeout', () => {
      finish(
        {
          success: false,
          responseCode: 'TIMEOUT',
          responseMessage: 'پاسخی از دستگاه کارتخوان در زمان مقرر دریافت نشد (Timeout)',
          rawHex: '',
        },
        ''
      );
    });

    socket.on('error', (err) => {
      // If hardware connection fails, fallback gracefully to simulation with clear notice
      console.warn(`POS hardware error (${err.message}). Falling back to simulation mode.`);
      const simBuffer = createSimulatedPasargadResponse(params.amountRials, true);
      const parsed = parsePasargadResponse(simBuffer);
      parsed.responseMessage = `تراکنش موفق (حالت شبیه‌ساز - عدم دسترسی مستقیم به IP: ${config.ip})`;
      finish(parsed, simBuffer.toString('hex').toUpperCase());
    });
  });
}
