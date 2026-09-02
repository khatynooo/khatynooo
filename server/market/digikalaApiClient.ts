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

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 5000;
    this.maxRetries = config?.maxRetries ?? 2;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000;
    this.baseUrl = config?.proxyUrl || 'https://api.digikala.com';
  }

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * DEFAULT_USER_AGENTS.length);
    return DEFAULT_USER_AGENTS[idx];
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('Digikala API request timed out'));
      }, this.timeoutMs);
    });

    try {
      const fetchPromise = fetch(url, {
        ...options,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          ...(options.headers || {}),
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return response;
    } catch (err: any) {
      if (err.message?.includes('timed out') || err.message?.includes('aborted')) {
        throw new Error('Digikala API request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
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
        const isAbort = err.name === 'AbortError' || err.message?.includes('timed out') || err.message?.includes('aborted');
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 4000);

        if (attempt <= this.maxRetries) {
          console.warn(
            `⚠️ [DigikalaApiClient] تلاش ${attempt} از ${this.maxRetries} برای «${operationName}» ناموفق بود (${isAbort ? 'Timeout' : err.message}). تلاش مجدد پس از ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(`⚠️ [DigikalaApiClient] فراخوانی «${operationName}» پس از ${this.maxRetries + 1} تلاش متوقف شد:`, lastError?.message || lastError);
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
      const url = `${this.baseUrl}/v1/search/?q=${encodeURIComponent(query.trim())}&rows=${rows}`;
      const res = await this.fetchWithTimeout(url);

      if (!res.ok) {
        throw new Error(`Digikala HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawProducts = data?.data?.products || [];

      // فیلتر کردن اقلام غیرمرتبط کفش، پوشاک، لوازم دیجیتال غیرتحریر
      const stationeryProducts = rawProducts.filter((dp: any) => {
        const itemTitle = (dp.title_fa || '').toLowerCase();
        const catTitle = (dp.category?.title_fa || '').toLowerCase();

        return !BANNED_NON_STATIONERY_KEYWORDS.some(
          (kw) => itemTitle.includes(kw) || catTitle.includes(kw)
        );
      });

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
