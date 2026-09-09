-- migrations/021_invoice_drafts.sql
CREATE TABLE IF NOT EXISTS invoice_drafts (
    id VARCHAR(64) PRIMARY KEY,
    draft_type VARCHAR(20) NOT NULL CHECK (draft_type IN ('purchase', 'sales_pos')),
    created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100), -- فقط برای sales_pos: مثلاً "فاکتور معلق ۱" یا نام مشتری، برای نمایش در لیست
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_drafts_user_type ON invoice_drafts(created_by_user_id, draft_type);

-- برای فاکتور خرید فقط یک پیش‌نویس در هر لحظه برای هر کاربر مجاز است
CREATE UNIQUE INDEX IF NOT EXISTS uniq_purchase_draft_per_user
    ON invoice_drafts (created_by_user_id)
    WHERE draft_type = 'purchase';
-- برای sales_pos عمداً هیچ محدودیت Unique ای نمی‌گذاریم، چون باید بشود چند ردیف هم‌زمان داشت
