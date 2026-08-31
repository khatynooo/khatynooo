-- =============================================================================
-- مایگریشن 014: ارتقای چند قیمتی خدمات کپی و پرینت (یک‌رو دو قیمت، دورو دو قیمت)، تفکیک کانال و مدیریت CRUD
-- =============================================================================

ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS price_single1 BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS price_single2 BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS price_double1 BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS price_double2 BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS binding_spiral_price BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS binding_hardcover_price BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS binding_cellophane_price BIGINT DEFAULT 0;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS volume_discount_threshold INT DEFAULT 50;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS volume_discount_percent INT DEFAULT 10;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) DEFAULT 'both';

-- مقداردهی اولیه قیمت‌ها برای ردیف‌های موجود بر اساس قیمت پایه
UPDATE service_presets 
SET 
  price_single1 = CASE WHEN price_single1 = 0 OR price_single1 IS NULL THEN price ELSE price_single1 END,
  price_single2 = CASE WHEN price_single2 = 0 OR price_single2 IS NULL THEN ROUND(price * 0.85) ELSE price_single2 END,
  price_double1 = CASE WHEN price_double1 = 0 OR price_double1 IS NULL THEN ROUND(price * 1.6) ELSE price_double1 END,
  price_double2 = CASE WHEN price_double2 = 0 OR price_double2 IS NULL THEN ROUND(price * 1.35) ELSE price_double2 END,
  binding_spiral_price = CASE WHEN binding_spiral_price = 0 OR binding_spiral_price IS NULL THEN 35000 ELSE binding_spiral_price END,
  binding_hardcover_price = CASE WHEN binding_hardcover_price = 0 OR binding_hardcover_price IS NULL THEN 85000 ELSE binding_hardcover_price END,
  binding_cellophane_price = CASE WHEN binding_cellophane_price = 0 OR binding_cellophane_price IS NULL THEN 15000 ELSE binding_cellophane_price END,
  visibility = CASE 
    WHEN only_accounting = TRUE AND (show_on_website = FALSE OR show_on_website IS NULL) THEN 'only_accounting'
    WHEN show_on_website = TRUE AND show_in_pos = FALSE THEN 'only_website'
    ELSE 'both'
  END
WHERE price_single1 = 0 OR price_single1 IS NULL;
