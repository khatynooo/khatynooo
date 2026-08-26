-- =============================================================================
-- Migration 002: Customer Profile Enhancement & Online Orders Linking
-- ارتقای فیلدهای آدرس دقیق، کدپستی، استان، شهر و ایمیل مشتری و اتصال سفارش آنلاین
-- =============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS province VARCHAR(60);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(60);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_purchase_amount BIGINT DEFAULT 0;

ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64);
