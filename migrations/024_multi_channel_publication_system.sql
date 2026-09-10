-- =============================================================================
-- مایگریشن شماره ۲۴: سیستم انتشار چندکاناله کالا در پیام‌رسان‌ها و وب‌سایت
-- (Multi-Channel Publication System: Eitaa, Bale, Telegram, Instagram, Website)
-- =============================================================================

-- ۱. جدول کانال‌های انتشار و درگاه‌های متصل
CREATE TABLE IF NOT EXISTS publication_channels (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pub_channels_provider ON publication_channels(provider);
CREATE INDEX IF NOT EXISTS idx_pub_channels_enabled ON publication_channels(enabled);

-- ۲. جدول رویدادها و صف تراکنشی انتشار محصولات (Transactional Outbox & History)
CREATE TABLE IF NOT EXISTS product_publications (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    channel_id VARCHAR(64) REFERENCES publication_channels(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    idempotency_key VARCHAR(255) UNIQUE,
    message_id VARCHAR(255),
    external_url TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code VARCHAR(100),
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_pub_product ON product_publications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pub_channel ON product_publications(channel_id);
CREATE INDEX IF NOT EXISTS idx_product_pub_status ON product_publications(status);
CREATE INDEX IF NOT EXISTS idx_product_pub_created ON product_publications(created_at DESC);

-- ۳. جدول تنظیمات سراسری انتشار خودکار (Automatic Triggers & General Config)
CREATE TABLE IF NOT EXISTS publication_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    publish_on_create BOOLEAN DEFAULT FALSE,
    publish_on_update BOOLEAN DEFAULT FALSE,
    publish_on_price_change BOOLEAN DEFAULT FALSE,
    publish_on_restock BOOLEAN DEFAULT FALSE,
    send_image_by_default BOOLEAN DEFAULT TRUE,
    generate_hashtags_by_default BOOLEAN DEFAULT TRUE,
    default_template TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- درج داده‌های پایه کانال‌های پیش‌فرض
INSERT INTO publication_channels (id, provider, name, enabled, config)
VALUES 
    ('pub_chan_website', 'website', 'ویترین فروشگاه اینترنتی خطی‌نو', TRUE, '{"autoPublish": true}'::jsonb),
    ('pub_chan_eitaa', 'eitaa', 'کانال ایتا خطی‌نو', FALSE, '{"autoPublish": false}'::jsonb),
    ('pub_chan_bale', 'bale', 'کانال پیام‌رسان بله خطی‌نو', FALSE, '{"autoPublish": false}'::jsonb),
    ('pub_chan_telegram', 'telegram', 'کانال تلگرام خطی‌نو', FALSE, '{"autoPublish": false}'::jsonb),
    ('pub_chan_instagram', 'instagram', 'صفحه اینستاگرام تجاری خطی‌نو', FALSE, '{"autoPublish": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- درج تنظیمات سراسری پیش‌فرض
INSERT INTO publication_settings (
    id,
    publish_on_create,
    publish_on_update,
    publish_on_price_change,
    publish_on_restock,
    send_image_by_default,
    generate_hashtags_by_default,
    default_template
)
VALUES (
    'default',
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    '📦 {{name}}\n💰 قیمت: {{salePrice}} تومان\n📦 موجودی: {{stock}}\n🏷 دسته: {{category}}\n\n📝 {{description}}\n\n{{hashtags}}\n\n{{productUrl}}'
)
ON CONFLICT (id) DO NOTHING;
