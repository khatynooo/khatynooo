/**
 * صف وظایف انتشار چندکاناله و ثبت رویدادها در الگوی Transactional Outbox
 * (Multi-Channel Publication Transactional Queue)
 */

import {
  PublicationEvent,
  PublicationProduct,
  PublicationProvider,
  PublicationRequest,
} from './publicationTypes';
import {
  createPublicationJob,
  getChannels,
  getSettings,
  getRawChannelByProvider,
} from './publicationRepository';
import { generateHashtags } from './hashtagService';
import { buildProductPublicationText } from './publicationFormatter';
import { wakePublicationWorker } from './publicationWorker';

export class PublicationQueue {
  /**
   * ثبت وظایف انتشار خودکار ناشی از تغییرات کالا در دیتابیس
   */
  static async enqueueAutomaticEvent(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    previousPrice?: number;
    previousStock?: number;
    client?: any; // کلاینت تراکنش جاری در صورت نیاز به اجرای درون تراکنش
  }): Promise<void> {
    try {
      const settings = await getSettings();

      // بررسی فعال بودن تریگر بر اساس نوع رویداد
      let shouldTrigger = false;
      if (params.event === 'product_created' && settings.publishOnCreate) shouldTrigger = true;
      if (params.event === 'product_updated' && settings.publishOnUpdate) shouldTrigger = true;
      if (params.event === 'price_changed' && settings.publishOnPriceChange) shouldTrigger = true;
      if (params.event === 'stock_restocked' && settings.publishOnRestock) shouldTrigger = true;

      if (!shouldTrigger) {
        return;
      }

      // دریافت کانال‌های فعال که تیک انتشار خودکار دارند
      const channels = await getChannels();
      const activeChannels = channels.filter(c => c.enabled && (c.config.autoPublish !== false));

      if (activeChannels.length === 0) {
        return;
      }

      // آماده‌سازی متن، هشتگ‌ها و لینک
      const hashtags = settings.generateHashtagsByDefault ? generateHashtags(params.product) : [];
      const text = buildProductPublicationText(
        params.product,
        hashtags,
        settings.defaultTemplate
      );

      const imageUrl = settings.sendImageByDefault ? (params.product.image || (params.product as any).imageUrl) : undefined;

      // ساخت وظیفه مجزا به ازای هر کانال فعال با کلید یکتایی (Idempotency Key)
      // کلید یکتایی مانع از انتشار چندباره در یک دقیقه برای همان کالا و رویداد می‌شود
      const timeBucket = Math.floor(Date.now() / 60000); // 1-minute window
      for (const ch of activeChannels) {
        const idempotencyKey = `auto_${params.product.id}_${ch.provider}_${params.event}_${timeBucket}`;
        const jobId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        await createPublicationJob(
          {
            id: jobId,
            productId: params.product.id,
            channelId: ch.id,
            provider: ch.provider,
            eventType: params.event,
            status: 'pending',
            idempotencyKey,
            payload: {
              text,
              imageUrl,
              hashtags,
              productSnapshot: {
                name: params.product.name,
                code: params.product.code,
                salePrice: params.product.salePrice,
                stock: params.product.stock,
              },
            },
          },
          params.client
        );
      }

      // بیدار کردن ورکر برای پردازش فوری وظایف ایجاد شده
      setTimeout(() => wakePublicationWorker(), 100);
    } catch (err: any) {
      console.error('⚠️ [PublicationQueue Warning] خطا در صف‌بندی رویداد خودکار:', err.message);
      // شکست در انتشار هرگز نباید خطای کلی در عملیات اصلی کالا ایجاد کند
    }
  }

  /**
   * ثبت وظایف انتشار دستی کالا از طریق مدال یا پنل مدیریت
   */
  static async enqueueManualPublish(
    product: PublicationProduct,
    request: PublicationRequest,
    userId?: string
  ): Promise<{ queuedCount: number; jobIds: string[] }> {
    const settings = await getSettings();
    const defaultProviders: PublicationProvider[] = ['website', 'eitaa', 'bale', 'telegram'];
    const targetProviders: PublicationProvider[] = request.providers && request.providers.length > 0
      ? request.providers
      : defaultProviders;

    const hashtags = (request.generateHashtags ?? settings.generateHashtagsByDefault)
      ? generateHashtags(product)
      : [];

    const text = buildProductPublicationText(
      product,
      hashtags,
      settings.defaultTemplate,
      request.customText
    );

    const sendImage = request.sendImage !== undefined ? request.sendImage : settings.sendImageByDefault;
    const imageUrl = sendImage ? (product.image || (product as any).imageUrl) : undefined;

    const jobIds: string[] = [];

    for (const provider of targetProviders) {
      const channel = await getRawChannelByProvider(provider);
      const jobId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // کلید یکتایی منحصر‌به‌فرد برای هر درخواست دستی
      const idempotencyKey = `manual_${product.id}_${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const created = await createPublicationJob({
        id: jobId,
        productId: product.id,
        channelId: channel ? channel.id : undefined,
        provider: provider,
        eventType: 'manual',
        status: 'pending',
        idempotencyKey,
        payload: {
          text,
          imageUrl,
          hashtags,
          customText: request.customText,
          userId,
          productSnapshot: {
            name: product.name,
            code: product.code,
            salePrice: product.salePrice,
            stock: product.stock,
          },
        },
      });

      if (created) {
        jobIds.push(created.id);
      }
    }

    // بیدار کردن ورکر
    setTimeout(() => wakePublicationWorker(), 100);

    return {
      queuedCount: jobIds.length,
      jobIds,
    };
  }
}
