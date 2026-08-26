// ==============================================================================
// لایه کشینگ درون‌حافظه‌ای با TTL و لایه کنترل نرخ درخواست (Rate Limiting)
// In-Memory TTL Cache & Sliding Window Rate Limiter
// ==============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;
  private maxItems: number;
  private hits = 0;
  private misses = 0;

  constructor(defaultTtlMinutes = 30, maxItems = 1000) {
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
    this.maxItems = maxItems;

    // پاک‌سازی دوره‌ای آیتم‌های منقضی‌شده هر ۵ دقیقه
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.pruneExpired(), 5 * 60 * 1000).unref?.();
    }
  }

  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as unknown as R;
  }

  set(key: string, data: T, ttlMs?: number): void {
    // جلوگیری از رشد نامحدود حافظه
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const duration = ttlMs || this.defaultTtlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + duration,
      createdAt: Date.now(),
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%';
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ------------------------------------------------------------------------------
// Rate Limiter ساده با پنجره متحرک (Sliding Window In-Memory Rate Limiter)
// ------------------------------------------------------------------------------
interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000).unref?.();
    }
  }

  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.requests.set(key, record);
    }

    // فیلتر کردن درخواست‌های خارج از پنجره زمانی
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0] || now;
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.requests.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.requests.delete(key);
      }
    }
  }
}

// ایجاد نمونه‌های مشترک کش
export const torobSearchCache = new MemoryCache<any>(30, 500); // ۳۰ دقیقه کش نتایج جستجوی ترب
export const digikalaSearchCache = new MemoryCache<any>(30, 500); // ۳۰ دقیقه کش دیجی‌کالا
export const categoryPriceListCache = new MemoryCache<any>(60, 50); // ۶۰ دقیقه کش دسته‌بندی ۱۱۰
export const priceHistoryCache = new MemoryCache<any>(120, 1000); // ۲ ساعت کش تاریخچه قیمت
export const inventoryAuditCache = new MemoryCache<any>(60, 20); // ۶۰ دقیقه کش نتایج دیده‌بان و اسکن انبار

