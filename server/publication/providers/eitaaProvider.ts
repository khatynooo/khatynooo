/**
 * درگاه انتشار پیام‌رسان ایتا (Eitaa Publication Provider)
 * پشتیبانی از گیت‌وی رسمی/ثالث ایتا (eitaayar.ir) با پاکسازی خودکار شناسه، اعتبارسنجی و ارسال هوشمند
 */

import fs from 'fs';
import path from 'path';
import {
  PublicationProviderAdapter,
  PublicationProduct,
  PublicationEvent,
  PublicationResult,
  PublicationChannelConfig,
} from '../publicationTypes';

/**
 * پاکسازی و نرمال‌سازی توکن بات ایتا:
 * حذف فاصله‌ها، کوتیشن‌ها، استخراج از URL کامل در صورت کپی لینک، و افزودن پیشوند bot در صورت نیاز
 */
export function normalizeEitaaToken(rawToken?: string): string {
  if (!rawToken) return '';
  let token = rawToken.trim();
  // حذف کوتیشن‌های احتمالی اطراف توکن
  token = token.replace(/^["'`]+|["'`]+$/g, '').trim();

  // اگر کاربر کل آدرس را کپی کرده باشد (مثال: https://eitaayar.ir/api/bot12345:xxx/sendMessage)
  const apiMatch = token.match(/eitaayar\.ir\/api\/(bot[^\/\s?#]+|[^\/\s?#]+)/i);
  if (apiMatch && apiMatch[1]) {
    token = apiMatch[1];
  }

  // حذف متدهای اضافی در انتهای توکن
  token = token.replace(/\/(sendMessage|sendFile|getMe).*$/i, '');
  token = token.replace(/\/+$/, '').trim();

  // اگر کاربر توکن را بدون عبارت bot وارد کرده باشد (مثلاً 12345:abcdef)
  if (/^\d+:[a-zA-Z0-9_\-]+$/.test(token)) {
    token = `bot${token}`;
  }

  return token;
}

/**
 * پاکسازی و نرمال‌سازی شناسه کانال یا چت ایتا (chat_id):
 * پشتیبانی از نام کاربری کانال، آیدی با @، لینک مستقیم، لینک دعوت گروه و شناسه عددی
 */
export function normalizeEitaaChannelId(input?: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '').trim();

  // اگر لینک عضویت گروه یا کانال خصوصی باشد (مثال: https://eitaa.com/joinchat/xxx یا joinchat/xxx)
  const joinMatch = cleaned.match(/(joinchat\/[a-zA-Z0-9_\-]+)/i);
  if (joinMatch && joinMatch[1]) {
    return joinMatch[1];
  }

  // حذف لینک‌های ایتا یا ایتا‌یار
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?(?:eitaa\.com|eitaayar\.ir)\//i, '');
  cleaned = cleaned.replace(/^(?:www\.)?(?:eitaa\.com|eitaayar\.ir)\//i, '');

  // حذف @ یا / ابتدایی برای کانال‌های عمومی
  cleaned = cleaned.replace(/^[@/]+/, '');

  // حذف پارامترهای کوئری یا اسلش‌های انتهایی
  cleaned = cleaned.replace(/[?#].*$/, '').replace(/\/+$/, '');

  return cleaned.trim();
}

export class EitaaProvider implements PublicationProviderAdapter {
  readonly provider = 'eitaa' as const;

  constructor(private readonly config: PublicationChannelConfig = {}) {}

  private getCredentials() {
    const rawToken = this.config.token || process.env.EITAA_BOT_TOKEN || '';
    const token = normalizeEitaaToken(rawToken);
    const rawChannelId = this.config.chat_id || this.config.channelId || process.env.EITAA_CHANNEL_ID || '';
    const channelId = normalizeEitaaChannelId(rawChannelId);
    const baseUrl = (this.config.baseUrl || process.env.EITAA_API_BASE_URL || 'https://eitaayar.ir/api').replace(/\/+$/, '');
    return { token, channelId, baseUrl, rawChannelId, rawToken };
  }

  /**
   * تبدیل مسیر یا آدرس تصویر به Blob استاندارد جهت ارسال multipart
   */
  private async resolveImageBlob(imageUrl: string): Promise<{ blob: Blob; filename: string } | null> {
    try {
      if (imageUrl.startsWith('data:image/')) {
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          const ext = mime.split('/')[1] || 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          return { blob: new Blob([buffer], { type: mime }), filename: `product.${ext}` };
        }
      }

      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const blob = await res.blob();
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : 'jpg';
          return { blob, filename: `product.${ext}` };
        }
      }

      // بررسی فایل محلی در پوشه uploads یا مسیر پروژه
      const cleanPath = imageUrl.replace(/^\/+/, '');
      const possibleLocalPaths = [
        path.join(process.cwd(), cleanPath),
        path.join(process.cwd(), 'uploads', cleanPath.replace(/^uploads\//, '')),
      ];

      for (const p of possibleLocalPaths) {
        if (fs.existsSync(p)) {
          const buffer = fs.readFileSync(p);
          const ext = path.extname(p).replace('.', '') || 'jpg';
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          return { blob: new Blob([buffer], { type: mime }), filename: path.basename(p) };
        }
      }
    } catch (err) {
      console.warn('⚠️ [Eitaa resolveImageBlob warning]:', err);
    }
    return null;
  }

  async sendProduct(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    text: string;
    imageUrl?: string;
  }): Promise<PublicationResult> {
    const { token, channelId, baseUrl } = this.getCredentials();

    if (!token) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'NOT_CONFIGURED',
        error: 'کلید امنیتی (توکن) بات ایتا در تنظیمات سامانه وارد نشده است.',
      };
    }

    if (!channelId) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'NOT_CONFIGURED',
        error: 'شناسه کانال ایتا (chat_id) تنظیم نشده است. لطفاً در تنظیمات کانال، شناسه کانال را وارد نمایید.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      let response: Response | null = null;
      let usedMethod = 'sendMessage';

      // ۱. در صورت وجود تصویر، ارسال فایل چندبخشی (multipart/form-data) به متد sendFile طبق مستندات eitaayar.ir
      if (params.imageUrl) {
        const imageInfo = await this.resolveImageBlob(params.imageUrl);
        if (imageInfo) {
          try {
            usedMethod = 'sendFile';
            const formData = new FormData();
            formData.append('chat_id', channelId);
            formData.append('file', imageInfo.blob, imageInfo.filename);
            if (params.text) {
              formData.append('caption', params.text);
            }
            if (params.product?.name) {
              formData.append('title', params.product.name);
            }

            response = await fetch(`${baseUrl}/${token}/sendFile`, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });
          } catch (fileErr) {
            console.warn('⚠️ [Eitaa sendFile fallback to sendMessage]:', fileErr);
            response = null;
          }
        }
      }

      // ۲. در صورت نبود تصویر یا عدم موفقیت sendFile، ارسال متن از طریق x-www-form-urlencoded به sendMessage
      if (!response || !response.ok) {
        usedMethod = 'sendMessage';
        const messageText = params.imageUrl && (!response || !response.ok)
          ? `${params.text}\n\n🖼 تصویر کالا: ${params.imageUrl}`
          : params.text;

        const formParams = new URLSearchParams();
        formParams.append('chat_id', channelId);
        formParams.append('text', messageText);
        if (params.product?.name) {
          formParams.append('title', params.product.name);
        }

        response = await fetch(`${baseUrl}/${token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formParams.toString(),
          signal: controller.signal,
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = data.description || data.message || `خطای سرور ایتا (${response.status})`;
        let friendlyError = errorDetail;
        if (response.status === 401 || response.status === 403 || /unauthorized/i.test(errorDetail)) {
          friendlyError = 'کلید امنیتی (توکن) وارد شده نامعتبر یا منقضی است (Unauthorized). لطفاً توکن رسمی را از eitaayar.ir (با فرمت bot12345:xxxx) در بخش تنظیمات وارد و ذخیره کنید.';
        } else if (response.status === 400 || response.status === 404 || /chat/i.test(errorDetail)) {
          friendlyError = `شناسه کانال یا چت «${channelId}» یافت نشد یا بات هنوز به عنوان ادمین در کانال عضو نشده است (${errorDetail}).`;
        }
        return {
          provider: this.provider,
          success: false,
          errorCode: (response.status === 401 || response.status === 403 || /unauthorized/i.test(errorDetail)) ? 'AUTH_FAILED' : 'FAILED',
          error: `خطای ارسال به ایتا: ${friendlyError}`,
        };
      }

      // بررسی پاسخ موفق بر اساس قرارداد eitaayar
      const isSuccess = data.ok === true || data.status === 'success' || data.success === true;
      if (!isSuccess) {
        const desc = String(data.description || data.message || 'پاسخ ناموفق از درگاه ایتا دریافت شد.');
        let friendlyDesc = desc;
        if (/unauthorized/i.test(desc)) {
          friendlyDesc = 'کلید امنیتی (توکن) توسط درگاه ایتا تأیید نشد (Unauthorized). لطفاً مطمئن شوید توکن دریافتی از پنل eitaayar.ir (فرمت bot12345:xxxx) در تنظیمات ذخیره شده است.';
        } else if (desc.includes('chat not found') || desc.includes('chat_id') || /chat/i.test(desc)) {
          friendlyDesc = `شناسه کانال یا چت «${channelId}» در ایتا پیدا نشد یا بات هنوز در آن ادمین نشده است.`;
        }
        return {
          provider: this.provider,
          success: false,
          errorCode: /unauthorized/i.test(desc) ? 'AUTH_FAILED' : 'API_ERROR',
          error: `خطای ایتا: ${friendlyDesc}`,
        };
      }

      const msgId = String(data.result?.message_id || data.message_id || data.id || Date.now());
      const externalUrl = `https://eitaa.com/${channelId}/${msgId}`;

      return {
        provider: this.provider,
        success: true,
        messageId: msgId,
        externalUrl,
      };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        provider: this.provider,
        success: false,
        errorCode: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
        error: isAbort ? 'مهلت زمانی ارتباط با درگاه ایتا به پایان رسید (Timeout 20s).' : (err.message || 'خطای شبکه در ارتباط با ایتا'),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const { token, channelId, baseUrl } = this.getCredentials();

    if (!token) {
      return {
        success: false,
        message: 'کلید امنیتی (توکن) بات ایتا تنظیم نشده است. لطفاً توکن eitaayar.ir را وارد و ذخیره فرمایید.',
      };
    }

    if (!channelId) {
      return {
        success: false,
        message: 'شناسه کانال یا چت ایتا (chat_id) وارد نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      // بررسی اتصال از طریق متد getMe در eitaayar
      let response = await fetch(`${baseUrl}/${token}/getMe`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }).catch(() => null);

      if (!response || !response.ok) {
        // روش دوم ارسال توکن در کوئری برای گیت‌وی‌های سازگار با query string
        const fallbackRes = await fetch(`${baseUrl}/app/getMe?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }).catch(() => null);

        if (fallbackRes) {
          response = fallbackRes;
        }
      }

      if (response) {
        const data = await response.json().catch(() => ({}));
        const desc = String(data.description || data.message || '');
        const isUnauthorized = response.status === 401 || response.status === 403 || /unauthorized/i.test(desc);

        if (isUnauthorized) {
          return {
            success: false,
            message: '❌ احراز هویت ناموفق در ایتا: کلید امنیتی (توکن) نامعتبر یا منقضی است (Unauthorized). توکن باید از پنل eitaayar.ir دریافت شده و معمولاً با عبارت bot شروع شود (مثال: bot12345:xxxx). لطفاً توکن جدید را وارد و دکمه ذخیره را بزنید.',
          };
        }

        if (response.ok && (data.ok === true || data.status === 'success' || data.result)) {
          const botName = data.result?.first_name || data.result?.username || 'بات رسمی ایتا';
          return {
            success: true,
            message: `✅ ارتباط با درگاه ایتا با موفقیت برقرار شد. بات شناسایی شده: «${botName}» برای کانال/چت ${channelId}`,
          };
        }

        if (!response.ok || data.ok === false) {
          let friendly = desc || `پاسخ ناموفق با کد وضعیت ${response.status}`;
          if (/chat/i.test(desc)) {
            friendly = `شناسه کانال «${channelId}» پیدا نشد یا بات در آن ادمین نیست.`;
          }
          return {
            success: false,
            message: `❌ خطا در آزمون اتصال ایتا: ${friendly}`,
          };
        }

        return {
          success: true,
          message: `✅ ارتباط با درگاه ایتا برقرار شد (کانال: ${channelId}).`,
        };
      }

      return {
        success: false,
        message: 'عدم دریافت پاسخ از درگاه ایتا. از اتصال اینترنت سرور و باز بودن درگاه eitaayar اطمینان حاصل فرمایید.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'عدم پاسخگویی درگاه ایتا (مهلت اتصال ۱۲ ثانیه به پایان رسید)' : `خطا در تست اتصال: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
