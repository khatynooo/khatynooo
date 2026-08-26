// ==============================================================================
// ذخیره‌سازی و بازیابی پایدار تاریخچه واقعی قیمت‌ها در PostgreSQL و برآورد آماری روندهای بازار
// Persistent Real Price Snapshot Store & Statistical Trend Engine
// ==============================================================================

import { PriceHistoryPoint, PriceHistoryMetadata } from './types';
import { normalizePersianText } from './textMatcher';
import { query } from '../dbClient';

export interface PriceSnapshotRecord {
  id?: string;
  productKey: string;
  productTitle: string;
  torobMinPrice: number;
  digikalaPrice: number;
  marketAvgPrice: number;
  khatinooPrice: number;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
}

/**
 * کلید یکتای نرمال‌شده برای ذخیره تاریخچه قیمت
 */
export function generateProductPriceKey(title: string): string {
  return normalizePersianText(title)
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * ذخیره پایدار یک نقطه قیمت واقعی در PostgreSQL پس از استعلام موفق از ترب/دیجی‌کالا
 */
export async function recordPriceSnapshot(
  title: string,
  torobMinPrice: number,
  marketAvgPrice: number,
  digikalaPrice?: number,
  khatinooPrice?: number
): Promise<void> {
  if (!title || (!torobMinPrice && !marketAvgPrice)) return;

  const key = generateProductPriceKey(title);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const minP = Math.round(torobMinPrice || 0);
  const avgP = Math.round(marketAvgPrice || torobMinPrice || 0);
  const digiP = Math.round(digikalaPrice || marketAvgPrice || torobMinPrice || 0);
  const khatinooP = Math.round(khatinooPrice || torobMinPrice * 0.98 || 0);

  try {
    await query(
      `INSERT INTO market_price_snapshots (
         product_key, product_title, torob_min_price, digikala_price, market_avg_price, khatinoo_price, date_str
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (product_key, date_str) DO UPDATE SET
         torob_min_price = EXCLUDED.torob_min_price,
         digikala_price = EXCLUDED.digikala_price,
         market_avg_price = EXCLUDED.market_avg_price,
         khatinoo_price = EXCLUDED.khatinoo_price,
         product_title = EXCLUDED.product_title`,
      [key, title, minP, digiP, avgP, khatinooP, dateStr]
    );
  } catch (err: any) {
    console.warn(`⚠️ [PriceSnapshot DB Warning] ثبت اسنپ‌شات قیمت برای «${title}» با خطا مواجه شد:`, err.message);
  }
}

/**
 * دریافت تاریخچه پایدار ۳۰ روزه قیمت از PostgreSQL
 * - اگر اسنپ‌شات‌های واقعی کافی در دسترس باشد: بازگرداندن داده‌های واقعی از دیتابیس با برچسب isEstimated: false
 * - اگر اسنپ‌شات واقعی در دیتابیس کمتر از ۷ نقطه باشد: ترکیب داده‌های واقعی ذخیره‌شده با برآورد آماری و درج صریح برچسب isEstimated: true
 */
export async function getProductPriceHistory(
  productTitle: string,
  currentMinPrice: number,
  currentAvgPrice: number,
  currentKhatinooPrice?: number
): Promise<{ points: PriceHistoryPoint[]; metadata: PriceHistoryMetadata }> {
  const key = generateProductPriceKey(productTitle);

  const baseMin = currentMinPrice || 50000;
  const baseAvg = currentAvgPrice || Math.round(baseMin * 1.15);
  const baseKhatinoo = currentKhatinooPrice || Math.round(baseMin * 0.98);

  // ثبت قیمت فعلی به عنوان اسنپ‌شات امروز در دیتابیس
  await recordPriceSnapshot(productTitle, baseMin, baseAvg, currentAvgPrice, baseKhatinoo);

  let realSnapshots: PriceSnapshotRecord[] = [];
  try {
    const res = await query(
      `SELECT id, product_key AS "productKey", product_title AS "productTitle", 
              torob_min_price AS "torobMinPrice", digikala_price AS "digikalaPrice", 
              market_avg_price AS "marketAvgPrice", khatinoo_price AS "khatinooPrice", 
              date_str AS "dateStr", created_at AS "createdAt"
       FROM market_price_snapshots
       WHERE product_key = $1
       ORDER BY date_str ASC
       LIMIT 60`,
      [key]
    );

    if (res && res.rows && res.rows.length > 0) {
      realSnapshots = res.rows.map((r: any) => ({
        id: r.id ? String(r.id) : undefined,
        productKey: r.productKey,
        productTitle: r.productTitle,
        torobMinPrice: Number(r.torobMinPrice) || 0,
        digikalaPrice: Number(r.digikalaPrice) || 0,
        marketAvgPrice: Number(r.marketAvgPrice) || 0,
        khatinooPrice: Number(r.khatinooPrice) || 0,
        dateStr: r.dateStr,
        timestamp: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
      }));
    }
  } catch (err: any) {
    console.warn(`⚠️ [PriceHistory DB Warning] واکشی تاریخچه قیمت از دیتابیس برای «${productTitle}» ناموفق بود:`, err.message);
  }

  // اگر حداقل ۷ نقطه زمانی واقعی ثبت شده بود، نمودار تماماً واقعی بازگردانده می‌شود
  if (realSnapshots.length >= 7) {
    const points: PriceHistoryPoint[] = realSnapshots
      .slice(-30)
      .map((s) => {
        const snapshotDate = new Date(s.dateStr);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - snapshotDate.getTime());
        const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const dayLabel = daysAgo === 0 ? 'امروز' : `${daysAgo} روز پیش`;
        return {
          date: s.dateStr,
          dayLabel,
          torobMinPrice: s.torobMinPrice,
          digikalaPrice: s.digikalaPrice,
          marketAvgPrice: s.marketAvgPrice,
          khatinooPrice: s.khatinooPrice,
          isEstimated: false,
          source: 'ثبت واقعی در دیتابیس خطی‌نو',
        };
      });

    return {
      points,
      metadata: {
        isFullyReal: true,
        realPointsCount: points.length,
        totalPointsCount: points.length,
        firstRecordedDate: realSnapshots[0]?.dateStr,
        lastRecordedDate: realSnapshots[realSnapshots.length - 1]?.dateStr,
      },
    };
  }

  // در صورتی که داده‌های تاریخی هنوز در دیتابیس انباشته نشده باشند،
  // برآورد آماری بر اساس کشش فصلی با شفافیت کامل به کاربر نمایش داده می‌شود:
  const dayOffsets = [30, 25, 20, 15, 10, 7, 5, 3, 2, 1, 0];
  const points: PriceHistoryPoint[] = [];

  for (let i = 0; i < dayOffsets.length; i++) {
    const daysAgo = dayOffsets[i];
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const dateStr = dateObj.toISOString().split('T')[0];

    // بررسی آیا برای این تاریخ اسنپ‌شات واقعی داریم
    const realForDay = realSnapshots.find((s) => s.dateStr === dateStr);

    if (realForDay) {
      points.push({
        date: dateStr,
        dayLabel: daysAgo === 0 ? 'امروز' : `${daysAgo} روز پیش`,
        torobMinPrice: realForDay.torobMinPrice,
        digikalaPrice: realForDay.digikalaPrice,
        marketAvgPrice: realForDay.marketAvgPrice,
        khatinooPrice: realForDay.khatinooPrice,
        isEstimated: false,
        source: 'استعلام واقعی در دیتابیس',
      });
    } else {
      // شیب استاندارد نوسان نرخ تورم و کشش بازار نوشت‌افزار
      const seasonalTrend = 1 - (daysAgo * 0.0025);
      const torobPoint = Math.round((baseMin * seasonalTrend) / 500) * 500;
      const digiPoint = Math.round(((baseAvg * 1.05) * seasonalTrend) / 500) * 500;
      const avgPoint = Math.round((baseAvg * seasonalTrend) / 500) * 500;
      const khatinooPoint = daysAgo === 0 ? baseKhatinoo : Math.round((baseKhatinoo * (1 - daysAgo * 0.002)) / 500) * 500;

      points.push({
        date: dateStr,
        dayLabel: daysAgo === 0 ? 'امروز' : `${daysAgo} روز پیش`,
        torobMinPrice: torobPoint,
        digikalaPrice: digiPoint,
        marketAvgPrice: avgPoint,
        khatinooPrice: khatinooPoint,
        isEstimated: true,
        source: 'برآورد آماری بر مبنای کشش میانگین صنف تحریر',
      });
    }
  }

  return {
    points,
    metadata: {
      isFullyReal: false,
      realPointsCount: realSnapshots.length,
      totalPointsCount: points.length,
      estimationNotice: 'بخشی از نقاط تاریخی به دلیل عدم وجود سابقه ۳۰ روزه در دیتابیس به صورت برآورد آماری کشش بازار محاسبه شده است.',
    },
  };
}
