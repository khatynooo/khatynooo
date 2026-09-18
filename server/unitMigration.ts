import { query, withTransaction } from './dbClient';

export interface MigrationProductPreview {
  id: string;
  name: string;
  code: string;
  currentUnit: string;
  proposedUnit: string;
  packagingUnit: string;
  packagingFactor: number;
  currentStock: number;
  proposedStock: number;
  prices: {
    buyPrice: { current: number; proposed: number };
    salePrice: { current: number; proposed: number };
    priceShop1: { current: number; proposed: number };
    priceShop2: { current: number; proposed: number };
    priceShop3: { current: number; proposed: number };
    wholesalePrice: { current: number; proposed: number };
    minAllowedPrice: { current: number; proposed: number };
  };
}

export interface UnitMigrationAnalysisResult {
  dryRun: boolean;
  totalProductsScanned: number;
  affectedCount: number;
  items: MigrationProductPreview[];
}

const CONTINUOUS_UNITS = [
  'متر',
  'سانتی‌متر',
  'سانتیمتر',
  'میلی‌متر',
  'میلی متر',
  'کیلوگرم',
  'گرم',
  'لیتر',
  'میلی‌لیتر',
  'میلی لیتر',
  'طاقه',
  'رول',
];

export function isContinuousUnit(unit?: string | null): boolean {
  if (!unit) return false;
  const clean = unit.trim().toLowerCase();
  return CONTINUOUS_UNITS.some((u) => clean === u || clean.startsWith(u));
}

const KNOWN_PACKAGING_UNITS = [
  'جین',
  'بسته',
  'کارتن',
  'جعبه',
  'دست',
  'جفت',
  'حلقه',
  'توپ',
  'بند',
  'کلاف',
  'پالت',
];

export async function analyzePackagingUnitMigration(): Promise<UnitMigrationAnalysisResult> {
  const res = await query('SELECT * FROM products ORDER BY name ASC');
  const rows = res.rows || [];

  const items: MigrationProductPreview[] = [];

  for (const p of rows) {
    const unit = (p.unit || 'عدد').trim();

    // اگر واحد کالا وزنی/طولی باشد، دست نمی‌زنیم
    if (isContinuousUnit(unit)) {
      continue;
    }

    // بررسی آیا نیاز به تبدیل دارد (واحد بسته باشد، یا قبلاً واحد غیر عدد بوده و ضریب دارد)
    const isPackagingName = KNOWN_PACKAGING_UNITS.includes(unit);
    const rawFactor = Number(p.conversion_factor || p.packaging_factor || 1);

    let factor = rawFactor;
    if (factor <= 1) {
      if (unit === 'جین') factor = 12;
      else if (unit === 'دست') factor = 6;
      else if (unit === 'جفت') factor = 2;
    }

    // اگر واحد کالا «عدد» نیست یا ضریب > 1 دارد و در حالت قدیمی بسته‌بندی بوده است
    const needsMigration = (unit !== 'عدد' && (isPackagingName || factor > 1)) || (factor > 1 && unit !== 'عدد');

    if (!needsMigration) {
      continue;
    }

    const currentStock = Number(p.stock || 0);
    const proposedStock = Math.round(currentStock * factor * 1000) / 1000;

    const currentBuy = Number(p.buy_price || 0);
    const currentSale = Number(p.sale_price || 0);
    const currentP1 = Number(p.price_shop1 || currentSale);
    const currentP2 = Number(p.price_shop2 || currentSale);
    const currentP3 = Number(p.price_shop3 || currentSale);
    const currentWholesale = Number(p.wholesale_price || 0);
    const currentMin = Number(p.min_allowed_price || 0);

    const proposedBuy = Math.round(currentBuy / factor);
    const proposedSale = Math.round(currentSale / factor);
    const proposedP1 = Math.round(currentP1 / factor);
    const proposedP2 = Math.round(currentP2 / factor);
    const proposedP3 = Math.round(currentP3 / factor);
    const proposedWholesale = Math.round(currentWholesale / factor);
    const proposedMin = Math.round(currentMin / factor);

    items.push({
      id: p.id,
      name: p.name,
      code: p.code,
      currentUnit: unit,
      proposedUnit: 'عدد',
      packagingUnit: unit,
      packagingFactor: factor,
      currentStock,
      proposedStock,
      prices: {
        buyPrice: { current: currentBuy, proposed: proposedBuy },
        salePrice: { current: currentSale, proposed: proposedSale },
        priceShop1: { current: currentP1, proposed: proposedP1 },
        priceShop2: { current: currentP2, proposed: proposedP2 },
        priceShop3: { current: currentP3, proposed: proposedP3 },
        wholesalePrice: { current: currentWholesale, proposed: proposedWholesale },
        minAllowedPrice: { current: currentMin, proposed: proposedMin },
      },
    });
  }

  return {
    dryRun: true,
    totalProductsScanned: rows.length,
    affectedCount: items.length,
    items,
  };
}

export async function executePackagingUnitMigration(
  confirmedByAdmin: boolean,
  adminInfo?: { userId?: string; username?: string }
): Promise<{
  success: boolean;
  executedAt: string;
  totalUpdated: number;
  items: MigrationProductPreview[];
}> {
  if (!confirmedByAdmin) {
    throw new Error('تأیید صریح مدیر سیستم برای اجرای واقعی مایگریشن الزامی است.');
  }

  const analysis = await analyzePackagingUnitMigration();
  if (analysis.affectedCount === 0) {
    return {
      success: true,
      executedAt: new Date().toISOString(),
      totalUpdated: 0,
      items: [],
    };
  }

  await withTransaction(async (client) => {
    for (const item of analysis.items) {
      await client.query(
        `UPDATE products
         SET 
           unit = 'عدد',
           packaging_unit = $1,
           packaging_factor = $2,
           sub_unit = $1,
           conversion_factor = $2,
           stock = $3,
           buy_price = $4,
           sale_price = $5,
           price_shop1 = $6,
           price_shop2 = $7,
           price_shop3 = $8,
           wholesale_price = $9,
           min_allowed_price = $10,
           updated_at = NOW()
         WHERE id = $11`,
        [
          item.packagingUnit,
          item.packagingFactor,
          item.proposedStock,
          item.prices.buyPrice.proposed,
          item.prices.salePrice.proposed,
          item.prices.priceShop1.proposed,
          item.prices.priceShop2.proposed,
          item.prices.priceShop3.proposed,
          item.prices.wholesalePrice.proposed,
          item.prices.minAllowedPrice.proposed,
          item.id,
        ]
      );

      // همگام‌سازی موجودی در انبار مرکزی
      await client.query(
        `UPDATE inventory_by_location
         SET stock = $1, updated_at = NOW()
         WHERE product_id = $2 AND warehouse_id = 'wh_central'`,
        [item.proposedStock, item.id]
      );
    }

    // ثبت گزارش لاگ ممیزی
    await client.query(
      `INSERT INTO audit_logs (id, user_id, username, action, module, target_id, details, status, created_at)
       VALUES ($1, $2, $3, $4, 'migration', 'packaging_units', $5, 'success', NOW())`,
      [
        `log_mig_${Date.now()}`,
        adminInfo?.userId || 'usr_admin',
        adminInfo?.username || 'مدیر سیستم',
        `مایگریشن تبدیل ${analysis.affectedCount} کالا به واحد پایه عدد و انتقال بسته‌بندی به واحد مرجع`,
        JSON.stringify({ affectedCount: analysis.affectedCount, items: analysis.items }),
      ]
    );
  });

  return {
    success: true,
    executedAt: new Date().toISOString(),
    totalUpdated: analysis.items.length,
    items: analysis.items,
  };
}
