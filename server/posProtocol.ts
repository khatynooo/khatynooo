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
  const failure = (responseCode: string, responseMessage: string): PosParsedResponse => ({
    success: false,
    responseCode,
    responseMessage,
    rawHex,
  });

  if (buffer.length < 5) {
    return failure('ERR_TOO_SHORT', 'پاسخ دریافتی از کارتخوان ناقص است');
  }
  if (buffer[0] !== STX) {
    return failure('ERR_INVALID_STX', 'بایت شروع (STX) نامعتبر است');
  }

  const declaredLength = buffer.readUInt16BE(1);
  const etxIndex = buffer.indexOf(ETX, 3);
  if (etxIndex === -1) {
    return failure('ERR_NO_ETX', 'بایت پایان (ETX) یافت نشد');
  }
  if (buffer.length !== etxIndex + 2) {
    return failure('ERR_INVALID_FRAME_LENGTH', 'طول فریم دریافتی از کارتخوان نامعتبر است');
  }

  const actualPayloadLength = etxIndex - 3;
  if (declaredLength !== actualPayloadLength) {
    return failure('ERR_INVALID_FRAME_LENGTH', 'طول اعلام‌شده فریم با داده دریافتی مطابقت ندارد');
  }

  const receivedLrc = buffer[etxIndex + 1];
  const calculatedLrc = calculateLRC(buffer.subarray(1, etxIndex + 1));
  if (receivedLrc === undefined || calculatedLrc !== receivedLrc) {
    return failure('ERR_INVALID_LRC', 'اعتبارسنجی checksum پاسخ کارتخوان ناموفق بود');
  }

  const payloadStr = buffer.subarray(3, etxIndex).toString('ascii');
  if (payloadStr.length < 2) {
    return failure('ERR_INVALID_PAYLOAD', 'کد پاسخ کارتخوان ناقص است');
  }

  const responseCode = payloadStr.slice(0, 2);
  const success = responseCode === '00';
  const amountText = payloadStr.slice(2, 14);
  const amountRials = /^\d{12}$/.test(amountText) ? Number(amountText) : undefined;
  if (success && amountRials === undefined) {
    return failure('ERR_INVALID_AMOUNT', 'مبلغ پاسخ موفق کارتخوان نامعتبر است');
  }

  const rrn = payloadStr.slice(14, 26).trim();
  const traceNumber = payloadStr.slice(26, 32).trim();
  const cardNumberMasked = payloadStr.slice(32, 48).trim();
  const refNumber = payloadStr.slice(48, 60).trim();

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

  return {
    success,
    responseCode,
    responseMessage: codeMessages[responseCode] || (success ? 'تراکنش موفق' : `خطای کارتخوان کد ${responseCode}`),
    ...(rrn ? { rrn } : {}),
    ...(refNumber ? { refNumber } : {}),
    ...(traceNumber ? { traceNumber } : {}),
    ...(cardNumberMasked ? { cardNumberMasked } : {}),
    ...(amountRials !== undefined ? { amountRials } : {}),
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
  const cardMasked = '502229******4591';
  const refNo = Math.floor(10000000 + Math.random() * 90000000).toString().padStart(12, '0');
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
  const fail = (responseCode: string, responseMessage: string) => ({
    result: { success: false, responseCode, responseMessage, rawHex: '' } as PosParsedResponse,
    rawRequestHex: '',
    rawResponseHex: '',
    latencyMs: Date.now() - startTime,
  });

  if (!Number.isSafeInteger(params.amountRials) || params.amountRials <= 0 || params.amountRials > 999999999999) {
    return fail('INVALID_AMOUNT', 'مبلغ پرداخت باید عدد صحیح و بزرگ‌تر از صفر باشد');
  }

  if (!config.isSimulation && (!config.ip || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535)) {
    return fail('INVALID_TERMINAL_CONFIG', 'تنظیمات ارتباط با کارتخوان معتبر نیست');
  }

  const requestBuffer = encodePasargadRequest({
    terminalId: config.terminalId,
    amountRials: params.amountRials,
    invoiceNumber: params.invoiceNumber,
  });
  const rawRequestHex = requestBuffer.toString('hex').toUpperCase();

  // Simulation is explicit opt-in only. Hardware failures must never become fake approvals.
  if (config.isSimulation) {
    await new Promise((res) => setTimeout(res, 50));
    const simBuffer = createSimulatedPasargadResponse(params.amountRials, true);
    const parsed = parsePasargadResponse(simBuffer);
    return {
      result: parsed,
      rawRequestHex,
      rawResponseHex: simBuffer.toString('hex').toUpperCase(),
      latencyMs: Date.now() - startTime,
    };
  }

  return new Promise((resolve) => {
    let resolved = false;
    let responseBuffer = Buffer.alloc(0);
    const socket = new net.Socket();
    socket.setTimeout(config.timeoutMs > 0 ? config.timeoutMs : 45000);

    const finish = (parsed: PosParsedResponse, rawResp: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        result: parsed,
        rawRequestHex,
        rawResponseHex: rawResp,
        latencyMs: Date.now() - startTime,
      });
    };

    socket.connect(config.port, config.ip, () => {
      socket.write(requestBuffer);
    });

    socket.on('data', (data) => {
      responseBuffer = Buffer.concat([responseBuffer, data]);
      if (responseBuffer.length < 3) return;

      const expectedFrameLength = responseBuffer.readUInt16BE(1) + 5;
      if (expectedFrameLength < 5 || expectedFrameLength > 4096) {
        finish({
          success: false,
          responseCode: 'ERR_INVALID_FRAME_LENGTH',
          responseMessage: 'طول فریم دریافتی از کارتخوان نامعتبر است',
          rawHex: responseBuffer.toString('hex').toUpperCase(),
        }, responseBuffer.toString('hex').toUpperCase());
        return;
      }
      if (responseBuffer.length < expectedFrameLength) return;

      const frame = responseBuffer.subarray(0, expectedFrameLength);
      const parsed = parsePasargadResponse(frame);
      if (parsed.success && parsed.amountRials !== params.amountRials) {
        finish({
          ...parsed,
          success: false,
          responseCode: 'AMOUNT_MISMATCH',
          responseMessage: 'مبلغ پاسخ کارتخوان با مبلغ درخواستی مطابقت ندارد؛ وضعیت پرداخت را بررسی کنید',
        }, frame.toString('hex').toUpperCase());
        return;
      }
      finish(parsed, frame.toString('hex').toUpperCase());
    });

    socket.on('timeout', () => {
      finish({
        success: false,
        responseCode: 'TIMEOUT',
        responseMessage: 'پاسخی از دستگاه کارتخوان در زمان مقرر دریافت نشد؛ وضعیت پرداخت را بررسی کنید',
        rawHex: '',
      }, '');
    });

    socket.on('error', (err) => {
      finish({
        success: false,
        responseCode: 'CONNECTION_ERROR',
        responseMessage: `ارتباط واقعی با کارتخوان برقرار نشد: ${err.message}`,
        rawHex: '',
      }, '');
    });
  });
}
