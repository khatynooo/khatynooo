/**
 * ماژول ارسال مستقیم پیام ایتا به مشتریان (Eitaa Direct Messenger)
 * ارسال پیام از طریق بات به chat_id تطبیق داده‌شده از شماره موبایل
 */

import { query } from '../dbClient';
import { normalizeEitaaToken } from './providers/eitaaProvider';

export interface DirectMessageResult {
  success: boolean;
  status: 'sent' | 'no_chat_id' | 'failed' | 'not_configured';
  messageId?: string;
  chatId?: string;
  error?: string;
}

/**
 * پاکسازی و نرمال‌سازی شماره تلفن همراه ایران (تبدیل به فرمت استاندارد 09xxxxxxxxx)
 */
export function normalizeMobileNumber(input?: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  // تبدیل ارقام فارسی/عربی به انگلیسی
  cleaned = cleaned.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  cleaned = cleaned.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  // حذف کاراکترهای غیر عددی
  cleaned = cleaned.replace(/\D/g, '');

  // تبدیل +98 یا 0098 به 0
  if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }

  // اگر ۹ رقم بود و بدون صفر شروع شده
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * یافتن chat_id مشتری از جدول eitaa_customer_chats
 */
export async function getEitaaChatIdForMobile(mobile: string): Promise<string | null> {
  const normMobile = normalizeMobileNumber(mobile);
  if (!normMobile) return null;

  try {
    const res = await query(
      `SELECT chat_id FROM eitaa_customer_chats WHERE mobile = $1 ORDER BY updated_at DESC LIMIT 1`,
      [normMobile]
    );
    if (res.rows.length > 0 && res.rows[0].chat_id) {
      return String(res.rows[0].chat_id).trim();
    }
  } catch (err) {
    console.error('Error fetching eitaa chat id for mobile:', err);
  }
  return null;
}

/**
 * ثبت یا به‌روزرسانی اطلاعات کاربر ایتا، شناسه چت و شماره موبایل
 */
export async function registerEitaaCustomerChat(params: {
  chatId: string;
  mobile?: string;
  eitaaUserId?: string;
  firstName?: string;
  username?: string;
  receiptCode?: string;
  source?: string;
}): Promise<boolean> {
  const cleanChatId = String(params.chatId || '').trim();
  if (!cleanChatId) return false;

  const normMobile = params.mobile ? normalizeMobileNumber(params.mobile) : null;
  const cleanReceiptCode = params.receiptCode ? String(params.receiptCode).trim().toUpperCase() : null;
  const src = params.source || 'mini_app';

  try {
    // ۱. بررسی وجود رکورد با chat_id یا mobile
    const existing = await query(
      `SELECT * FROM eitaa_customer_chats WHERE chat_id = $1 ${normMobile ? 'OR mobile = $2' : ''} LIMIT 1`,
      normMobile ? [cleanChatId, normMobile] : [cleanChatId]
    );

    const targetMobile = normMobile || (existing.rows.length > 0 && existing.rows[0].mobile ? existing.rows[0].mobile : `eitaa_${cleanChatId}`);

    if (existing.rows.length > 0) {
      await query(
        `UPDATE eitaa_customer_chats 
         SET chat_id = $1,
             mobile = $2,
             eitaa_user_id = COALESCE($3, eitaa_user_id),
             first_name = COALESCE($4, first_name),
             username = COALESCE($5, username),
             source = COALESCE($6, source),
             last_seen = NOW(),
             updated_at = NOW()
         WHERE chat_id = $1 OR mobile = $2`,
        [
          cleanChatId,
          targetMobile,
          params.eitaaUserId || null,
          params.firstName || null,
          params.username || null,
          src,
        ]
      );
    } else {
      await query(
        `INSERT INTO eitaa_customer_chats (
           chat_id, mobile, eitaa_user_id, first_name, username, source, last_seen, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          cleanChatId,
          targetMobile,
          params.eitaaUserId || null,
          params.firstName || null,
          params.username || null,
          src,
        ]
      );
    }

    // ۲. در صورت وجود کد رسید، افزودن به لیست رسیدهای این کاربر و پیوند سفارش
    if (cleanReceiptCode) {
      try {
        await query(
          `UPDATE eitaa_customer_chats 
           SET receipt_codes = array_append(array_remove(receipt_codes, $1), $1),
               updated_at = NOW()
           WHERE chat_id = $2`,
          [cleanReceiptCode, cleanChatId]
        );

        // پیوند مستقیم به جدول binding_orders
        const orderRes = await query(
          `UPDATE binding_orders 
           SET customer_eitaa_chat_id = $1,
               updated_at = NOW()
           WHERE receipt_code ILIKE $2
           RETURNING customer_mobile`,
          [cleanChatId, cleanReceiptCode]
        );

        // اگر شماره موبایل در پارامترها نبود ولی سفارش دارای موبایل بود، شماره موبایل را هم در eitaa_customer_chats ذخیره کن
        if (!normMobile && orderRes.rows.length > 0 && orderRes.rows[0].customer_mobile) {
          const ordMobile = normalizeMobileNumber(orderRes.rows[0].customer_mobile);
          if (ordMobile) {
            await query(
              `UPDATE eitaa_customer_chats SET mobile = $1 WHERE chat_id = $2 AND mobile IS NULL`,
              [ordMobile, cleanChatId]
            );
          }
        }
      } catch (orderLinkErr) {
        console.warn('Could not link receipt code to order:', orderLinkErr);
      }
    }

    // ۳. اگر شماره موبایل معتبر داشتیم، تمامی سفارشات این مشتری را هم به chat_id او پیوند بده
    if (normMobile) {
      try {
        await query(
          `UPDATE binding_orders 
           SET customer_eitaa_chat_id = $1,
               updated_at = NOW()
           WHERE (customer_mobile = $2 OR customer_mobile = $3)
             AND (customer_eitaa_chat_id IS NULL OR customer_eitaa_chat_id = '')`,
          [cleanChatId, normMobile, normMobile.replace(/^0/, '')]
        );
      } catch (linkAllErr) {
        console.warn('Could not link mobile orders to chat_id:', linkAllErr);
      }
    }

    return true;
  } catch (err) {
    console.error('Error registering eitaa customer chat:', err);
    return false;
  }
}

/**
 * دریافت توکن فعال بات ایتا جهت ارسال پیام مستقیم
 * ابتدا از جدول binding_settings، سپس publication_channels، سپس متغیر محیطی EITAA_BOT_TOKEN
 */
export async function resolveEitaaBotToken(customToken?: string): Promise<string> {
  if (customToken?.trim()) {
    return normalizeEitaaToken(customToken);
  }

  // ۱. بررسی جدول binding_settings
  try {
    const bindRes = await query(`SELECT eitaa_bot_token FROM binding_settings WHERE id = 'default'`);
    if (bindRes.rows.length > 0 && bindRes.rows[0].eitaa_bot_token) {
      const tok = normalizeEitaaToken(bindRes.rows[0].eitaa_bot_token);
      if (tok) return tok;
    }
  } catch {}

  // ۲. بررسی کانال‌های انتشار فعال ایتا در publication_channels
  try {
    const pubRes = await query(`SELECT config FROM publication_channels WHERE provider = 'eitaa' AND enabled = TRUE LIMIT 1`);
    if (pubRes.rows.length > 0 && pubRes.rows[0].config?.token) {
      const tok = normalizeEitaaToken(pubRes.rows[0].config.token);
      if (tok) return tok;
    }
  } catch {}

  // ۳. متغیر محیطی
  if (process.env.EITAA_BOT_TOKEN) {
    return normalizeEitaaToken(process.env.EITAA_BOT_TOKEN);
  }

  return '';
}

/**
 * ارسال پیام مستقیم ایتا به کاربر (با directChatId یا شماره موبایل)
 */
export async function sendDirectEitaaMessage(params: {
  mobile?: string;
  directChatId?: string;
  receiptCode?: string;
  text: string;
  title?: string;
  customToken?: string;
}): Promise<DirectMessageResult> {
  let chatId = params.directChatId ? String(params.directChatId).trim() : '';

  // ۱. در صورتی که directChatId نبود ولی کد رسید بود، از جدول eitaa_customer_chats جستجو می‌کنیم
  if (!chatId && params.receiptCode) {
    try {
      const recRes = await query(
        `SELECT chat_id FROM eitaa_customer_chats WHERE $1 = ANY(receipt_codes) LIMIT 1`,
        [params.receiptCode.trim().toUpperCase()]
      );
      if (recRes.rows.length > 0 && recRes.rows[0].chat_id) {
        chatId = String(recRes.rows[0].chat_id).trim();
      }
    } catch {}
  }

  // ۲. در صورتی که هنوز chatId نبود، از شماره موبایل استعلام می‌گیریم
  if (!chatId && params.mobile) {
    const normMobile = normalizeMobileNumber(params.mobile);
    if (normMobile) {
      chatId = (await getEitaaChatIdForMobile(normMobile)) || '';
    }
  }

  if (!chatId) {
    return {
      success: false,
      status: 'no_chat_id',
      error: params.mobile 
        ? `مشتری با شماره ${params.mobile} هنوز وارد برنامک ایتا نشده و شناسه چت (chat_id) او ثبت نگردیده است.`
        : 'شناسه چت ایتا (chat_id) یا شماره موبایل معتبر یافت نشد.',
    };
  }

  // ۲. دریافت توکن بات
  const token = await resolveEitaaBotToken(params.customToken);
  if (!token) {
    return {
      success: false,
      status: 'not_configured',
      chatId,
      error: 'توکن بات ایتا تنظیم نشده است. لطفاً توکن را در تنظیمات وارد نمایید.',
    };
  }

  const baseUrl = (process.env.EITAA_API_BASE_URL || 'https://eitaayar.ir/api').replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const formParams = new URLSearchParams();
    formParams.append('chat_id', chatId);
    formParams.append('text', params.text);
    if (params.title) {
      formParams.append('title', params.title);
    }

    const response = await fetch(`${baseUrl}/${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.description || data.message || `خطای سرور ایتا (${response.status})`;
      return {
        success: false,
        status: 'failed',
        chatId,
        error: `خطا در ارسال پیام ایتا: ${errorMsg}`,
      };
    }

    // بررسی پاسخ eitaayar (معمولاً { ok: true, result: { message_id: ... } })
    const isOk = data.ok === true || data.success === true || (data.status && data.status !== 'error');
    if (!isOk) {
      return {
        success: false,
        status: 'failed',
        chatId,
        error: data.description || data.message || 'پاسخ ناموفق از وب‌سرویس ایتا دریافت شد.',
      };
    }

    const messageId = String(data.result?.message_id || data.message_id || Date.now());
    return {
      success: true,
      status: 'sent',
      chatId,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      chatId,
      error: err.name === 'AbortError' ? 'مهلت زمانی ارتباط با سرور ایتا به پایان رسید.' : (err.message || 'خطای ناشناخته در ارتباط با ایتا'),
    };
  } finally {
    clearTimeout(timeout);
  }
}
