/**
 * درگاه انتشار پیام‌رسان ایتا (Eitaa Publication Provider)
 * پشتیبانی از گیت‌وی رسمی/ثالث ایتا با تأیید اعتبار و مدیریت خطا
 */

import {
  PublicationProviderAdapter,
  PublicationProduct,
  PublicationEvent,
  PublicationResult,
  PublicationChannelConfig,
} from '../publicationTypes';

export class EitaaProvider implements PublicationProviderAdapter {
  readonly provider = 'eitaa' as const;

  constructor(private readonly config: PublicationChannelConfig = {}) {}

  private getCredentials() {
    const token = this.config.token || process.env.EITAA_BOT_TOKEN;
    const channelId = this.config.channelId || process.env.EITAA_CHANNEL_ID;
    const baseUrl = (this.config.baseUrl || process.env.EITAA_API_BASE_URL || 'https://eitaayar.ir/api').replace(/\/+$/, '');
    return { token, channelId, baseUrl };
  }

  async sendProduct(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    text: string;
    imageUrl?: string;
  }): Promise<PublicationResult> {
    const { token, channelId, baseUrl } = this.getCredentials();

    if (!token || !channelId) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'NOT_CONFIGURED',
        error: 'NOT_CONFIGURED: توکن یا شناسه کانال ایتا در تنظیمات سامانه پیکربندی نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const isPhoto = Boolean(params.imageUrl && params.imageUrl.startsWith('http'));
      const endpoint = isPhoto
        ? `${baseUrl}/${token}/sendPhoto`
        : `${baseUrl}/${token}/sendMessage`;

      const bodyPayload = isPhoto
        ? {
            chat_id: channelId,
            caption: params.text,
            photo: params.imageUrl,
            image: params.imageUrl,
          }
        : {
            chat_id: channelId,
            text: params.text,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = data.description || data.message || `خطای HTTP ${response.status}`;
        return {
          provider: this.provider,
          success: false,
          errorCode: response.status === 401 || response.status === 403 ? 'AUTH_FAILED' : 'FAILED',
          error: `خطای ارسال به ایتا: ${errorDetail}`,
        };
      }

      // بررسی نتیجه در فرمت استاندارد پاسخ API
      const isSuccess = data.ok === true || data.status === 'success' || data.success === true;
      if (!isSuccess) {
        return {
          provider: this.provider,
          success: false,
          errorCode: 'API_ERROR',
          error: data.description || data.message || 'پاسخ ناموفق از سرور ایتا دریافت شد.',
        };
      }

      const msgId = String(data.result?.message_id || data.message_id || data.id || Date.now());
      const cleanChannel = channelId.replace(/^@/, '');
      const externalUrl = `https://eitaa.com/${cleanChannel}/${msgId}`;

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
        error: isAbort ? 'مهلت زمانی ارتباط با سرور ایتا به پایان رسید (Timeout 15s)' : (err.message || 'خطای شبکه در ارتباط با ایتا'),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const { token, channelId, baseUrl } = this.getCredentials();

    if (!token || !channelId) {
      return {
        success: false,
        message: 'توکن بات و شناسه کانال ایتا تنظیم نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      // بررسی اتصال از طریق متد getMe یا ارسال تستی
      const response = await fetch(`${baseUrl}/${token}/getMe`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.ok || data.status === 'success')) {
        const botName = data.result?.first_name || data.result?.username || 'بات ایتا';
        return {
          success: true,
          message: `ارتباط با گیت‌وی ایتا با موفقیت برقرار شد. بات شناسایی شده: «${botName}» برای کانال ${channelId}`,
        };
      }

      // در صورتی که گیت‌وی getMe ندارد، دسترسی به مسیر پایه را چک می‌کنیم
      return {
        success: response.status !== 401 && response.status !== 403,
        message: response.ok
          ? 'پاسخ سرور ایتا دریافت شد و آماده ارسال است.'
          : `خطای احراز هویت توکن ایتا (${response.status}): ${data.description || data.message || 'توکن نامعتبر است'}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'عدم پاسخگویی درگاه ایتا (Timeout)' : `خطا در تست اتصال: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
