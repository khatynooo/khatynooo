/**
 * درگاه انتشار اینستاگرام (Instagram Graph API Professional Publishing Provider)
 * پیاده‌سازی رسمی انتشار خودکار پست از طریق Meta Graph API برای اکانت‌های تجاری/حرفه‌ای
 */

import {
  PublicationProviderAdapter,
  PublicationProduct,
  PublicationEvent,
  PublicationResult,
  PublicationChannelConfig,
} from '../publicationTypes';

export class InstagramProvider implements PublicationProviderAdapter {
  readonly provider = 'instagram' as const;

  constructor(private readonly config: PublicationChannelConfig = {}) {}

  private getCredentials() {
    const accessToken = this.config.accessToken || this.config.token || process.env.INSTAGRAM_ACCESS_TOKEN;
    const businessAccountId = this.config.businessAccountId || this.config.channelId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const baseUrl = (this.config.baseUrl || process.env.INSTAGRAM_API_BASE_URL || 'https://graph.facebook.com/v21.0').replace(/\/+$/, '');
    return { accessToken, businessAccountId, baseUrl };
  }

  async sendProduct(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    text: string;
    imageUrl?: string;
  }): Promise<PublicationResult> {
    const { accessToken, businessAccountId, baseUrl } = this.getCredentials();

    if (!accessToken || !businessAccountId) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'NOT_CONFIGURED',
        error: 'NOT_CONFIGURED: شناسه حساب تجاری اینستاگرام (Business Account ID) یا Access Token تنظیم نشده است.',
      };
    }

    // اینستاگرام الزاماً نیازمند تصویر معتبر و عمومی است
    if (!params.imageUrl || !params.imageUrl.startsWith('http')) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'MISSING_IMAGE',
        error: 'FAILED: طبق استانداردهای Meta Graph API، انتشار پست در اینستاگرام نیازمند تصویر معتبر عمومی (HTTP/HTTPS) است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      // مرحله ۱: ایجاد کانتینر رسانه (Media Container)
      const containerUrl = `${baseUrl}/${businessAccountId}/media`;
      const containerParams = new URLSearchParams({
        image_url: params.imageUrl,
        caption: params.text,
        access_token: accessToken,
      });

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerParams.toString(),
        signal: controller.signal,
      });

      const containerData = await containerRes.json().catch(() => ({}));

      if (!containerRes.ok || !containerData.id) {
        const metaError = containerData.error?.message || `خطای سرور Meta (${containerRes.status})`;
        return {
          provider: this.provider,
          success: false,
          errorCode: containerRes.status === 401 || containerRes.status === 403 ? 'AUTH_FAILED' : 'MEDIA_CREATION_FAILED',
          error: `خطا در ایجاد رسانه اینستاگرام: ${metaError}`,
        };
      }

      const creationId = containerData.id;

      // یک وقفه کوتاه ۲ ثانیه‌ای برای پردازش تصویر در سرورهای متا
      await new Promise((r) => setTimeout(r, 2000));

      // مرحله ۲: انتشار کانتینر در پیج (Publish Media)
      const publishUrl = `${baseUrl}/${businessAccountId}/media_publish`;
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      });

      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams.toString(),
        signal: controller.signal,
      });

      const publishData = await publishRes.json().catch(() => ({}));

      if (!publishRes.ok || !publishData.id) {
        const metaError = publishData.error?.message || `خطای انتشار اینستاگرام (${publishRes.status})`;
        return {
          provider: this.provider,
          success: false,
          errorCode: 'PUBLISH_FAILED',
          error: `خطا در نهایی‌سازی انتشار پست اینستاگرام: ${metaError}`,
        };
      }

      const mediaId = publishData.id;
      const externalUrl = `https://www.instagram.com/p/${mediaId}`;

      return {
        provider: this.provider,
        success: true,
        messageId: mediaId,
        externalUrl,
      };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        provider: this.provider,
        success: false,
        errorCode: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
        error: isAbort ? 'مهلت زمانی ارتباط با سرورهای اینستاگرام به پایان رسید (Timeout 25s)' : (err.message || 'خطای شبکه در ارتباط با اینستاگرام'),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const { accessToken, businessAccountId, baseUrl } = this.getCredentials();

    if (!accessToken || !businessAccountId) {
      return {
        success: false,
        message: 'شناسه حساب تجاری اینستاگرام یا Access Token وارد نشده است.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const url = `${baseUrl}/${businessAccountId}?fields=id,name,username&access_token=${accessToken}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.id) {
        return {
          success: true,
          message: `ارتباط با اینستاگرام تجاری برقرار است. پیج: @${data.username || data.name || data.id} (شناسه: ${data.id})`,
        };
      }

      const errText = data.error?.message || 'اطلاعات اکانت نامعتبر است';
      return {
        success: false,
        message: `خطای دسترسی اینستاگرام: ${errText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'عدم پاسخگویی اینستاگرام (Timeout)' : `خطا در تست اینستاگرام: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
