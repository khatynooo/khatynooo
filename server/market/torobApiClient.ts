// ==============================================================================
// کلاینت ارتباط با وب‌سرویس ترب (Torob API Client with Timeout, Retry & Cache)
// توجه: این وب‌سرویس غیررسمی بوده و برای محیط پروداکشن استفاده از کش و فال‌بک الزامی است.
// ==============================================================================

import { ApiClientConfig } from './types';
import { torobSearchCache } from './cache';
import { BANNED_NON_STATIONERY_KEYWORDS } from './imageResolver';
import { normalizePersianText } from './textMatcher';

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

export class TorobApiClient {
  private timeoutMs: number;
  private maxRetries: number;
  private cacheTtlMs: number;
  private baseUrl: string;

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 5000;
    this.maxRetries = config?.maxRetries ?? 2;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000; // ۳۰ دقیقه کش
    this.baseUrl = config?.proxyUrl || process.env.TOROB_PROXY_URL || 'https://api.torob.com';
  }

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * DEFAULT_USER_AGENTS.length);
    return DEFAULT_USER_AGENTS[idx];
  }

  /**
   * اجرای درخواست HTTP با قابلیت Timeout خودکار توسط AbortController
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'Referer': 'https://torob.com/',
          'Origin': 'https://torob.com',
          ...(options.headers || {}),
        },
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * اجرای درخواست با مکانیزم Retry و Exponential Backoff
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>, operationName: string): Promise<T | null> {
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      try {
        return await requestFn();
      } catch (err: any) {
        attempt++;
        lastError = err;
        const isAbort = err.name === 'AbortError';
        const isBotChallenge = err.message?.includes('HTTP 490') || err.message?.includes('HTTP 403');
        
        // در صورت تشخیص ربات (490/403) تکرار درخواست تاثیری ندارد و بلافاصله متوقف می‌شود
        if (isBotChallenge) {
          console.warn(`⚠️ [TorobApiClient] وب‌سرویس ترب به دلیل حفاظت ضدربات (HTTP 490/403) پاسخ نداد. سیستم به کاتالوگ بنچمارک و منابع جایگزین سوئیچ می‌کند.`);
          return null;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 4000);

        if (attempt <= this.maxRetries) {
          console.warn(
            `⚠️ [TorobApiClient] تلاش ${attempt} از ${this.maxRetries} برای «${operationName}» ناموفق بود (${isAbort ? 'Timeout' : err.message}). تلاش مجدد پس از ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(`⚠️ [TorobApiClient] فراخوانی «${operationName}» با خطا متوقف شد:`, lastError?.message || lastError);
    return null;
  }

  /**
   * جستجوی محصولات پایه در ترب بر اساس متن کوئری
   */
  async searchProducts(query: string, sort: 'popularity' | 'price_asc' | 'price_desc' = 'popularity'): Promise<any[]> {
    if (!query || !query.trim()) return [];

    const normQuery = normalizePersianText(query);
    const cacheKey = `torob_search_${sort}_${normQuery}`;

    // ۱. بررسی حافظه کش
    const cached = torobSearchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // ۲. فراخوانی API ترب با Retry و Timeout
    const result = await this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/v4/base-product/search/?sort=${sort}&q=${encodeURIComponent(query.trim())}`;
      const res = await this.fetchWithTimeout(url);

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('⚠️ [TorobApiClient] نرخ درخواست از سمت ترب محدود شده است (HTTP 429 Too Many Requests).');
        }
        throw new Error(`Torob HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawResults = data?.results || [];
      const searchId = data?.search_id;

      // فیلتر کردن اقلام غیرمرتبط کفش و پوشاک و الصاق search_id به آیتم‌ها
      const filtered = rawResults
        .filter((item: any) => {
          const title = (item.name1 || item.name2 || '').toLowerCase();
          return !BANNED_NON_STATIONERY_KEYWORDS.some((kw) => title.includes(kw));
        })
        .map((item: any) => ({
          ...item,
          search_id: searchId || item.search_id,
        }));

      return filtered;
    }, `searchProducts(${query})`);

    const finalResults = result || [];

    // ذخیره در کش
    if (finalResults.length > 0) {
      torobSearchCache.set(cacheKey, finalResults, this.cacheTtlMs);
    }

    return finalResults;
  }

  /**
   * استعلام جزئیات یک کالای خاص با Random Key ترب و شناسه جستجو (search_id)
   * از اندپوینت رسمی بازیابی جزئیات /v4/base-product/details/ استفاده می‌کند.
   */
  async getProductDetails(randomKey: string, searchId?: string): Promise<any | null> {
    if (!randomKey) return null;

    const cacheKey = `torob_detail_${randomKey}`;
    const cached = torobSearchCache.get(cacheKey);
    if (cached) return cached;

    const result = await this.executeWithRetry(async () => {
      // استفاده از اندپوینت استاندارد بازیابی مشخصات با search_id در صورت وجود
      const searchParam = searchId ? `&search_id=${encodeURIComponent(searchId)}` : '';
      const primaryUrl = `${this.baseUrl}/v4/base-product/details/?prk=${encodeURIComponent(randomKey)}${searchParam}`;

      let res = await this.fetchWithTimeout(primaryUrl);

      // در صورت عدم موفقیت اندپوینت اصلی، تلاش با اندپوینت بدون لاگ
      if (!res.ok && res.status !== 490) {
        const fallbackUrl = `${this.baseUrl}/v4/base-product/details-without-log-click/?prk=${encodeURIComponent(randomKey)}`;
        res = await this.fetchWithTimeout(fallbackUrl);
      }

      if (!res.ok) {
        throw new Error(`Torob Detail HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    }, `getProductDetails(${randomKey})`);

    if (result) {
      torobSearchCache.set(cacheKey, result, this.cacheTtlMs * 2);
    }

    return result;
  }
}

// نمونه اشتراکی پیش‌فرض
export const torobApiClient = new TorobApiClient();
