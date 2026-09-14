-- =============================================================================
-- مایگریشن شماره ۲۷: اتصال خودکار برنامک ایتا به سیستم و ذخیره خودکار chat_id مشتری
-- (Eitaa Mini App Auto-Sync, chat_id Storage & Professional Order Tracking)
-- =============================================================================

-- ۱. ارتقای جدول eitaa_customer_chats جهت پذیرش ورودی بدون شماره موبایل اولیه
-- برداشتن قید PRIMARY KEY قدیمی از روی mobile در صورت وجود
ALTER TABLE eitaa_customer_chats DROP CONSTRAINT IF EXISTS eitaa_customer_chats_pkey;

ALTER TABLE eitaa_customer_chats ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE eitaa_customer_chats ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'mini_app';
ALTER TABLE eitaa_customer_chats ADD COLUMN IF NOT EXISTS receipt_codes TEXT[] DEFAULT '{}';
ALTER TABLE eitaa_customer_chats ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ایجاد ایندکس یکتا روی chat_id تا برای هر کاربر ایتا یک رکورد معتبر داشته باشیم
CREATE UNIQUE INDEX IF NOT EXISTS idx_eitaa_chats_chat_id_unique ON eitaa_customer_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_chats_mobile ON eitaa_customer_chats(mobile);

-- ۲. افزودن ستون customer_eitaa_chat_id به جدول binding_orders جهت اتصال مستقیم
ALTER TABLE binding_orders ADD COLUMN IF NOT EXISTS customer_eitaa_chat_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_binding_orders_chat_id ON binding_orders(customer_eitaa_chat_id);

-- ۳. افزودن آدرس برنامک ایتا به تنظیمات فروشگاه
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS eitaa_bot_app_url VARCHAR(255) DEFAULT 'https://eitaa.com/khatynoo_app/fanar';
ALTER TABLE binding_settings ADD COLUMN IF NOT EXISTS eitaa_bot_username VARCHAR(100) DEFAULT 'khatynoo_app';

UPDATE binding_settings
SET eitaa_bot_app_url = 'https://eitaa.com/khatynoo_app/fanar',
    eitaa_bot_username = 'khatynoo_app'
WHERE eitaa_bot_app_url IS NULL OR eitaa_bot_app_url = '';
