// ==============================================================================
// کلاینت ارتباط و اسکرپینگ محصولات از وب‌سایت ایمالز (Emalls API/Scraping Client)
// ==============================================================================

import * as cheerio from 'cheerio';
import { ApiClientConfig, SourceOfferItem } from './types';
import { emallsSearchCache } from './cache';
import { BANNED_NON_STATIONERY_KEYWORDS } from './imageResolver';
import { normalizePersianText } from './textMatcher';

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

export class EmallsApiClient {
  private timeoutMs: number;
  private maxRetries: number;
  private cacheTtlMs: number;
  private baseUrl: string;

  constructor(config?: ApiClientConfig) {
    this.timeoutMs = config?.timeoutMs || 5000;
    this.maxRetries = config?.maxRetries ?? 1;
    this.cacheTtlMs = config?.cacheTtlMs || 30 * 60 * 1000; // ۳۰ دقیقه کش
    this.baseUrl = config?.proxyUrl || 'https://emalls.ir';
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'Referer': `${this.baseUrl}/`,
          ...(options.headers || {}),
        },
      });

      return response;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('timed out') || err.message?.includes('aborted')) {
        throw new Error('Emalls request timed out');
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
      console.debug(`[EmallsApiClient] ${operationName} returned null:`, lastError?.message || lastError);
    }
    return null;
  }

  /**
   * جستجوی محصولات در ایمالز و استخراج اقلام مرتبط با نوشت‌افزار
   */
  async searchProducts(query: string, limit = 6): Promise<SourceOfferItem[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `emalls_search_${query.trim().toLowerCase()}_${limit}`;
    const cached = emallsSearchCache.get<SourceOfferItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.executeWithRetry(async () => {
      // الگوی URL جستجو در ایمالز: /لیست-قیمت~skey~<query>
      const targetUrl = `${this.baseUrl}/لیست-قیمت~skey~${encodeURIComponent(query.trim())}`;
      const res = await this.fetchWithTimeout(targetUrl);

      if (!res.ok) {
        return [];
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const results: SourceOfferItem[] = [];
      const seenIds = new Set<string>();

      // روش اول: پیمایش لینک‌های دارای شناسه ~id~
      const idLinks = $('a[href*="~id~"]');

      if (idLinks.length > 0) {
        idLinks.each((_, el) => {
          if (results.length >= limit * 2) return false;

          const anchor = $(el);
          const href = anchor.attr('href') || '';
          const idMatch = href.match(/~id~([0-9]+)/i);
          if (!idMatch) return;

          const id = idMatch[1];
          if (seenIds.has(id)) return;
          seenIds.add(id);

          const rawTitle = anchor.attr('title') || anchor.text().trim();
          if (!rawTitle) return;

          // والد کارد محصول
          const container = anchor.parents('.item').first().length
            ? anchor.parents('.item').first()
            : anchor.closest('.item, .product-block, .content-box');

          // قیمت
          const priceText = container.length
            ? container.find('.prd-price, [class*="price"]').first().text().trim()
            : '';
          const price = this.parsePrice(priceText);

          // عکس
          const imgEl = container.length ? container.find('img').first() : anchor.find('img').first();
          let imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
          if (imgSrc.startsWith('//')) {
            imgSrc = `https:${imgSrc}`;
          } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('http')) {
            imgSrc = `${this.baseUrl}${imgSrc}`;
          }

          const images = imgSrc ? [imgSrc] : [];
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
          const sellerText = container.find('.seller-title, .shop-title, [class*="seller"]').first().text().trim();

          // بررسی کلیدواژه‌های نامرتبط با لوازم‌تحریر
          const lowerTitle = rawTitle.toLowerCase();
          const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
          if (isBanned) return;

          results.push({
            id,
            source: 'emalls',
            title: rawTitle,
            price,
            seller: sellerText || 'فروشندگان ایمالز',
            url: fullUrl,
            image: imgSrc,
            images,
            inStock: price > 0,
          });
        });
      }

      // روش دوم (Fallback): استخراج کاردهای مستقیم در صورت عدم تطابق شناسه
      if (results.length === 0) {
        const cards = $('.item, .prd-item, .product-block');
        cards.each((_, el) => {
          if (results.length >= limit * 2) return false;

          const card = $(el);
          const anchor = card.find('a[href*="مشخصات_"], a[href*="~id~"]').first().length
            ? card.find('a[href*="مشخصات_"], a[href*="~id~"]').first()
            : card.find('a').first();

          const rawTitle = anchor.attr('title') || anchor.text().trim() || card.find('.prd-name, h2, h3').text().trim();
          const href = anchor.attr('href') || '';
          if (!rawTitle || !href) return;

          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
          const priceText = card.find('.prd-price, .price-box, [class*="price"]').first().text().trim();
          const price = this.parsePrice(priceText);

          const imgEl = card.find('img').first();
          let imgSrc = imgEl.attr('data-src') || imgEl.attr('src') || '';
          if (imgSrc.startsWith('//')) {
            imgSrc = `https:${imgSrc}`;
          } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('http')) {
            imgSrc = `${this.baseUrl}${imgSrc}`;
          }

          const images = imgSrc ? [imgSrc] : [];
          const idMatch = href.match(/~id~([0-9]+)/i) || href.match(/id=([0-9]+)/i);
          const id = idMatch ? idMatch[1] : `emalls-${results.length + 1}`;
          if (seenIds.has(id)) return;
          seenIds.add(id);

          const sellerText = card.find('.seller-title, .shop-title, [class*="seller"]').first().text().trim();
          const lowerTitle = rawTitle.toLowerCase();
          const isBanned = BANNED_NON_STATIONERY_KEYWORDS.some((kw) => lowerTitle.includes(kw));
          if (isBanned) return;

          results.push({
            id,
            source: 'emalls',
            title: rawTitle,
            price,
            seller: sellerText || 'فروشندگان ایمالز',
            url: fullUrl,
            image: imgSrc,
            images,
            inStock: price > 0,
          });
        });
      }

      return results.slice(0, limit);
    }, `searchProducts(${query})`);

    const finalResults = items || [];
    emallsSearchCache.set(cacheKey, finalResults, this.cacheTtlMs);
    return finalResults;
  }
}

export const emallsApiClient = new EmallsApiClient();
