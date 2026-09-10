/**
 * سرویس اصلی هماهنگ‌کننده انتشار چندکاناله (Publication Service Orchestrator)
 */

import {
  PublicationProduct,
  PublicationRequest,
  PublicationChannel,
  PublicationSettings,
  ProductPublicationRecord,
} from './publicationTypes';
import {
  getChannels,
  getRawChannelById,
  updateChannel,
  createChannel,
  deleteChannel,
  getSettings,
  updateSettings,
  getPublicationHistory,
  getProductPublicationHistory,
  getPublicationStats,
  retryJob,
  cancelJob,
} from './publicationRepository';
import { PublicationQueue } from './publicationQueue';
import { getPublicationProvider } from './providers';
import { wakePublicationWorker } from './publicationWorker';
import { query } from '../dbClient';

export class PublicationService {
  /**
   * رویداد ثبت کالای جدید
   */
  static async onProductCreated(product: PublicationProduct, client?: any): Promise<void> {
    await PublicationQueue.enqueueAutomaticEvent({
      product,
      event: 'product_created',
      client,
    });
  }

  /**
   * رویداد ویرایش کالا با تشخیص تغییر قیمت و شارژ مجدد موجودی
   */
  static async onProductUpdated(
    product: PublicationProduct,
    prev: { stock?: number; salePrice?: number },
    client?: any
  ): Promise<void> {
    const prevStock = Number(prev.stock || 0);
    const newStock = Number(product.stock || 0);
    const prevPrice = Number(prev.salePrice || 0);
    const newPrice = Number(product.salePrice || 0);

    // ۱. بررسی شارژ مجدد موجودی (قبلاً صفر یا ناموجود بوده و اکنون موجود شده)
    if (prevStock <= 0 && newStock > 0) {
      await PublicationQueue.enqueueAutomaticEvent({
        product,
        event: 'stock_restocked',
        previousStock: prevStock,
        client,
      });
    }

    // ۲. بررسی تغییر قیمت فروش
    if (prevPrice > 0 && newPrice > 0 && prevPrice !== newPrice) {
      await PublicationQueue.enqueueAutomaticEvent({
        product,
        event: 'price_changed',
        previousPrice: prevPrice,
        client,
      });
    }

    // ۳. رویداد کلی به‌روزرسانی کالا
    await PublicationQueue.enqueueAutomaticEvent({
      product,
      event: 'product_updated',
      client,
    });
  }

  /**
   * انتشار دستی کالا از طریق رابط کاربری
   */
  static async publishManually(
    productId: string,
    request: PublicationRequest,
    userId?: string
  ): Promise<{ queuedCount: number; jobIds: string[] }> {
    const res = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (res.rows.length === 0) {
      throw new Error(`کالای با شناسه ${productId} یافت نشد.`);
    }

    const row = res.rows[0];
    const product: PublicationProduct = {
      id: row.id,
      name: row.name,
      code: row.code,
      barcode: row.barcode,
      salePrice: Number(row.sale_price || 0),
      buyPrice: Number(row.buy_price || 0),
      stock: Number(row.stock || 0),
      unit: row.unit,
      description: row.description,
      image: row.image_url,
      showOnWebsite: Boolean(row.show_on_website),
    };

    return await PublicationQueue.enqueueManualPublish(product, request, userId);
  }

  /**
   * تست سلامت اتصال کانال به درگاه مربوطه
   */
  static async testChannel(channelId: string): Promise<{ success: boolean; message: string }> {
    const raw = await getRawChannelById(channelId);
    if (!raw) {
      throw new Error('کانال مورد نظر یافت نشد.');
    }

    const adapter = getPublicationProvider(raw.provider, raw.config || {});
    return await adapter.testConnection();
  }

  /**
   * تلاش مجدد برای کار ناموفق
   */
  static async retry(publicationId: string): Promise<ProductPublicationRecord | null> {
    const job = await retryJob(publicationId);
    if (job) {
      wakePublicationWorker();
    }
    return job;
  }

  /**
   * لغو کار در صف
   */
  static async cancel(publicationId: string): Promise<ProductPublicationRecord | null> {
    return await cancelJob(publicationId);
  }

  // متدهای واکشی و تنظیمات
  static getChannels() {
    return getChannels();
  }

  static updateChannel(id: string, updates: any) {
    return updateChannel(id, updates);
  }

  static createChannel(data: any) {
    return createChannel(data);
  }

  static deleteChannel(id: string) {
    return deleteChannel(id);
  }

  static getSettings() {
    return getSettings();
  }

  static updateSettings(updates: Partial<PublicationSettings>) {
    return updateSettings(updates);
  }

  static getHistory(filters: any) {
    return getPublicationHistory(filters);
  }

  static getProductHistory(productId: string) {
    return getProductPublicationHistory(productId);
  }

  static getStats() {
    return getPublicationStats();
  }
}
