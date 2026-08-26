// ==============================================================================
// ماژول هوش بازار و رصد چندمنبعی قیمت (ترب، دیجی‌کالا و بنچمارک بازار تحریر)
// Multi-Source Market Intelligence Service - Facade & Entry Point
// ==============================================================================

export * from './market/types';
export * from './market/cache';
export * from './market/textMatcher';
export * from './market/imageResolver';
export * from './market/priceHistoryStore';
export * from './market/torobApiClient';
export * from './market/digikalaApiClient';
export * from './market/benchmarkCatalog';
export * from './market/marketAggregator';

// سازگاری به عقب برای توابع کمکی
import { getProductPriceHistory } from './market/priceHistoryStore';
import { PriceHistoryPoint } from './market/types';

/**
 * تولید یا بازیابی داده‌های نوسان و روند ۳۰ روز گذشته قیمت با شفافیت داده‌های تخمینی
 */
export async function generate30DayPriceHistory(
  minPrice: number,
  avgPrice: number,
  khatinooPrice?: number,
  productTitle?: string
): Promise<PriceHistoryPoint[]> {
  const result = await getProductPriceHistory(
    productTitle || 'کالای عمومی تحریر',
    minPrice,
    avgPrice,
    khatinooPrice
  );
  return result.points;
}
