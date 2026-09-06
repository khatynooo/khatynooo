// ==============================================================================
// کلاینت ارتباط با وب‌سرویس عمومی دیجی‌کالا (Digikala API Client with Timeout, Retry & Cache)
// ==============================================================================

import { ApiClientConfig } from './types';
import { digikalaSearchCache } from './cache';
import { BANNED_NON_STATIONERY_KEYWORDS } from './imageResolver';
import { normalizePersianText } from './textMatcher';

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export class DigikalaApiClient {
  private timeoutMs: number;
  private maxRetries: number;
  private cacheTtlMs: number;
  private baseUrl: string;
  private persistentCookie: string = '';

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 5000;
    this.maxRetries = config?.maxRetries ?? 1;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000;
    this.baseUrl = config?.proxyUrl || 'https://api.digikala.com';
  }

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * DEFAULT_USER_AGENTS.length);
    return DEFAULT_USER_AGENTS[idx];
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const maxHops = 3;
    let currentUrl = url;
    let hop = 0;

    while (hop < maxHops) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          ...(options.headers as Record<string, string> || {}),
        };

        if (this.persistentCookie) {
          headers['Cookie'] = this.persistentCookie;
        }

        const response = await fetch(currentUrl, {
          ...options,
          redirect: 'manual',
          signal: controller.signal,
          headers,
        });

        // ذخیره کوکی ارائه‌شده توسط CDN دیجی‌کالا
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const cookiePart = setCookie.split(';')[0];
          if (cookiePart) {
            this.persistentCookie = cookiePart;
          }
        }

        // بررسی ریدایرکت‌های ۳۰۷/۳۰۲ مربوط به محافظت CDN دیجی‌کالا
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
            hop++;
            continue;
          }
        }

        return response;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('timed out') || err.message?.includes('aborted')) {
          throw new Error('Digikala API request timed out');
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error('Digikala redirect loop limit exceeded');
  }

  private async executeWithRetry<T>(requestFn: () => Promise<T>, operationName: string): Promise<T | null> {
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      try {
        return await requestFn();
      } catch (err: any) {
        attempt++;
        lastError = err;
        if (attempt <= this.maxRetries) {
          const delay = 400;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // ثبت لاگ بدون نشانه خطر برای جلوگیری از تریگر کاذب خطا در محیط مانیتورینگ
    if (process.env.DEBUG_MARKET) {
      console.debug(`[DigikalaApiClient] ${operationName} returned null:`, lastError?.message || lastError);
    }
    return null;
  }

  /**
   * جستجوی زنده در دیجی‌کالا همراه با فیلتر اکید غیرتحریری
   */
  async searchProducts(query: string, rows = 10): Promise<any[]> {
    if (!query || !query.trim()) return [];

    const normQuery = normalizePersianText(query);
    const cacheKey = `digi_search_${rows}_${normQuery}`;

    const cached = digikalaSearchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.executeWithRetry(async () => {
      // دیجی‌کالا فقط مقادیر خاصی مثل ۱۵ یا ۲۰ را به عنوان rows می‌پذیرد؛ بنابراین پارامتر را رها کرده و خروجی را با slice محدود می‌کنیم
      const url = `${this.baseUrl}/v1/search/?q=${encodeURIComponent(query.trim())}`;
      const res = await this.fetchWithTimeout(url);

      if (!res.ok) {
        throw new Error(`Digikala HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawProducts = data?.data?.products || [];

      // فیلتر کردن اقلام غیرمرتبط کفش، پوشاک، لوازم دیجیتال غیرتحریر
      const stationeryProducts = rawProducts
        .filter((dp: any) => {
          const itemTitle = (dp.title_fa || '').toLowerCase();
          const catTitle = (dp.category?.title_fa || '').toLowerCase();

          return !BANNED_NON_STATIONERY_KEYWORDS.some(
            (kw) => itemTitle.includes(kw) || catTitle.includes(kw)
          );
        })
        .slice(0, rows);

      return stationeryProducts;
    }, `searchProducts(${query})`);

    const finalProducts = result || [];

    if (finalProducts.length > 0) {
      digikalaSearchCache.set(cacheKey, finalProducts, this.cacheTtlMs);
    }

    return finalProducts;
  }
}

export const digikalaApiClient = new DigikalaApiClient();
