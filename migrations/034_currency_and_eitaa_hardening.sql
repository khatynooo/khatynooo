-- =============================================================================
-- مایگریشن شماره ۳۴: سخت‌سازی امنیتی ماژول ایتا + پشتیبانی واحد ارز در فاکتورها و تاریخچه تصحیح قیمت
-- =============================================================================

-- ۱. ستون واحد ارز مبدأ در فاکتورهای خرید
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS source_currency VARCHAR(10) DEFAULT 'toman';

-- ۲. ستون‌های پایداری و امنیت در eitaa_identities
ALTER TABLE eitaa_identities 
ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS eitaa_delivery_blocked BOOLEAN DEFAULT FALSE;

-- ۳. ستون‌های ضد تکرار و وضعیت خوانده شدن در eitaa_messages
ALTER TABLE eitaa_messages 
ADD COLUMN IF NOT EXISTS provider_update_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_eitaa_messages_is_read ON eitaa_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_eitaa_messages_chat_created ON eitaa_messages(chat_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eitaa_messages_update_id ON eitaa_messages(provider_update_id) WHERE provider_update_id IS NOT NULL;

-- ۴. ستون رمز وب‌هوک ایتا در تنظیمات صحافی
ALTER TABLE binding_settings 
ADD COLUMN IF NOT EXISTS eitaa_webhook_secret VARCHAR(100) NULL;

-- ۵. جدول تاریخچه تصحیح دسته‌جمعی قیمت‌ها (جهت بازگردانی / Undo)
CREATE TABLE IF NOT EXISTS price_bulk_adjustments (
    id VARCHAR(100) PRIMARY KEY,
    operation VARCHAR(20) NOT NULL, -- 'divide_10' | 'multiply_10' | 'custom'
    applied_fields TEXT[] NOT NULL,
    product_ids TEXT[] NOT NULL,
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    created_by VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    undone_at TIMESTAMP WITH TIME ZONE NULL,
    undone_by VARCHAR(100) NULL
);

CREATE INDEX IF NOT EXISTS idx_price_bulk_adj_created ON price_bulk_adjustments(created_at DESC);
