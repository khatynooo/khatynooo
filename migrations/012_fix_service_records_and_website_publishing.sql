-- =============================================================================
-- مایگریشن 012: رفع خطای customer_name در service_records و فیلدهای ارسال به سایت
-- =============================================================================

-- ۱. اجازه دادن به null بودن customer_name یا تعیین پیش‌فرض در service_records
ALTER TABLE service_records ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE service_records ALTER COLUMN customer_name SET DEFAULT 'مشتری عمومی / حضوری';

-- در صورت وجود رکوردهایی با customer_name خالی
UPDATE service_records SET customer_name = 'مشتری عمومی / حضوری' WHERE customer_name IS NULL OR customer_name = '';

-- ۲. افزودن فیلدهای نمایش در سایت / فقط حسابداری به جداول محصولات و خدمات
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS only_accounting BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT FALSE;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS only_accounting BOOLEAN DEFAULT TRUE;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE service_presets ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]'::jsonb;

-- ۳. ارتقای جدول users جهت اطمینان از ذخیره کامل اطلاعات و فیلدهای تغییر رمز
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
