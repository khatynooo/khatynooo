-- =============================================================================
-- مایگریشن شماره ۳۶: تفکیک واحد بسته‌بندی مرجع از واحد فروش و قیمت‌گذاری پایه (عدد)
-- =============================================================================

-- ۱. افزودن ستون‌های packaging_unit و packaging_factor به جدول کالاها
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS packaging_factor NUMERIC(12, 3) DEFAULT 1.0;

-- ۲. همگام‌سازی اولیه از مقادیر پیشین (در صورت وجود sub_unit یا conversion_factor)
UPDATE products
SET 
  packaging_unit = COALESCE(packaging_unit, sub_unit),
  packaging_factor = COALESCE(packaging_factor, conversion_factor, 1.0)
WHERE packaging_unit IS NULL AND sub_unit IS NOT NULL;

-- ۳. ایجاد شاخص برای جستجوی سریع واحدهای بسته‌بندی
CREATE INDEX IF NOT EXISTS idx_products_packaging_unit ON products(packaging_unit);
