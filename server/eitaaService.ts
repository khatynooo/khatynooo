import { query, withTransaction } from './dbClient';
import { normalizeIranianMobile } from './publication/eitaaDirectMessenger';
import { EitaaIdentity, EitaaMessage, EitaaConversation, EitaaConnectivityBadge } from '../src/types';

/**
 * تکه‌کردن متون طولانی‌تر از سقف مجاز پیام‌رسان ایتا (حدود ۳۵۰۰ کاراکتر)
 */
export function splitMessageText(text: string, maxLength = 3500): string[] {
  if (!text || text.length <= maxLength) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitIdx = remaining.lastIndexOf('\n\n', maxLength);
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = remaining.lastIndexOf('\n', maxLength);
    }
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = maxLength;
    }
    parts.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  if (remaining.length > 0) {
    parts.push(remaining);
  }
  return parts;
}

interface QueuedEitaaTask {
  id: string;
  chatId: string;
  text: string;
  title?: string;
  identityId?: string;
  customerId?: string;
  eitaaUserId?: string;
  maxAttempts?: number;
  resolve: (res: { success: boolean; message: EitaaMessage; error?: string }) => void;
  reject: (err: any) => void;
}

/**
 * سرویس یکپارچه هویت، مخاطبین CRM و ارسال پیام‌های ایتا
 * با اولویت قطعی chat_id به عنوان شناسه اصلی
 */
export class EitaaService {
  private messageQueue: QueuedEitaaTask[] = [];
  private isProcessingQueue = false;
  private queueIntervalMs = 1000; // پیش‌فرض ۱ ثانیه فاصله بین ارسال‌ها
  private backoffMultiplier = 1; // ضریب بازگشت نمایی در صورت بروز خطای نرخ/۴۲۹

  /**
   * دریافت توکن بات ایتا از جدول binding_settings
   */
  async getBotToken(): Promise<{ token: string; botUsername?: string; appUrl?: string }> {
    try {
      const res = await query(`SELECT eitaa_bot_token, eitaa_bot_username, eitaa_bot_app_url FROM binding_settings WHERE id = 'default' LIMIT 1`);
      if (res.rows.length > 0) {
        return {
          token: res.rows[0].eitaa_bot_token || process.env.EITAA_BOT_TOKEN || '',
          botUsername: res.rows[0].eitaa_bot_username || '',
          appUrl: res.rows[0].eitaa_bot_app_url || '',
        };
      }
    } catch (e) {}
    return { token: process.env.EITAA_BOT_TOKEN || '' };
  }

  /**
   * ذخیره یا همگام‌سازی توکن بات ایتا
   */
  async updateBotSettings(settings: { token?: string; botUsername?: string; appUrl?: string }): Promise<void> {
    await query(
      `UPDATE binding_settings SET 
        eitaa_bot_token = COALESCE($1, eitaa_bot_token),
        eitaa_bot_username = COALESCE($2, eitaa_bot_username),
        eitaa_bot_app_url = COALESCE($3, eitaa_bot_app_url),
        updated_at = NOW()
       WHERE id = 'default'`,
      [settings.token ?? null, settings.botUsername ?? null, settings.appUrl ?? null]
    );
  }

  /**
   * ثبت یا بروزرسانی هویت کاربر در ایتا (Atomic Upsert بر اساس Chat ID)
   * جلوگیری قطعی از تکرار مشتریان و اتصال هوشمند به مشتری موجود
   */
  async upsertIdentity(data: {
    chatId: string;
    eitaaUserId?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    mobile?: string;
    languageCode?: string;
    source?: string;
    receiptCode?: string;
    metadata?: Record<string, any>;
    isVerified?: boolean;
    createCustomer?: boolean;
  }): Promise<EitaaIdentity> {
    const rawChatId = String(data.chatId || '').trim();
    if (!rawChatId) {
      throw new Error('شناسه گفتگوی ایتا (chat_id) الزامی است.');
    }

    // نرمال‌سازی استاندارد شماره همراه ایران
    let cleanMobile: string | null = data.mobile ? (normalizeIranianMobile(data.mobile) || null) : null;

    return await withTransaction(async (client) => {
      // ۱. جستجوی مشتری موجود بر اساس شماره موبایل جهت پیوند بدون ساخت مشتری تکراری
      let linkedCustomerId: string | null = null;
      if (cleanMobile) {
        const custRes = await client.query(
          `SELECT id FROM customers WHERE mobile = $1 OR mobile = $2 LIMIT 1`,
          [cleanMobile, cleanMobile.replace(/^0/, '')]
        );
        if (custRes.rows.length > 0) {
          linkedCustomerId = custRes.rows[0].id;
        }
      }

      // اگر بر اساس موبایل پیدا نشد، بررسی پیوند قبلی با eitaa_user_id
      if (!linkedCustomerId && data.eitaaUserId) {
        const uidRes = await client.query(
          `SELECT customer_id FROM eitaa_identities WHERE eitaa_user_id = $1 AND customer_id IS NOT NULL LIMIT 1`,
          [data.eitaaUserId]
        );
        if (uidRes.rows.length > 0 && uidRes.rows[0].customer_id) {
          linkedCustomerId = uidRes.rows[0].customer_id;
        }
      }

      // ۲. درج یا بروزرسانی در eitaa_identities بر اساس chat_id
      const identityId = `eitaa_id_${rawChatId}`;
      const source = data.source || 'mini_app';
      const receiptCode = data.receiptCode ? data.receiptCode.trim().toUpperCase() : null;

      const existingRes = await client.query(`SELECT * FROM eitaa_identities WHERE chat_id = $1 LIMIT 1`, [rawChatId]);
      let savedRow: any;

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        // حفظ مشتری متصل فعلی در صورت عدم وجود لینک جدید (عدم ایجاد مشتری تکراری)
        linkedCustomerId = linkedCustomerId || existing.customer_id;

        let currentReceipts: string[] = Array.isArray(existing.receipt_codes) ? existing.receipt_codes : [];
        if (receiptCode && !currentReceipts.includes(receiptCode)) {
          currentReceipts = [...currentReceipts, receiptCode];
        }

        const updateRes = await client.query(
          `UPDATE eitaa_identities SET
            eitaa_user_id = COALESCE($2, eitaa_user_id),
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            username = COALESCE($5, username),
            mobile = COALESCE($6, mobile),
            customer_id = COALESCE($7, customer_id),
            last_seen_at = NOW(),
            receipt_codes = $8,
            is_verified = CASE WHEN $9::BOOLEAN IS NULL THEN is_verified ELSE $9::BOOLEAN END,
            updated_at = NOW()
           WHERE chat_id = $1
           RETURNING *`,
          [
            rawChatId,
            data.eitaaUserId || null,
            data.firstName || null,
            data.lastName || null,
            data.username || null,
            cleanMobile,
            linkedCustomerId,
            currentReceipts,
            data.isVerified !== undefined ? Boolean(data.isVerified) : null,
          ]
        );
        savedRow = updateRes.rows[0];
      } else {
        // کاربر جدید ایتا: فقط در صورتی که ساخت مشتری صراحتاً درخواست شده باشد و شماره همراه معتبر واقعی ایران داشته باشد
        if (!linkedCustomerId && cleanMobile && data.createCustomer === true) {
          const newCustId = `cst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.username || `مشتری ایتا ${cleanMobile}`;
          await client.query(
            `INSERT INTO customers (id, name, mobile, address, balance, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = COALESCE(customers.name, EXCLUDED.name),
               updated_at = NOW()`,
            [newCustId, fullName, cleanMobile, `ثبت شده از پیام‌رسان ایتا`]
          );
          linkedCustomerId = newCustId;
        }

        const initialReceipts: string[] = receiptCode ? [receiptCode] : [];
        const insertRes = await client.query(
          `INSERT INTO eitaa_identities (
            id, chat_id, eitaa_user_id, first_name, last_name, username, mobile,
            language_code, source, customer_id, status, is_blocked, is_verified,
            first_seen_at, last_seen_at, receipt_codes, metadata, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, 'active', FALSE, $11,
            NOW(), NOW(), $12, $13, NOW()
          ) RETURNING *`,
          [
            identityId,
            rawChatId,
            data.eitaaUserId || null,
            data.firstName || null,
            data.lastName || null,
            data.username || null,
            cleanMobile,
            data.languageCode || 'fa',
            source,
            linkedCustomerId,
            Boolean(data.isVerified),
            initialReceipts,
            JSON.stringify(data.metadata || {}),
          ]
        );
        savedRow = insertRes.rows[0];
      }

      // ۳. پیوند هوشمند با سفارشات فنرزنی
      // فقط در صورتی که هویت کاربر صراحتاً از داده مینی‌اپ تایید شده باشد (data.isVerified === true)
      // و هرگز chat_id سفارشی که از قبل به شخص دیگری تعلق دارد بازنویسی نشود
      if (data.isVerified === true) {
        // الف) در صورت وجود کد فیش، اتصال سفارش به شناسه چت (فقط اگر خالی باشد یا متعلق به همین چت باشد)
        if (receiptCode) {
          await client.query(
            `UPDATE binding_orders 
             SET customer_eitaa_chat_id = $1, updated_at = NOW() 
             WHERE receipt_code = $2
               AND (customer_eitaa_chat_id IS NULL OR customer_eitaa_chat_id = '' OR customer_eitaa_chat_id = $1)`,
            [rawChatId, receiptCode]
          );

          // در صورتی که موبایل ثبت نشده بود، دریافت موبایل از سفارش و انتساب به هویت ایتا
          if (!cleanMobile) {
            try {
              const boRes = await client.query(
                `SELECT customer_mobile FROM binding_orders WHERE receipt_code = $1 LIMIT 1`,
                [receiptCode]
              );
              if (boRes.rows.length > 0 && boRes.rows[0].customer_mobile) {
                const detectedMob = boRes.rows[0].customer_mobile.trim();
                if (detectedMob) {
                  cleanMobile = detectedMob;
                  await client.query(
                    `UPDATE eitaa_identities SET mobile = $1, updated_at = NOW() WHERE chat_id = $2 AND (mobile IS NULL OR mobile = '')`,
                    [cleanMobile, rawChatId]
                  );
                }
              }
            } catch {}
          }
        }

        // ب) در صورت وجود شماره موبایل، اتصال سفارشات قبلی و فعلی مشتری به شناسه چت ایتا (فقط رکوردهایی که chat_id ندارند)
        if (cleanMobile) {
          const noZeroMob = cleanMobile.replace(/^0/, '');
          await client.query(
            `UPDATE binding_orders 
             SET customer_eitaa_chat_id = $1, updated_at = NOW() 
             WHERE (customer_mobile = $2 OR customer_mobile = $3 OR customer_mobile = $4 OR customer_mobile = $5)
               AND (customer_eitaa_chat_id IS NULL OR customer_eitaa_chat_id = '')`,
            [rawChatId, cleanMobile, noZeroMob, '0' + noZeroMob, '+98' + noZeroMob]
          );
        }
      }

      // ۴. سازگاری رو به عقب با جدول قدیمی eitaa_customer_chats با کلید یکتای chat_id
      // فقط در صورتی که شماره موبایل واقعی وجود داشته باشد ذخیره شود و هرگز مقدار ساختگی eitaa_<chatId> در فیلد موبایل نوشته نشود
      try {
        await client.query(
          `INSERT INTO eitaa_customer_chats (mobile, chat_id, eitaa_user_id, first_name, username, receipt_codes, last_seen, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (chat_id) DO UPDATE SET
             mobile = COALESCE(NULLIF(EXCLUDED.mobile, ''), eitaa_customer_chats.mobile),
             eitaa_user_id = COALESCE(EXCLUDED.eitaa_user_id, eitaa_customer_chats.eitaa_user_id),
             first_name = COALESCE(EXCLUDED.first_name, eitaa_customer_chats.first_name),
             username = COALESCE(EXCLUDED.username, eitaa_customer_chats.username),
             receipt_codes = ARRAY(SELECT DISTINCT unnest(COALESCE(eitaa_customer_chats.receipt_codes, '{}') || EXCLUDED.receipt_codes)),
             last_seen = NOW(),
             updated_at = NOW()`,
          [
            cleanMobile || null,
            rawChatId,
            data.eitaaUserId || null,
            data.firstName || null,
            data.username || null,
            receiptCode ? [receiptCode] : [],
          ]
        );
      } catch (e) {
        // Safe ignore
      }

      return this.mapIdentityFromRow(savedRow);
    });
  }

  /**
   * افزودن پیام به صف ارسال پیام‌های ایتا (همزمانی ۱، رعایت فاصله ۱ ثانیه، و مدیریت Backoff)
   */
  async enqueueMessage(params: {
    chatId: string;
    text: string;
    title?: string;
    identityId?: string;
    customerId?: string;
    eitaaUserId?: string;
    maxAttempts?: number;
  }): Promise<{ success: boolean; messageId?: string; queued: boolean }> {
    const rawChatId = String(params.chatId || '').trim();
    if (!rawChatId) {
      throw new Error('شناسه گفتگوی ایتا (chat_id) نامعتبر است.');
    }
    const text = (params.text || '').trim();
    if (!text) {
      throw new Error('متن پیام نمی‌تواند خالی باشد.');
    }

    const chunks = splitMessageText(text, 3500);

    for (const chunk of chunks) {
      this.messageQueue.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chatId: rawChatId,
        text: chunk,
        title: params.title,
        identityId: params.identityId,
        customerId: params.customerId,
        eitaaUserId: params.eitaaUserId,
        maxAttempts: params.maxAttempts || 3,
        resolve: () => {},
        reject: () => {},
      });
    }

    this.processQueue();
    return { success: true, queued: true };
  }

  /**
   * ارسال مستقیم یا صف‌بندی‌شده پیام به مخاطب ایتا با شکستن متون طولانی
   */
  async sendMessage(params: {
    chatId: string;
    text: string;
    title?: string;
    identityId?: string;
    customerId?: string;
    eitaaUserId?: string;
    maxAttempts?: number;
  }): Promise<{ success: boolean; message: EitaaMessage; error?: string }> {
    const rawChatId = String(params.chatId || '').trim();
    if (!rawChatId) {
      throw new Error('شناسه گفتگوی ایتا (chat_id) نامعتبر است.');
    }
    const text = (params.text || '').trim();
    if (!text) {
      throw new Error('متن پیام نمی‌تواند خالی باشد.');
    }

    const chunks = splitMessageText(text, 3500);

    // اگر پیام بیش از ۱ تکه بود، تکه‌ها را به نوبت ارسال کن
    let lastResult: { success: boolean; message: EitaaMessage; error?: string } | null = null;
    for (let i = 0; i < chunks.length; i++) {
      const chunkTitle = chunks.length > 1 && i > 0 ? undefined : params.title;
      lastResult = await new Promise((resolve, reject) => {
        this.messageQueue.push({
          id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          chatId: rawChatId,
          text: chunks[i],
          title: chunkTitle,
          identityId: params.identityId,
          customerId: params.customerId,
          eitaaUserId: params.eitaaUserId,
          maxAttempts: params.maxAttempts || 3,
          resolve,
          reject,
        });
        this.processQueue();
      });
      if (!lastResult.success) break;
    }

    return lastResult!;
  }

  /**
   * پردازنده صف پیام‌ها (Concurrency: 1، فاصله حداقل ۱ ثانیه، و Backoff در خطای ۴۲۹)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const task = this.messageQueue.shift();
        if (!task) break;

        try {
          const result = await this.sendSingleMessageDirect({
            chatId: task.chatId,
            text: task.text,
            title: task.title,
            identityId: task.identityId,
            customerId: task.customerId,
            eitaaUserId: task.eitaaUserId,
            maxAttempts: task.maxAttempts,
          });

          task.resolve(result);

          // بررسی خطای نرخ/محدودیت (Rate Limit / 429)
          if (
            result.message.httpStatus === 429 ||
            (result.error && (result.error.includes('429') || result.error.toLowerCase().includes('flood') || result.error.includes('too many requests')))
          ) {
            this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 32);
            console.warn(`[Eitaa Queue] اعمال Backoff به میزان ${this.backoffMultiplier}x به دلیل محدودیت نرخ ارسال`);
          } else if (result.success) {
            this.backoffMultiplier = 1;
          }
        } catch (err: any) {
          task.reject(err);
        }

        // رعایت فاصله زمانی بین پیام‌ها (پیش‌فرض ۱ ثانیه * ضریب پس‌نشینی)
        const delayMs = this.queueIntervalMs * this.backoffMultiplier;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * ارسال مستقیم یک پیام تکی به وب‌سرویس ایتا و ثبت در دیتابیس
   */
  private async sendSingleMessageDirect(params: {
    chatId: string;
    text: string;
    title?: string;
    identityId?: string;
    customerId?: string;
    eitaaUserId?: string;
    maxAttempts?: number;
  }): Promise<{ success: boolean; message: EitaaMessage; error?: string }> {
    const rawChatId = String(params.chatId || '').trim();
    const text = (params.text || '').trim();

    const { token } = await this.getBotToken();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // ۱. ثبت اولیه پیام در وضعیت sending
    await query(
      `INSERT INTO eitaa_messages (
        id, identity_id, customer_id, eitaa_user_id, chat_id, direction,
        message_title, message_text, status, provider, attempts, max_attempts,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'outgoing', $6, $7, 'sending', 'eitaayar', 1, $8, NOW(), NOW())`,
      [
        messageId,
        params.identityId || null,
        params.customerId || null,
        params.eitaaUserId || null,
        rawChatId,
        params.title || null,
        text,
        params.maxAttempts || 3,
      ]
    );

    // بررسی وجود توکن
    if (!token) {
      const errMsg = 'توکن بات ایتا در تنظیمات سامانه تعریف نشده است.';
      await query(
        `UPDATE eitaa_messages SET
          status = 'failed',
          error_code = 'NO_TOKEN',
          error_message = $1,
          updated_at = NOW()
         WHERE id = $2`,
        [errMsg, messageId]
      );
      const msg = (await this.getMessageById(messageId))!;
      return { success: false, message: msg, error: errMsg };
    }

    // ۲. اجرای درخواست HTTP به ایتا با لاگ کامل
    let httpStatus = 0;
    let responseData: any = null;
    let isSuccess = false;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let providerMsgId: string | null = null;

    try {
      const endpoint = `https://eitaayar.ir/api/${token}/sendMessage`;
      const bodyPayload = {
        chat_id: rawChatId,
        text: text,
        title: params.title || undefined,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // ۱۲ ثانیه تایم‌اوت

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      httpStatus = response.status;
      responseData = await response.json().catch(() => null);

      if (response.ok && (responseData?.status === true || responseData?.ok === true)) {
        isSuccess = true;
        providerMsgId = String(responseData?.data?.message_id || responseData?.result?.message_id || '');
        // ریست کردن شمارنده خرابی‌ها در ارسال موفق
        try {
          await query(
            `UPDATE eitaa_identities 
             SET consecutive_failures = 0, 
                 eitaa_delivery_blocked = FALSE, 
                 invalidated_at = NULL, 
                 last_seen_at = NOW(), 
                 updated_at = NOW() 
             WHERE chat_id = $1`,
            [rawChatId]
          );
        } catch (_) {}
      } else {
        isSuccess = false;
        errorCode = responseData?.error_code ? String(responseData.error_code) : `HTTP_${httpStatus}`;
        errorMessage = responseData?.description || responseData?.message || `پاسخ ناموفق از سرور ایتا (کد ${httpStatus})`;

        // مدیریت تاب‌آور خطاها بدون حذف نگاشت‌ها (ثبت خطاهای متوالی و علامت‌گذاری هویت)
        try {
          const idRes = await query(
            `UPDATE eitaa_identities 
             SET consecutive_failures = consecutive_failures + 1, 
                 updated_at = NOW() 
             WHERE chat_id = $1 
             RETURNING consecutive_failures, is_blocked, eitaa_delivery_blocked`,
            [rawChatId]
          );
          const currentFailures = idRes.rows[0]?.consecutive_failures || 1;
          const isExplicitlyBlocked = errorMessage.toLowerCase().includes('blocked') || errorMessage.toLowerCase().includes('deactivated');
          if (isExplicitlyBlocked || currentFailures >= 3) {
            await query(
              `UPDATE eitaa_identities 
               SET eitaa_delivery_blocked = TRUE, 
                   invalidated_at = NOW(), 
                   updated_at = NOW() 
               WHERE chat_id = $1`,
              [rawChatId]
            );
          }
        } catch (_) {}
      }
    } catch (netErr: any) {
      httpStatus = 0;
      errorCode = netErr.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      errorMessage = netErr.name === 'AbortError' ? 'تایم‌اوت در برقراری ارتباط با سرور ایتا' : (netErr.message || 'خطای شبکه در اتصال به ایتا');
    }

    // ۳. بروزرسانی پیام در پایگاه داده
    const finalStatus = isSuccess ? 'sent' : 'failed';
    const sentAtValue = isSuccess ? new Date() : null;

    await query(
      `UPDATE eitaa_messages SET
        status = $1,
        provider_message_id = $2,
        error_code = $3,
        error_message = $4,
        http_status = $5,
        payload = $6,
        sent_at = COALESCE($7, sent_at),
        updated_at = NOW()
       WHERE id = $8`,
      [
        finalStatus,
        providerMsgId,
        errorCode,
        errorMessage,
        httpStatus || null,
        JSON.stringify(responseData || {}),
        sentAtValue,
        messageId,
      ]
    );

    const finalMsg = (await this.getMessageById(messageId))!;
    return {
      success: isSuccess,
      message: finalMsg,
      error: isSuccess ? undefined : `${errorMessage} (${errorCode || httpStatus})`,
    };
  }

  /**
   * تلاش مجدد برای ارسال پیام ناموفق (Smart Retry با مدیریت خطای غیرمخرب)
   */
  async retryMessage(messageId: string): Promise<{ success: boolean; message: EitaaMessage; error?: string }> {
    const existing = await this.getMessageById(messageId);
    if (!existing) {
      throw new Error('پیام مورد نظر یافت نشد.');
    }

    if (existing.status === 'sent') {
      return { success: true, message: existing };
    }

    if (existing.attempts >= existing.maxAttempts) {
      return {
        success: false,
        message: existing,
        error: `حداکثر سقف تلاش مجدد (${existing.maxAttempts} بار) برای این پیام انجام شده است.`,
      };
    }

    // افزایش شمارنده تلاش‌ها
    await query(
      `UPDATE eitaa_messages SET attempts = attempts + 1, status = 'retrying', updated_at = NOW() WHERE id = $1`,
      [messageId]
    );

    const { token } = await this.getBotToken();
    if (!token) {
      const errMsg = 'توکن بات ایتا تنظیم نشده است.';
      await query(
        `UPDATE eitaa_messages SET status = 'failed', error_code = 'NO_TOKEN', error_message = $1, updated_at = NOW() WHERE id = $2`,
        [errMsg, messageId]
      );
      return { success: false, message: (await this.getMessageById(messageId))!, error: errMsg };
    }

    try {
      const endpoint = `https://eitaayar.ir/api/${token}/sendMessage`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: existing.chatId,
          text: existing.messageText,
          title: existing.messageTitle || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => null);
      if (response.ok && (responseData?.status === true || responseData?.ok === true)) {
        await query(
          `UPDATE eitaa_messages SET
            status = 'sent',
            provider_message_id = $1,
            error_code = NULL,
            error_message = NULL,
            http_status = $2,
            sent_at = NOW(),
            updated_at = NOW()
           WHERE id = $3`,
          [String(responseData?.data?.message_id || responseData?.result?.message_id || ''), response.status, messageId]
        );

        try {
          await query(
            `UPDATE eitaa_identities 
             SET consecutive_failures = 0, 
                 eitaa_delivery_blocked = FALSE, 
                 invalidated_at = NULL, 
                 last_seen_at = NOW(), 
                 updated_at = NOW() 
             WHERE chat_id = $1`,
            [existing.chatId]
          );
        } catch (_) {}

        return { success: true, message: (await this.getMessageById(messageId))! };
      } else {
        const code = responseData?.error_code ? String(responseData.error_code) : `HTTP_${response.status}`;
        const desc = responseData?.description || responseData?.message || 'خطا در ارسال به ایتا';

        try {
          const idRes = await query(
            `UPDATE eitaa_identities 
             SET consecutive_failures = consecutive_failures + 1, 
                 updated_at = NOW() 
             WHERE chat_id = $1 
             RETURNING consecutive_failures`,
            [existing.chatId]
          );
          const currentFailures = idRes.rows[0]?.consecutive_failures || 1;
          const isExplicitlyBlocked = desc.toLowerCase().includes('blocked') || desc.toLowerCase().includes('deactivated');
          if (isExplicitlyBlocked || currentFailures >= 3) {
            await query(
              `UPDATE eitaa_identities 
               SET eitaa_delivery_blocked = TRUE, 
                   invalidated_at = NOW(), 
                   updated_at = NOW() 
               WHERE chat_id = $1`,
              [existing.chatId]
            );
          }
        } catch (_) {}

        await query(
          `UPDATE eitaa_messages SET
            status = 'failed',
            error_code = $1,
            error_message = $2,
            http_status = $3,
            payload = $4,
            updated_at = NOW()
           WHERE id = $5`,
          [code, desc, response.status, JSON.stringify(responseData || {}), messageId]
        );
        return { success: false, message: (await this.getMessageById(messageId))!, error: `${desc} (${code})` };
      }
    } catch (err: any) {
      await query(
        `UPDATE eitaa_messages SET
          status = 'failed',
          error_code = 'NETWORK_ERROR',
          error_message = $1,
          updated_at = NOW()
         WHERE id = $2`,
        [err.message || 'خطای شبکه', messageId]
      );
      return { success: false, message: (await this.getMessageById(messageId))!, error: err.message };
    }
  }

  /**
   * دریافت پیام بر اساس شناسه
   */
  async getMessageById(id: string): Promise<EitaaMessage | null> {
    const res = await query(`SELECT * FROM eitaa_messages WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapMessageFromRow(res.rows[0]);
  }

  /**
   * دریافت لیست پیام‌ها با فیلتر
   */
  async getMessages(filter: {
    chatId?: string;
    status?: string;
    direction?: string;
    limit?: number;
  } = {}): Promise<EitaaMessage[]> {
    let sql = `SELECT * FROM eitaa_messages WHERE 1=1`;
    const params: any[] = [];

    if (filter.chatId) {
      params.push(filter.chatId);
      sql += ` AND chat_id = $${params.length}`;
    }

    if (filter.status && filter.status !== 'all') {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filter.direction && filter.direction !== 'all') {
      params.push(filter.direction);
      sql += ` AND direction = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filter.limit && filter.limit > 0) {
      params.push(filter.limit);
      sql += ` LIMIT $${params.length}`;
    }

    const res = await query(sql, params);
    return res.rows.map(this.mapMessageFromRow);
  }

  /**
   * دریافت لیست مخاطبین ایتا (CRM Contacts Table) با جستجو و فیلتر جامع
   */
  async getContacts(filter: {
    query?: string;
    status?: string;
    hasChatId?: string;
    isCustomer?: string;
    source?: string;
    limit?: number;
  } = {}): Promise<EitaaIdentity[]> {
    let sql = `
      SELECT ei.*,
             c.name as customer_name,
             c.mobile as customer_mobile,
             c.total_purchase_amount,
             (SELECT COUNT(*) FROM binding_orders bo WHERE bo.customer_eitaa_chat_id = ei.chat_id OR (ei.mobile IS NOT NULL AND ei.mobile <> '' AND bo.customer_mobile = ei.mobile)) AS total_binding_orders,
             (SELECT bo.receipt_code FROM binding_orders bo WHERE bo.customer_eitaa_chat_id = ei.chat_id OR (ei.mobile IS NOT NULL AND ei.mobile <> '' AND bo.customer_mobile = ei.mobile) ORDER BY bo.created_at DESC LIMIT 1) AS latest_receipt
      FROM eitaa_identities ei
      LEFT JOIN customers c ON c.id = ei.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.query?.trim()) {
      const rawTerm = filter.query.trim();
      const likePattern = `%${rawTerm}%`;
      const pLike = params.length + 1;
      const pExact = params.length + 2;
      params.push(likePattern, rawTerm);
      sql += ` AND (
        ei.first_name ILIKE $${pLike} OR
        ei.last_name ILIKE $${pLike} OR
        ei.username ILIKE $${pLike} OR
        ei.chat_id ILIKE $${pLike} OR
        ei.eitaa_user_id ILIKE $${pLike} OR
        ei.mobile ILIKE $${pLike} OR
        c.name ILIKE $${pLike} OR
        $${pExact} = ANY(ei.receipt_codes)
      )`;
    }

    if (filter.status && filter.status !== 'all') {
      params.push(filter.status);
      sql += ` AND ei.status = $${params.length}`;
    }

    if (filter.hasChatId === 'yes') {
      sql += ` AND ei.chat_id IS NOT NULL AND ei.chat_id <> ''`;
    } else if (filter.hasChatId === 'no') {
      sql += ` AND (ei.chat_id IS NULL OR ei.chat_id = '')`;
    }

    if (filter.isCustomer === 'yes') {
      sql += ` AND ei.customer_id IS NOT NULL`;
    } else if (filter.isCustomer === 'no') {
      sql += ` AND ei.customer_id IS NULL`;
    }

    if (filter.source && filter.source !== 'all') {
      params.push(filter.source);
      sql += ` AND ei.source = $${params.length}`;
    }

    sql += ` ORDER BY ei.last_seen_at DESC`;

    if (filter.limit && filter.limit > 0) {
      params.push(filter.limit);
      sql += ` LIMIT $${params.length}`;
    }

    const res = await query(sql, params);
    return res.rows.map((r: any) => {
      const item = this.mapIdentityFromRow(r);
      item.customerName = r.customer_name || undefined;
      item.customerMobile = r.customer_mobile || undefined;
      item.totalOrdersCount = Number(r.total_binding_orders || 0);
      item.totalPurchaseAmount = Number(r.total_purchase_amount || 0);
      item.lastOrderReceipt = r.latest_receipt || (item.receiptCodes.length > 0 ? item.receiptCodes[item.receiptCodes.length - 1] : undefined);

      // محاسبه نشان اتصال
      item.connectivityBadge = this.calculateBadge(item);
      return item;
    });
  }

  /**
   * دریافت پروفایل یک مخاطب به همراه تاریخچه سفارشات و پیام‌ها
   */
  async getContactProfile(chatId: string): Promise<{
    identity: EitaaIdentity;
    customer?: any;
    bindingOrders: any[];
    salesInvoices: any[];
    recentMessages: EitaaMessage[];
  } | null> {
    const rawChatId = chatId.trim();
    const res = await query(
      `SELECT ei.*,
              c.name as customer_name,
              c.mobile as customer_mobile,
              c.total_purchase_amount,
              c.balance as customer_balance
       FROM eitaa_identities ei
       LEFT JOIN customers c ON c.id = ei.customer_id
       WHERE (ei.chat_id = $1 OR ei.id = $2) LIMIT 1`,
      [rawChatId, rawChatId]
    );
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    const identity = this.mapIdentityFromRow(r);
    identity.customerName = r.customer_name;
    identity.customerMobile = r.customer_mobile;
    identity.connectivityBadge = this.calculateBadge(identity);

    // دریافت سفارشات فنرزنی مربوط به این چت یا موبایل
    const bindingRes = await query(
      `SELECT * FROM binding_orders 
       WHERE customer_eitaa_chat_id = $1 
          OR (customer_mobile IS NOT NULL AND customer_mobile <> '' AND customer_mobile = $2)
       ORDER BY created_at DESC LIMIT 20`,
      [identity.chatId, identity.mobile || '__none__']
    );

    // دریافت پیام‌های مبادله شده با این چت
    const messagesRes = await query(
      `SELECT * FROM eitaa_messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [identity.chatId]
    );

    return {
      identity,
      customer: r.customer_id
        ? {
            id: r.customer_id,
            name: r.customer_name,
            mobile: r.customer_mobile,
            totalPurchaseAmount: Number(r.total_purchase_amount || 0),
            balance: Number(r.customer_balance || 0),
          }
        : undefined,
      bindingOrders: bindingRes.rows.map((b: any) => ({
        id: b.id,
        receiptCode: b.receipt_code,
        customerName: b.customer_name,
        customerMobile: b.customer_mobile,
        bookCount: Number(b.book_count || 1),
        totalPrice: Number(b.total_price || 0),
        paymentStatus: b.payment_status,
        workStatus: b.work_status,
        createdAt: b.created_at,
      })),
      salesInvoices: [],
      recentMessages: messagesRes.rows.map(this.mapMessageFromRow),
    };
  }

  /**
   * دریافت لیست گفتگوهای صندوق پیام ایتا (CRM Inbox Conversations)
   */
  async getInboxConversations(): Promise<EitaaConversation[]> {
    const sql = `
      SELECT 
        m.chat_id,
        m.identity_id,
        m.message_text as last_message_text,
        m.created_at as last_message_time,
        m.status as last_message_status,
        m.direction as last_message_direction,
        COALESCE(ei.first_name, ei.username, 'مخاطب ' || m.chat_id) as contact_name,
        ei.username,
        ei.mobile,
        ei.customer_id,
        COALESCE(ei.is_blocked, FALSE) as is_blocked,
        (SELECT COUNT(*) FROM eitaa_messages unread WHERE unread.chat_id = m.chat_id AND unread.direction = 'incoming' AND unread.is_read = FALSE) AS unread_count
      FROM eitaa_messages m
      LEFT JOIN eitaa_identities ei ON ei.chat_id = m.chat_id
      ORDER BY m.created_at DESC
      LIMIT 300;
    `;

    const res = await query(sql);
    const seen = new Set<string>();
    const deduplicated: EitaaConversation[] = [];

    for (const r of res.rows) {
      if (!seen.has(r.chat_id)) {
        seen.add(r.chat_id);
        deduplicated.push({
          chatId: r.chat_id,
          identityId: r.identity_id || undefined,
          contactName: r.contact_name || `کاربر ${r.chat_id}`,
          username: r.username || undefined,
          mobile: r.mobile || undefined,
          customerId: r.customer_id || undefined,
          isBlocked: Boolean(r.is_blocked),
          lastMessageText: r.last_message_text,
          lastMessageTime: r.last_message_time ? new Date(r.last_message_time).toISOString() : new Date().toISOString(),
          lastMessageStatus: r.last_message_status,
          lastMessageDirection: r.last_message_direction,
          unreadCount: Number(r.unread_count || 0),
        });
      }
    }

    return deduplicated;
  }

  /**
   * علامت‌گذاری پیام‌های یک گفتگو به عنوان خوانده شده
   */
  async markConversationAsRead(chatId: string): Promise<void> {
    await query(
      `UPDATE eitaa_messages SET is_read = TRUE, updated_at = NOW() WHERE chat_id = $1 AND direction = 'incoming' AND is_read = FALSE`,
      [chatId.trim()]
    );
  }

  /**
   * محاسبه نشان وضعیت اتصال مخاطب
   * 🟢 قابل ارسال: can_send
   * 🟡 شناسه ناقص: incomplete_chat_id
   * 🔴 ارسال ناموفق / مسدود: failed_blocked
   * ⚪ کاربر هنوز تعامل با بات نکرده: no_interaction
   */
  private calculateBadge(identity: EitaaIdentity): EitaaConnectivityBadge {
    if (!identity.chatId || identity.chatId.trim() === '') {
      return 'incomplete_chat_id';
    }
    if (identity.isBlocked || identity.status === 'blocked' || identity.eitaaDeliveryBlocked) {
      return 'failed_blocked';
    }
    if (identity.source === 'admin_manual' && !identity.eitaaUserId) {
      return 'no_interaction';
    }
    return 'can_send';
  }

  /**
   * تبدیل سطر پایگاه داده به شیء EitaaIdentity
   */
  private mapIdentityFromRow(r: any): EitaaIdentity {
    return {
      id: r.id,
      chatId: r.chat_id,
      eitaaUserId: r.eitaa_user_id || undefined,
      firstName: r.first_name || undefined,
      lastName: r.last_name || undefined,
      username: r.username || undefined,
      mobile: r.mobile || undefined,
      languageCode: r.language_code || 'fa',
      source: r.source || 'mini_app',
      customerId: r.customer_id || undefined,
      status: r.status || 'active',
      isBlocked: Boolean(r.is_blocked),
      isVerified: Boolean(r.is_verified),
      consecutiveFailures: Number(r.consecutive_failures || 0),
      invalidatedAt: r.invalidated_at ? new Date(r.invalidated_at).toISOString() : undefined,
      eitaaDeliveryBlocked: Boolean(r.eitaa_delivery_blocked),
      firstSeenAt: r.first_seen_at ? new Date(r.first_seen_at).toISOString() : new Date().toISOString(),
      lastSeenAt: r.last_seen_at ? new Date(r.last_seen_at).toISOString() : new Date().toISOString(),
      receiptCodes: Array.isArray(r.receipt_codes) ? r.receipt_codes : [],
      metadata: r.metadata || {},
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      connectivityBadge: 'can_send',
    };
  }

  /**
   * پردازش وب‌هوک دریافتی از ایتا (پیام ورودی یا تعامل کاربر با بات)
   */
  async handleIncomingUpdate(update: any): Promise<{ success: boolean; messageId?: string; chatId?: string; error?: string }> {
    const message = update?.message || update || {};
    const fromUser = message.from || {};
    const chat = message.chat || {};
    const rawChatId = String(chat.id || fromUser.id || update.chat_id || '').trim();
    if (!rawChatId) {
      return { success: false, error: 'شناسه چت در پیام ایتا یافت نشد.' };
    }

    // جلوگیری از ثبت پیام تکراری وب‌هوک بر اساس update_id
    const updateId = update.update_id ? String(update.update_id) : undefined;
    if (updateId) {
      const dupCheck = await query(`SELECT id FROM eitaa_messages WHERE provider_update_id = $1 LIMIT 1`, [updateId]);
      if (dupCheck.rows.length > 0) {
        return { success: true, messageId: dupCheck.rows[0].id, chatId: rawChatId };
      }
    }

    const text = String(message.text || '').trim();
    const contact = message.contact;

    let mobile = '';
    if (contact?.phone_number) {
      mobile = contact.phone_number;
    } else if (text) {
      const match = text.match(/(09\d{9}|\+?989\d{9})/);
      if (match) mobile = match[0];
    }

    // استخراج شماره قبض یا شناسه سفارش احتمالی
    let receiptCode: string | undefined;
    if (text) {
      const startMatch = text.match(/^\/start\s+([A-Za-z0-9\-_]{3,30})/i);
      if (startMatch && startMatch[1]) {
        receiptCode = startMatch[1].toUpperCase();
      } else {
        const rcMatch = text.match(/(KHAT-[A-Za-z0-9\-]+|ORD-[A-Za-z0-9\-]+|RC-[A-Za-z0-9\-]+|F-\d+)/i);
        if (rcMatch && rcMatch[0]) {
          receiptCode = rcMatch[0].toUpperCase();
        }
      }
    }

    // ۱. درج یا به‌روزرسانی هویت کاربر
    const identity = await this.upsertIdentity({
      chatId: rawChatId,
      eitaaUserId: String(fromUser.id || ''),
      firstName: fromUser.first_name,
      lastName: fromUser.last_name,
      username: fromUser.username,
      mobile: mobile || undefined,
      receiptCode,
      source: 'bot_interaction',
    });

    // ۲. ثبت پیام ورودی در صورت وجود متن
    let messageId: string | undefined;
    if (text) {
      messageId = `msg_in_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await query(
        `INSERT INTO eitaa_messages (
          id, identity_id, customer_id, eitaa_user_id, chat_id, direction,
          message_title, message_text, status, provider, attempts, max_attempts,
          provider_update_id, is_read, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'incoming', $6, $7, 'delivered', 'eitaayar', 1, 1, $8, FALSE, NOW(), NOW())`,
        [
          messageId,
          identity?.id || null,
          identity?.customerId || null,
          fromUser.id ? String(fromUser.id) : null,
          rawChatId,
          'پیام دریافتی کاربر',
          text,
          updateId || null,
        ]
      );
    }

    return { success: true, messageId, chatId: rawChatId };
  }

  /**
   * تبدیل سطر پایگاه داده به شیء EitaaMessage
   */
  private mapMessageFromRow(r: any): EitaaMessage {
    return {
      id: r.id,
      identityId: r.identity_id || undefined,
      customerId: r.customer_id || undefined,
      eitaaUserId: r.eitaa_user_id || undefined,
      chatId: r.chat_id,
      direction: r.direction || 'outgoing',
      messageTitle: r.message_title || undefined,
      messageText: r.message_text,
      status: r.status || 'queued',
      provider: r.provider || 'eitaayar',
      providerMessageId: r.provider_message_id || undefined,
      providerUpdateId: r.provider_update_id || undefined,
      isRead: Boolean(r.is_read),
      attempts: Number(r.attempts || 0),
      maxAttempts: Number(r.max_attempts || 3),
      errorCode: r.error_code || undefined,
      errorMessage: r.error_message || undefined,
      httpStatus: r.http_status ? Number(r.http_status) : undefined,
      payload: r.payload || {},
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : undefined,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }
}

export const eitaaService = new EitaaService();
