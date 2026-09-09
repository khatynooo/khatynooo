-- مهاجرت ۱۹: ایجاد جدول دائمی تنظیمات درگاه پیامک و الگوهای خدماتی (SMS Gateway Config)
CREATE TABLE IF NOT EXISTS sms_gateway_config (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    provider VARCHAR(50) NOT NULL DEFAULT 'kavenegar',
    api_key TEXT,
    sender_number VARCHAR(50),
    is_enabled BOOLEAN DEFAULT TRUE,
    pattern_order_placed VARCHAR(100) DEFAULT 'khatinoo-order-placed',
    pattern_order_shipped VARCHAR(100) DEFAULT 'khatinoo-order-shipped',
    pattern_otp VARCHAR(100) DEFAULT 'khatinoo-otp-auth',
    low_stock_alert_mobile VARCHAR(50) DEFAULT '09131234567',
    is_simulated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- درج ردیف پیش‌فرض اولیه در صورت عدم وجود (Seed)
INSERT INTO sms_gateway_config (
    id,
    provider,
    api_key,
    sender_number,
    is_enabled,
    pattern_order_placed,
    pattern_order_shipped,
    pattern_otp,
    low_stock_alert_mobile,
    is_simulated
) VALUES (
    'default',
    'kavenegar',
    NULL,
    '10008585',
    TRUE,
    'khatinoo-order-placed',
    'khatinoo-order-shipped',
    'khatinoo-otp-auth',
    '09131234567',
    FALSE
)
ON CONFLICT (id) DO NOTHING;
