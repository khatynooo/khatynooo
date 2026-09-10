/**
 * پردازشگر پس‌زمینه صف انتشار با مدیریت تلاش مجدد نمایی و کنترل همزمانی
 * (Publication Background Worker & Retry Scheduler)
 */

import {
  getPendingJobs,
  updateJobStatus,
  getRawChannelById,
  getRawChannelByProvider,
} from './publicationRepository';
import { getPublicationProvider } from './providers';
import { ProductPublicationRecord } from './publicationTypes';
import { query } from '../dbClient';

let isWorkerRunning = false;
let workerInterval: NodeJS.Timeout | null = null;
let isProcessingBatch = false;

export function startPublicationWorker(): void {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  console.log('🚀 [Publication Worker] پردازشگر پس‌زمینه انتشار چندکاناله فعال شد.');

  // اجرای پولینگ منظم هر ۱۰ ثانیه برای برداشت کارهای زمان‌بندی شده
  workerInterval = setInterval(() => {
    processPendingBatch().catch(err => {
      console.error('❌ [Publication Worker Error]:', err.message);
    });
  }, 10000);

  // اجرای اولیه سریع
  setTimeout(() => {
    processPendingBatch().catch(() => {});
  }, 2000);
}

export function stopPublicationWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  isWorkerRunning = false;
  console.log('🛑 [Publication Worker] پردازشگر انتشار متوقف شد.');
}

export function wakePublicationWorker(): void {
  if (!isWorkerRunning) {
    startPublicationWorker();
  }
  setTimeout(() => {
    processPendingBatch().catch(() => {});
  }, 50);
}

async function processPendingBatch(): Promise<void> {
  if (isProcessingBatch) return;
  isProcessingBatch = true;

  try {
    const jobs = await getPendingJobs(5);
    if (jobs.length === 0) {
      return;
    }

    for (const job of jobs) {
      await processSingleJob(job);
      // مکث کوتاه ۱ ثانیه‌ای برای رعایت سقف درخواست‌های پیام‌رسان‌ها (Rate Limit Prevention)
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err: any) {
    console.error('⚠️ [Publication Worker Batch Error]:', err.message);
  } finally {
    isProcessingBatch = false;
  }
}

async function processSingleJob(job: ProductPublicationRecord): Promise<void> {
  const startTime = Date.now();
  const currentAttempts = job.attempts + 1;

  // مرحله ۱: تغییر وضعیت به processing
  await updateJobStatus(job.id, {
    status: 'processing',
    attempts: currentAttempts,
    processingStartedAt: new Date(),
  });

  try {
    // مرحله ۲: دریافت پیکربندی کانال و بررسی فعال بودن آن
    let rawChannel = job.channelId ? await getRawChannelById(job.channelId) : null;
    if (!rawChannel) {
      rawChannel = await getRawChannelByProvider(job.provider);
    }

    const channelConfig = rawChannel?.config || {};

    // اگر کانال صراحتاً غیرفعال شده باشد
    if (rawChannel && rawChannel.enabled === false) {
      await updateJobStatus(job.id, {
        status: 'cancelled',
        errorCode: 'CHANNEL_DISABLED',
        errorMessage: 'کانال مقصد در تنظیمات سیستم غیرفعال است.',
      });
      return;
    }

    // مرحله ۳: بارگذاری آخرین اطلاعات کالا
    const productRes = await query('SELECT * FROM products WHERE id = $1', [job.productId]);
    if (productRes.rows.length === 0) {
      await updateJobStatus(job.id, {
        status: 'failed',
        errorCode: 'PRODUCT_NOT_FOUND',
        errorMessage: 'کالای مربوطه در سیستم یافت نشد.',
      });
      return;
    }

    const pRow = productRes.rows[0];
    const productData = {
      id: pRow.id,
      name: pRow.name,
      code: pRow.code,
      barcode: pRow.barcode,
      salePrice: Number(pRow.sale_price || 0),
      buyPrice: Number(pRow.buy_price || 0),
      stock: Number(pRow.stock || 0),
      unit: pRow.unit,
      description: pRow.description,
      image: pRow.image_url,
      showOnWebsite: Boolean(pRow.show_on_website),
    };

    // مرحله ۴: ایجاد آداپتور و فراخوانی درگاه انتشار
    const providerAdapter = getPublicationProvider(job.provider, channelConfig);

    const sendText = job.payload?.text || '';
    const sendImage = job.payload?.imageUrl || undefined;

    const result = await providerAdapter.sendProduct({
      product: productData,
      event: job.eventType,
      text: sendText,
      imageUrl: sendImage,
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      // انتشار موفقیت‌آمیز
      await updateJobStatus(job.id, {
        status: 'sent',
        messageId: result.messageId,
        externalUrl: result.externalUrl,
        sentAt: new Date(),
        errorCode: undefined,
        errorMessage: undefined,
      });

      console.log(
        `✅ [Publication Success] Job: ${job.id} | Provider: ${job.provider} | Product: ${job.productId} | Time: ${duration}ms`
      );
    } else {
      // خطا در انتشار
      const isPermanentError =
        result.errorCode === 'NOT_CONFIGURED' ||
        result.errorCode === 'AUTH_FAILED' ||
        result.errorCode === 'MISSING_IMAGE' ||
        result.errorCode === 'API_ERROR';

      if (result.errorCode === 'NOT_CONFIGURED') {
        await updateJobStatus(job.id, {
          status: 'not_configured',
          errorCode: result.errorCode,
          errorMessage: result.error || 'پیکربندی درگاه تکمیل نشده است.',
        });
        console.warn(
          `⚠️ [Publication Not Configured] Job: ${job.id} | Provider: ${job.provider} | Reason: ${result.error}`
        );
        return;
      }

      if (isPermanentError || currentAttempts >= job.maxAttempts) {
        // خطای دائمی یا اتمام تعداد دفعات تلاش مجاز
        await updateJobStatus(job.id, {
          status: 'failed',
          errorCode: result.errorCode || 'MAX_ATTEMPTS_REACHED',
          errorMessage: result.error || 'تعداد تلاش‌های مجاز به پایان رسید.',
        });
        console.error(
          `❌ [Publication Final Failure] Job: ${job.id} | Provider: ${job.provider} | Attempts: ${currentAttempts}/${job.maxAttempts} | Error: ${result.error}`
        );
      } else {
        // خطای موقت: برنامه‌ریزی تلاش مجدد نمایی (Exponential Backoff)
        const delayMs = getBackoffDelayMs(currentAttempts);
        const nextAttemptAt = new Date(Date.now() + delayMs);

        await updateJobStatus(job.id, {
          status: 'pending',
          errorCode: result.errorCode || 'TEMPORARY_FAILURE',
          errorMessage: `${result.error} (تلاش مجدد در ${Math.round(delayMs / 1000)} ثانیه دیگر)`,
          nextAttemptAt,
        });

        console.warn(
          `⏳ [Publication Retry Scheduled] Job: ${job.id} | Provider: ${job.provider} | Attempt: ${currentAttempts} -> Next: +${Math.round(delayMs / 1000)}s`
        );
      }
    }
  } catch (unexpectedErr: any) {
    console.error(`💥 [Publication Worker Exception] Job: ${job.id}:`, unexpectedErr);
    await updateJobStatus(job.id, {
      status: currentAttempts >= job.maxAttempts ? 'failed' : 'pending',
      errorCode: 'UNEXPECTED_ERROR',
      errorMessage: unexpectedErr.message,
      nextAttemptAt: new Date(Date.now() + 30000),
    });
  }
}

function getBackoffDelayMs(attempt: number): number {
  switch (attempt) {
    case 1:
      return 10 * 1000; // 10s
    case 2:
      return 30 * 1000; // 30s
    case 3:
      return 120 * 1000; // 2 min
    case 4:
      return 600 * 1000; // 10 min
    default:
      return 1800 * 1000; // 30 min
  }
}
