-- مایگریشن 009: افزودن فیلدهای سایز، ارتفاع، عرض و نحوه نمایش لوگو در هدر و فوتر به website_settings
ALTER TABLE website_settings
    ADD COLUMN IF NOT EXISTS logo_height INT DEFAULT 48,
    ADD COLUMN IF NOT EXISTS logo_width INT DEFAULT 48,
    ADD COLUMN IF NOT EXISTS logo_fit VARCHAR(30) DEFAULT 'contain',
    ADD COLUMN IF NOT EXISTS logo_border_radius VARCHAR(30) DEFAULT 'rounded-2xl',
    ADD COLUMN IF NOT EXISTS show_logo_text BOOLEAN DEFAULT TRUE;
