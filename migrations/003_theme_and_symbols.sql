-- مایگریشن 003: افزودن فیلدهای شخصی‌سازی ظاهر، تم دکمه‌ها، نحوه نمایش و نمادها به website_settings
ALTER TABLE website_settings
    ADD COLUMN IF NOT EXISTS button_color_theme VARCHAR(50) DEFAULT 'gold',
    ADD COLUMN IF NOT EXISTS primary_color_hex VARCHAR(20) DEFAULT '#C9A227',
    ADD COLUMN IF NOT EXISTS button_border_radius VARCHAR(20) DEFAULT 'rounded-xl',
    ADD COLUMN IF NOT EXISTS catalog_layout_mode VARCHAR(20) DEFAULT 'grid',
    ADD COLUMN IF NOT EXISTS show_product_badges BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS custom_badges JSONB,
    ADD COLUMN IF NOT EXISTS custom_symbols JSONB,
    ADD COLUMN IF NOT EXISTS header_layout_style VARCHAR(30) DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS footer_layout_style VARCHAR(30) DEFAULT 'default';
