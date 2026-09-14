-- =============================================================================
-- مایگریشن شماره ۲۶: ارتقای سفارشات صحافی (فنرزنی، منگنه، جلد/جزوه) و اطلاعات وب‌اپ ایتا
-- (Spiral Binding, Stapling, Cover/Booklet, Multiple Pricing & Eitaa App Details)
-- =============================================================================

-- ۱. افزودن ستون‌های تفکیک خدمات به جدول binding_orders
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS spiral_count INT DEFAULT 0;
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS spiral_unit_price BIGINT DEFAULT 0;
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS staple_count INT DEFAULT 0;
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS staple_unit_price BIGINT DEFAULT 0;
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS cover_count INT DEFAULT 0;
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS cover_unit_price BIGINT DEFAULT 0;

-- به‌روزرسانی رکوردهای پیشین: قرار دادن book_count در spiral_count
UPDATE binding_orders
SET spiral_count = book_count, spiral_unit_price = unit_price
WHERE spiral_count = 0 AND (staple_count = 0 OR staple_count IS NULL) AND (cover_count = 0 OR cover_count IS NULL);

-- ۲. افزودن ستون‌های تنظیمات قیمت‌های تفکیکی و اطلاعات کامل لوکیشن و ساعت کاری فروشگاه
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS default_spiral_price BIGINT DEFAULT 35000;
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS default_staple_price BIGINT DEFAULT 10000;
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS default_cover_price BIGINT DEFAULT 20000;
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_postal_code VARCHAR(30) DEFAULT '';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_working_hours VARCHAR(255) DEFAULT 'شنبه تا پنج‌شنبه: ۸:۳۰ الی ۲۱:۳۰';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_map_link TEXT DEFAULT 'https://maps.google.com';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_neshan_link TEXT DEFAULT 'https://neshan.org';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_balad_link TEXT DEFAULT 'https://balad.ir';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_lat NUMERIC(10, 7) DEFAULT 35.7000;
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS store_lng NUMERIC(10, 7) DEFAULT 51.4000;

-- همگام‌سازی default_spiral_price با default_unit_price فعلی
UPDATE binding_settings
SET default_spiral_price = COALESCE(default_unit_price, 35000)
WHERE default_spiral_price IS NULL OR default_spiral_price = 0;
