-- مایگریشن 010: افزودن فیلد JSONB برای مدیریت داینامیک، فعال/غیرفعال، ویرایش، اضافه کردن و جابجایی دکمه‌ها و عناصر هدر
ALTER TABLE website_settings
    ADD COLUMN IF NOT EXISTS header_elements JSONB;
