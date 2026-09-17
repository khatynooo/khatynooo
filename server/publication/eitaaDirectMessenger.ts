/**
 * ماژول ارسال مستقیم پیام ایتا به مشتریان (Eitaa Direct Messenger)
 * ارسال پیام از طریق بات به chat_id تطبیق داده‌شده از شماره موبایل
 */

import { query } from '../dbClient';
import { normalizeEitaaToken } from './providers/eitaaProvider';
import { eitaaService } from '../eitaaService';
import { normalizeIranianMobile, normalizeMobileNumber } from '../phoneUtils';

export { normalizeIranianMobile, normalizeMobileNumber };

export interface DirectMessageResult {
  success: boolean;
  status: 'sent' | 'no_chat_id' | 'failed' | 'not_configured';
  messageId?: string;
  chatId?: string;
  error?: string;
}

/**
 * یافتن chat_id مشتری از جدول eitaa_identities و eitaa_customer_chats
 */
export async function getEitaaChatIdForMobile(mobile: string): Promise<string | null> {
  const normMobile = normalizeIranianMobile(mobile);
  if (!normMobile) return null;

  try {
    // ابتدا از eitaa_identities بررسی شود (با اولویت هویتی که مسدود یا بلاک نشده باشد)
    const idRes = await query(
      `SELECT chat_id FROM eitaa_identities 
       WHERE (mobile = $1 OR mobile = $2) 
         AND is_blocked = FALSE 
         AND eitaa_delivery_blocked = FALSE 
       ORDER BY last_seen_at DESC LIMIT 1`,
      [normMobile, normMobile.replace(/^0/, '')]
    );
    if (idRes.rows.length > 0 && idRes.rows[0].chat_id) {
      return String(idRes.rows[0].chat_id).trim();
    }

    // بررسی پشتیبان از جدول نگاشت eitaa_customer_chats
    const res = await query(
      `SELECT chat_id FROM eitaa_customer_chats WHERE (mobile = $1 OR mobile = $2) ORDER BY updated_at DESC LIMIT 1`,
      [normMobile, normMobile.replace(/^0/, '')]
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
  isVerified?: boolean;
}): Promise<boolean> {
  const cleanChatId = String(params.chatId || '').trim();
  if (!cleanChatId) return false;

  try {
    await eitaaService.upsertIdentity({
      chatId: cleanChatId,
      mobile: params.mobile,
      eitaaUserId: params.eitaaUserId,
      firstName: params.firstName,
      username: params.username,
      receiptCode: params.receiptCode,
      source: params.source || 'mini_app',
      isVerified: params.isVerified,
    });
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
  eitaaUserId?: string;
  orderId?: string;
  receiptCode?: string;
  text: string;
  title?: string;
  customToken?: string;
}): Promise<DirectMessageResult> {
  let chatId = params.directChatId ? String(params.directChatId).trim() : '';

  // ۱. اولویت اول: directChatId (اگر ارائه شده بود مستقیماً استفاده می‌شود)

  // ۲. اولویت دوم: در صورت عدم وجود chatId، استعلام بر اساس eitaaUserId
  if (!chatId && params.eitaaUserId) {
    try {
      const uRes = await query(
        `SELECT chat_id FROM eitaa_identities WHERE eitaa_user_id = $1 AND chat_id IS NOT NULL AND chat_id <> '' LIMIT 1`,
        [String(params.eitaaUserId).trim()]
      );
      if (uRes.rows.length > 0 && uRes.rows[0].chat_id) {
        chatId = String(uRes.rows[0].chat_id).trim();
      }
    } catch {}
  }

  // ۳. اولویت سوم: استعلام بر اساس شماره موبایل
  if (!chatId && params.mobile) {
    const normMobile = normalizeMobileNumber(params.mobile);
    if (normMobile) {
      try {
        const mobRes = await query(
          `SELECT chat_id FROM eitaa_identities WHERE mobile = $1 OR mobile = $2 LIMIT 1`,
          [normMobile, normMobile.replace(/^0/, '')]
        );
        if (mobRes.rows.length > 0 && mobRes.rows[0].chat_id) {
          chatId = String(mobRes.rows[0].chat_id).trim();
        } else {
          chatId = (await getEitaaChatIdForMobile(normMobile)) || '';
        }
      } catch {
        chatId = (await getEitaaChatIdForMobile(normMobile)) || '';
      }
    }
  }

  // ۴. اولویت چهارم: استعلام بر اساس کد رسید یا شناسه سفارش
  const refCode = (params.receiptCode || params.orderId || '').trim().toUpperCase();
  if (!chatId && refCode) {
    try {
      const recRes = await query(
        `SELECT chat_id FROM eitaa_identities WHERE $1 = ANY(receipt_codes) LIMIT 1`,
        [refCode]
      );
      if (recRes.rows.length > 0 && recRes.rows[0].chat_id) {
        chatId = String(recRes.rows[0].chat_id).trim();
      } else {
        const ordRes = await query(
          `SELECT customer_eitaa_chat_id FROM binding_orders WHERE (receipt_code = $1 OR id = $2) AND customer_eitaa_chat_id IS NOT NULL LIMIT 1`,
          [refCode, refCode]
        );
        if (ordRes.rows.length > 0 && ordRes.rows[0].customer_eitaa_chat_id) {
          chatId = String(ordRes.rows[0].customer_eitaa_chat_id).trim();
        }
      }
    } catch (lookupErr: any) {
      console.warn(`[EitaaDirectMessenger] هشدار در استعلام شناسه چت برای کد مرجع ${refCode}:`, lookupErr?.message || lookupErr);
    }
  }

  if (!chatId) {
    return {
      success: false,
      status: 'no_chat_id',
      error: params.mobile 
        ? `مشتری با شماره ${params.mobile} هنوز وارد برنامک ایتا نشده و شناسه چت (chat_id) او ثبت نگردیده است.`
        : 'شناسه چت ایتا (chat_id)، شناسه کاربری، یا شماره موبایل معتبر یافت نشد.',
    };
  }

  try {
    const sendRes = await eitaaService.sendMessage({
      chatId,
      text: params.text,
      title: params.title,
    });

    if (sendRes.success) {
      return {
        success: true,
        status: 'sent',
        chatId,
        messageId: sendRes.message.providerMessageId || sendRes.message.id,
      };
    } else {
      return {
        success: false,
        status: sendRes.message.errorCode === 'NO_TOKEN' ? 'not_configured' : 'failed',
        chatId,
        error: sendRes.error || 'خطا در ارسال پیام به ایتا',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      chatId,
      error: err.message || 'خطا در برقراری ارتباط با وب‌سرویس ایتا',
    };
  }
}
