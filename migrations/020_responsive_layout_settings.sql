-- migrations/020_responsive_layout_settings.sql
-- افزودن ستون responsive_layout برای تفکیک تنظیمات چیدمان و اندازه‌های واکنش‌گرا (دسکتاپ، تبلت، موبایل با واحد اندازه‌گیری)
ALTER TABLE website_settings
    ADD COLUMN IF NOT EXISTS responsive_layout JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN website_settings.responsive_layout IS
  'تنظیمات چیدمان جدا برای هر دستگاه: { "desktop": {...}, "tablet": {...}, "mobile": {...} }. هر مقدار اندازه به‌صورت { "value": number, "unit": "px" | "rem" | "%" | "vw" | "vh" } ذخیره می‌شود.';
