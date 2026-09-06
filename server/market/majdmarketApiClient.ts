// ==============================================================================
// کلاینت ارتباط و استخراج محصولات از وب‌سایت مجدمارکت (Majdmarket API/Scraping Client)
// ==============================================================================

import * as cheerio from 'cheerio';
import { ApiClientConfig, SourceOfferItem } from './types';
import { majdmarketSearchCache } from './cache';
import { BANNED_NON_STATIONERY_KEYWORDS } from './imageResolver';
import { normalizePersianText } from './textMatcher';

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export class MajdmarketApiClient {
  private timeoutMs: number;
  private maxRetries: number;
  private cacheTtlMs: number;
  private baseUrl: string;
  private inertiaVersion: string | null = null;

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 6000;
    this.maxRetries = config?.maxRetries ?? 1;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000; // ۳۰ دقیقه کش
    this.baseUrl = config?.proxyUrl || 'https://majdmarket.com';
  }

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * DEFAULT_USER_AGENTS.length);
    return DEFAULT_USER_AGENTS[idx];
  }

  private parsePrice(text: string): number {
    if (!text) return 0;
    const normalized = normalizePersianText(text);
    const cleaned = normalized.replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'Referer': `${this.baseUrl}/`,
          ...(options.headers || {}),
        },
      });

      return response;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('timed out') || err.message?.includes('aborted')) {
        throw new Error('Majdmarket request timed out');
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
        if (attempt <= this.maxRetries) {
          const delay = 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (process.env.DEBUG_MARKET) {
      console.debug(`[MajdmarketApiClient] ${operationName} returned null:`, lastError?.message || lastError);
    }
    return null;
  }

  /**
   * دریافت آخرین نسخهٔ توکن اینرشیا برای درخواست‌های مستقیم داده
   */
  private async getInertiaVersion(targetUrl: string): Promise<string | null> {
    if (this.inertiaVersion) return this.inertiaVersion;
    try {
      const res = await this.fetchWithTimeout(targetUrl, {
        headers: { 'X-Inertia': 'true' },
      });
      const ver = res.headers.get('x-inertia-version');
      if (ver) {
        this.inertiaVersion = ver;
        return ver;
      }
    } catch {
      // Ignored
    }
    return null;
  }

  /**
   * جستجوی محصولات در مجدمارکت با روش دوگانه (Inertia Partial Data API + HTML Fallback)
   */
  async searchProducts(query: string, limit = 6): Promise<SourceOfferItem[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `majdmarket_search_${query.trim().toLowerCase()}_${limit}`;
    const cached = majdmarketSearchCache.get<SourceOfferItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.executeWithRetry(async () => {
      const results: SourceOfferItem[] = [];
      const searchUrl = `${this.baseUrl}/products?search=${encodeURIComponent(query.trim())}`;

      // روش ۱: استخراج مستقیم دیتا از Inertia Partial Reload مجدمارکت
      try {
        const version = await this.getInertiaVersion(searchUrl);
        const headers: Record<string, string> = {
          'X-Inertia': 'true',
          'X-Inertia-Partial-Component': 'Ecommerce/Product/Index',
          'X-Inertia-Partial-Data': 'model',
          'Accept': 'text/html, application/xhtml+xml',
        };
        if (version) {
          headers['X-Inertia-Version'] = version;
        }

        const res = await this.fetchWithTimeout(searchUrl, { headers });

        if (res.status === 409) {
          // در صورت تغییر نسخه اینرشیا، نسخه جدید را گرفته و مجدد امتحان می‌کنیم
          const newVer = res.headers.get('x-inertia-version');
          if (newVer) {
            this.inertiaVersion = newVer;
            headers['X-Inertia-Version'] = newVer;
            const retryRes = await this.fetchWithTimeout(searchUrl, { headers });
            if (retryRes.ok) {
              const data = await retryRes.json();
              const itemsList = data.props?.model?.data || [];
              this.parseInertiaItems(itemsList, results, limit);
              if (results.length > 0) return results;
            }
          }
        } else if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const data = await res.json();
            const itemsList = data.props?.model?.data || [];
            this.parseInertiaItems(itemsList, results, limit);
            if (results.length > 0) return results;
          }
        }
      } catch (err) {
        // Fallback to HTML parsing
      }

      // روش ۲: دریافت HTML و استخراج داده از script[data-page] یا لینک‌های محصولات
      try {
        const res = await this.fetchWithTimeout(searchUrl);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);

          // بررسی اسکریپت data-page
          const scriptText = $('script[data-page]').text();
          if (scriptText) {
            try {
              const parsed = JSON.parse(scriptText);
              const itemsList = parsed.props?.model?.data || parsed.props?.products?.data || [];
              if (Array.isArray(itemsList) && itemsList.length > 0) {
                this.parseInertiaItems(itemsList, results, limit);
                if (results.length > 0) return results;
              }
            } catch {
              // Parse error
            }
          }

          // استخراج از کاردها یا لینک‌های HTML
          const productLinks = $('a[href*="/products/"]');
          const seenSlugs = new Set<string>();

          productLinks.each((_, el) => {
            if (results.length >= limit) return false;

            const a = $(el);
            const href = a.attr('href') || '';
            const slug = href.replace(/^.*\/products\//, '').split('?')[0];
            if (!slug || seenSlugs.has(slug)) return;
            seenSlugs.add(slug);

            const title = a.attr('title') || a.text().trim() || a.find('img').attr('alt') || '';
            if (!title) return;

            const lowerTitle = title.toLowerCase();
            const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
            if (isBanned) return;

            const container = a.closest('[class*="card"], [class*="product"], [class*="item"], div');
            const priceText = container.find('[class*="price"]').text().trim();
            const price = this.parsePrice(priceText);

            const imgEl = container.find('img').first();
            let imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
            if (imgSrc.startsWith('/')) {
              imgSrc = `${this.baseUrl}${imgSrc}`;
            }

            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;

            results.push({
              id: slug,
              source: 'majdmarket',
              title,
              price,
              seller: 'مجدمارکت',
              url: fullUrl,
              image: imgSrc,
              images: imgSrc ? [imgSrc] : [],
              inStock: price > 0,
            });
          });
        }
      } catch {
        // Fallback completed
      }

      return results;
    }, `searchProducts(${query})`);

    const finalResults = items || [];
    majdmarketSearchCache.set(cacheKey, finalResults, this.cacheTtlMs);
    return finalResults;
  }

  private parseInertiaItems(rawList: any[], results: SourceOfferItem[], limit: number): void {
    if (!Array.isArray(rawList)) return;

    for (const item of rawList) {
      if (results.length >= limit) break;

      const title = item.name || item.title || '';
      if (!title) continue;

      const lowerTitle = title.toLowerCase();
      const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
      if (isBanned) continue;

      const price = Number(item.sale_price) || Number(item.regular_price) || Number(item.price) || 0;
      const url = item.url || (item.slug ? `${this.baseUrl}/products/${item.slug}` : `${this.baseUrl}/products/${item.id}`);

      // استخراج تصاویر از آرایه medias
      const images: string[] = [];
      if (Array.isArray(item.medias)) {
        for (const m of item.medias) {
          const path = m.original?.path || m.path || m.thumbnail?.path || m.webp?.path || '';
          if (path) {
            const fullImg = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
            images.push(fullImg);
          }
        }
      }
      const image = images[0] || '';

      results.push({
        id: String(item.id || item.sku || `majd-${results.length + 1}`),
        source: 'majdmarket',
        title,
        price,
        seller: 'مجدمارکت',
        url,
        image,
        images,
        inStock: item.status_label ? item.status_label.includes('موجود') : price > 0,
      });
    }
  }
}

export const majdmarketApiClient = new MajdmarketApiClient();
