/**
 * درگاه انتشار وب‌سایت و فروشگاه آنلاین خطی‌نو (Website & CMS Provider)
 * به‌روزرسانی زنده وضعیت نمایش کالا در سایت و ثبت رویداد انتشار کاتالوگ
 */

import {
  PublicationProviderAdapter,
  PublicationProduct,
  PublicationEvent,
  PublicationResult,
  PublicationChannelConfig,
} from '../publicationTypes';
import { query } from '../../dbClient';

export class WebsiteProvider implements PublicationProviderAdapter {
  readonly provider = 'website' as const;

  constructor(private readonly config: PublicationChannelConfig = {}) {}

  async sendProduct(params: {
    product: PublicationProduct;
    event: PublicationEvent;
    text: string;
    imageUrl?: string;
  }): Promise<PublicationResult> {
    try {
      // به‌روزرسانی فلگ‌های انتشار در سایت کالا در پایگاه داده
      await query(
        `UPDATE products 
         SET show_on_website = TRUE, only_accounting = FALSE, updated_at = NOW() 
         WHERE id = $1`,
        [params.product.id]
      );

      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const searchParam = encodeURIComponent(params.product.code || params.product.name);
      const productUrl = `${appUrl}/store?search=${searchParam}`;

      // در صورت وجود وبهوک دلخواه وب‌سایت خارجی
      if (this.config.webhookUrl) {
        try {
          await fetch(this.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: params.event,
              product: params.product,
              text: params.text,
              imageUrl: params.imageUrl,
            }),
          });
        } catch (webhookErr) {
          console.warn('⚠️ [Website Publication Webhook Warning]:', webhookErr);
        }
      }

      return {
        provider: this.provider,
        success: true,
        messageId: params.product.id,
        externalUrl: productUrl,
      };
    } catch (err: any) {
      return {
        provider: this.provider,
        success: false,
        errorCode: 'DB_UPDATE_ERROR',
        error: `خطا در فعال‌سازی کالا روی وب‌سایت: ${err.message}`,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await query('SELECT count(*) as count FROM products WHERE show_on_website = TRUE');
      const count = res.rows[0]?.count || 0;
      return {
        success: true,
        message: `اتصال به پایگاه داده و کاتالوگ آنلاین فعال است. تعداد کالاهای فعال در وب‌سایت: ${count}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `خطا در برقراری ارتباط با ماژول فروشگاه اینترنتی: ${err.message}`,
      };
    }
  }
}
