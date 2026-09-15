-- =============================================================================
-- مایگریشن شماره ۲۹: سیستم یکپارچه هویت مخاطبین ایتا، صندوق پیام CRM و لاگ پیام‌ها
-- (Eitaa Identity CRM, Chat ID Primary Key, Message History & Outbox Delivery Engine)
-- =============================================================================

-- ۱. جدول هویت مخاطبین ایتا (Eitaa CRM Identities - با اولویت قطعی chat_id به عنوان کلید یکتا)
CREATE TABLE IF NOT EXISTS eitaa_identities (
    id VARCHAR(64) PRIMARY KEY,
    chat_id VARCHAR(100) UNIQUE NOT NULL,
    eitaa_user_id VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100),
    mobile VARCHAR(30),
    language_code VARCHAR(10) DEFAULT 'fa',
    source VARCHAR(50) DEFAULT 'mini_app', -- 'mini_app' | 'bot_direct' | 'admin_manual' | 'order_checkout'
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'blocked'
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_codes TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eitaa_identities_chat_id ON eitaa_identities(chat_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_mobile ON eitaa_identities(mobile);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_customer_id ON eitaa_identities(customer_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_user_id ON eitaa_identities(eitaa_user_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_username ON eitaa_identities(username);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_status ON eitaa_identities(status);
CREATE INDEX IF NOT EXISTS idx_eitaa_identities_last_seen ON eitaa_identities(last_seen_at DESC);

-- ۲. بک‌فیل و انتقال داده‌های جدول قبلی eitaa_customer_chats به جدول جدید با حفظ یکتایی chat_id
INSERT INTO eitaa_identities (
    id, chat_id, eitaa_user_id, first_name, username, mobile, source, receipt_codes, first_seen_at, last_seen_at
)
SELECT 
    'eitaa_id_' || MD5(chat_id::text),
    chat_id,
    eitaa_user_id,
    first_name,
    username,
    CASE 
        WHEN mobile LIKE 'eitaa_%' OR mobile LIKE 'temp_%' THEN NULL 
        ELSE mobile 
    END,
    COALESCE(source, 'mini_app'),
    COALESCE(receipt_codes, '{}'),
    COALESCE(created_at, CURRENT_TIMESTAMP),
    COALESCE(last_seen, CURRENT_TIMESTAMP)
FROM eitaa_customer_chats
WHERE chat_id IS NOT NULL AND chat_id <> ''
ON CONFLICT (chat_id) DO UPDATE SET
    mobile = EXCLUDED.mobile,
    first_name = EXCLUDED.first_name,
    username = EXCLUDED.username,
    last_seen_at = EXCLUDED.last_seen_at;

-- پیوند خودکار هویت‌های ایتا با جدول مشتریان سیستم بر اساس شماره موبایل بدون ایجاد رکورد تکراری
UPDATE eitaa_identities
SET customer_id = c.id
FROM customers c
WHERE eitaa_identities.mobile IS NOT NULL 
  AND eitaa_identities.customer_id IS NULL
  AND (c.mobile = eitaa_identities.mobile OR c.mobile = '0' || eitaa_identities.mobile OR '0' || c.mobile = eitaa_identities.mobile);

-- ۳. جدول تاریخچه و صف ارسال پیام‌های ایتا (Eitaa Message Logs & CRM Outbox)
CREATE TABLE IF NOT EXISTS eitaa_messages (
    id VARCHAR(64) PRIMARY KEY,
    identity_id VARCHAR(64) REFERENCES eitaa_identities(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    eitaa_user_id VARCHAR(100),
    chat_id VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'outgoing', -- 'incoming' | 'outgoing'
    message_title VARCHAR(200),
    message_text TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'queued', -- 'queued' | 'sending' | 'sent' | 'failed' | 'retrying'
    provider VARCHAR(50) DEFAULT 'eitaayar',
    provider_message_id VARCHAR(100),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_code VARCHAR(50),
    error_message TEXT,
    http_status INT,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eitaa_messages_chat_id ON eitaa_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_messages_status ON eitaa_messages(status);
CREATE INDEX IF NOT EXISTS idx_eitaa_messages_created_at ON eitaa_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eitaa_messages_customer_id ON eitaa_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_messages_identity_id ON eitaa_messages(identity_id);
