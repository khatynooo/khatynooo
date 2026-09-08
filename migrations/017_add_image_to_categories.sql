-- اضافه کردن فیلد تصویر برای دسته‌بندی‌ها جهت نمایش ویترین دسته‌بندی با عکس بزرگ
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;
