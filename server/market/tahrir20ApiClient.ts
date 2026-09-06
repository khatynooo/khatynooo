// ==============================================================================
// کلاینت ارتباط و استخراج محصولات از وب‌سایت تحریر۲۰ (Tahrir20 API/Scraping Client)
// ==============================================================================

import * as cheerio from 'cheerio';
import { ApiClientConfig, SourceOfferItem } from './types';
import { tahrir20SearchCache } from './cache';
import { BANNED_NON_STATIONERY_KEYWORDS } from './imageResolver';
import { normalizePersianText } from './textMatcher';

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export class Tahrir20ApiClient {
  private timeoutMs: number;
  private maxRetries: number;
  private cacheTtlMs: number;
  private baseUrl: string;

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 6000;
    this.maxRetries = config?.maxRetries ?? 1;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000; // ۳۰ دقیقه کش
    this.baseUrl = config?.proxyUrl || 'https://tahrir20.com';
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
        throw new Error('Tahrir20 request timed out');
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
      console.debug(`[Tahrir20ApiClient] ${operationName} returned null:`, lastError?.message || lastError);
    }
    return null;
  }

  /**
   * جستجوی محصولات در تحریر۲۰ با متد دوگانه (Store API + HTML Fallback)
   */
  async searchProducts(query: string, limit = 6): Promise<SourceOfferItem[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `tahrir20_search_${query.trim().toLowerCase()}_${limit}`;
    const cached = tahrir20SearchCache.get<SourceOfferItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.executeWithRetry(async () => {
      const results: SourceOfferItem[] = [];

      // روش ۱: استفاده از WooCommerce Store API
      try {
        const apiUrl = `${this.baseUrl}/wp-json/wc/store/v1/products?search=${encodeURIComponent(query.trim())}&per_page=${limit * 2}`;
        const res = await this.fetchWithTimeout(apiUrl, {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            for (const p of data) {
              if (results.length >= limit) break;

              const title = p.name ? cheerio.load(p.name).text().trim() : '';
              if (!title) continue;

              const lowerTitle = title.toLowerCase();
              const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
              if (isBanned) continue;

              let price = 0;
              if (p.prices?.price) {
                const rawPrice = parseInt(p.prices.price, 10) || 0;
                // اگر ارز ریال باشد تبدیل به تومان
                price = p.prices.currency_code === 'IRR' ? Math.round(rawPrice / 10) : rawPrice;
              }

              const images: string[] = Array.isArray(p.images)
                ? p.images.map((img: any) => img.src || '').filter(Boolean)
                : [];
              const image = images[0] || '';

              results.push({
                id: String(p.id || `tahrir20-${results.length + 1}`),
                source: 'tahrir20',
                title,
                price,
                seller: 'تحریر۲۰',
                url: p.permalink || `${this.baseUrl}/?p=${p.id}`,
                image,
                images,
                inStock: p.is_in_stock !== false,
              });
            }

            if (results.length > 0) {
              return results;
            }
          }
        }
      } catch (apiErr) {
        // Fallback to HTML
      }

      // روش ۲: اسکرپینگ مستقیم صفحه جستجوی ووکامرس
      try {
        const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query.trim())}&post_type=product`;
        const res = await this.fetchWithTimeout(searchUrl);

        if (!res.ok) {
          return results;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        const cards = $('li.product, .product-item, article.product, .products .product');
        cards.each((_, el) => {
          if (results.length >= limit) return false;

          const card = $(el);
          const anchor = card.find('a[href*="/product/"]').first().length
            ? card.find('a[href*="/product/"]').first()
            : card.find('a').first();

          const titleEl = card.find('.woocommerce-loop-product__title, .product-title, h2, h3').first();
          const rawTitle = titleEl.text().trim() || anchor.attr('title') || anchor.text().trim();
          const href = anchor.attr('href') || '';
          if (!rawTitle || !href) return;

          const lowerTitle = rawTitle.toLowerCase();
          const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
          if (isBanned) return;

          const priceEl = card.find('.price .amount, .price ins .amount, .price').last();
          const price = this.parsePrice(priceEl.text());

          const imgEl = card.find('img').first();
          let imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
          if (imgSrc.startsWith('//')) {
            imgSrc = `https:${imgSrc}`;
          }

          results.push({
            id: `tahrir20-${results.length + 1}`,
            source: 'tahrir20',
            title: rawTitle,
            price,
            seller: 'تحریر۲۰',
            url: href,
            image: imgSrc,
            images: imgSrc ? [imgSrc] : [],
            inStock: price > 0,
          });
        });
      } catch (htmlErr) {
        // Return whatever was collected
      }

      return results;
    }, `searchProducts(${query})`);

    const finalResults = items || [];
    tahrir20SearchCache.set(cacheKey, finalResults, this.cacheTtlMs);
    return finalResults;
  }
}

export const tahrir20ApiClient = new Tahrir20ApiClient();
