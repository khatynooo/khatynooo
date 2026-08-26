-- =============================================================================
-- Migration 004: Market Price Snapshots (جدول ثبت پایدار تاریخچه قیمت‌ها در بازار)
-- پایگاه داده خطی‌نو: ذخیره دائمی اسنپ‌شات‌های روزانه استعلام قیمت ترب، دیجی‌کالا و خطی‌نو
-- =============================================================================

CREATE TABLE IF NOT EXISTS market_price_snapshots (
    id SERIAL PRIMARY KEY,
    product_key VARCHAR(255) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    torob_min_price INTEGER DEFAULT 0,
    digikala_price INTEGER DEFAULT 0,
    market_avg_price INTEGER DEFAULT 0,
    khatinoo_price INTEGER DEFAULT 0,
    date_str VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_key_date UNIQUE (product_key, date_str)
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_key ON market_price_snapshots(product_key);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_date ON market_price_snapshots(date_str);
