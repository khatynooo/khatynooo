/**
 * درگاه انتشار پیام‌رسان تلگرام (Telegram Bot API Publication Provider)
 * پشتیبانی کامل از متدهای sendMessage و sendPhoto به همراه فرمت‌بندی HTML
 */

import {
  PublicationProviderAdapter,
  PublicationProduct,
  PublicationEvent,
  PublicationResult,
  PublicationChannelConfig,
} from '../publicationTypes';

export class TelegramProvider implements PublicationProviderAdapter {
  readonly provider = 'telegram' as const;

  constructor(private readonly config: PublicationChannelConfig = {}) {}

  private getCredentials() {
    const token = this.config.token || process.env.TELEGRAM_BOT_TOKEN;
    const channelId = this.config.channelId || process.env.TELEGRAM_CHANNEL_ID;
    const baseUrl = (this.config.baseUrl || process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org/bot').replace(/\/+$/, '');
    return { token: token?.trim(), channelId: channelId?.trim(), baseUrl };
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
        error: 'NOT_CONFIGURED: توکن یا شناسه کانال تلگرام در تنظیمات سامانه پیکربندی نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const isPhoto = Boolean(params.imageUrl && params.imageUrl.startsWith('http'));
      const endpoint = isPhoto
        ? `${baseUrl}${token}/sendPhoto`
        : `${baseUrl}${token}/sendMessage`;

      const bodyPayload = isPhoto
        ? {
            chat_id: channelId,
            photo: params.imageUrl,
            caption: params.text,
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

      if (!response.ok || !data.ok) {
        const errorMsg = data.description || data.message || `خطای سرور تلگرام (${response.status})`;
        return {
          provider: this.provider,
          success: false,
          errorCode: response.status === 401 || response.status === 403 ? 'AUTH_FAILED' : 'FAILED',
          error: `خطای ارسال به تلگرام: ${errorMsg}`,
        };
      }

      const msgId = String(data.result?.message_id || Date.now());
      const cleanChannel = channelId.replace(/^@/, '');
      const externalUrl = `https://t.me/${cleanChannel}/${msgId}`;

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
        error: isAbort ? 'مهلت زمانی ارتباط با تلگرام به پایان رسید (Timeout 15s)' : (err.message || 'خطای شبکه در ارتباط با تلگرام'),
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
        message: 'توکن بات و شناسه کانال تلگرام تنظیم نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${baseUrl}${token}/getMe`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        const botUsername = data.result?.username ? `@${data.result.username}` : 'بات تلگرام';
        return {
          success: true,
          message: `ارتباط با تلگرام برقرار شد. نام کاربری بات: ${botUsername} برای ارسال به ${channelId}`,
        };
      }

      return {
        success: false,
        message: `خطای احراز هویت تلگرام: ${data.description || 'توکن نامعتبر است'}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'عدم پاسخگویی سرور تلگرام (Timeout)' : `خطا در تست تلگرام: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
