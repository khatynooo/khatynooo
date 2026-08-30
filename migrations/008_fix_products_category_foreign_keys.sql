-- =============================================================================
-- مایگریشن 008: اصلاح، ایمن‌سازی و استانداردسازی قیدهای کلید خارجی دسته‌بندی‌ها در کالاها
-- Fix and Harden Products Category Foreign Key Constraints (ON DELETE SET NULL, Auto-Heal Orphaned Keys)
-- =============================================================================

-- ۱. اطمینان از وجود دسته‌بندی‌های استاندارد پایه
INSERT INTO categories (id, name, icon, sort_order)
VALUES 
  ('cat_writing', 'نوشت‌افزار و خودکار', 'PenTool', 1),
  ('cat_notebooks', 'دفاتر و کاغذ', 'BookOpen', 2),
  ('cat_office', 'لوازم اداری و بایگانی', 'Briefcase', 3),
  ('cat_art', 'هنری، معماری و مهندسی', 'Palette', 4),
  ('cat_services', 'خدمات چاپ، کپی و صحافی', 'Printer', 5),
  ('cat_general', 'عمومی و متفرقه', 'Tag', 6)
ON CONFLICT (id) DO NOTHING;

-- ۲. اطمینان از وجود زیردسته‌های استاندارد
INSERT INTO sub_categories (id, category_id, name)
VALUES 
  ('sub_1', 'cat_writing', 'خودکار و روان‌نویس'),
  ('sub_2', 'cat_writing', 'مداد، اتود و نوک'),
  ('sub_3', 'cat_writing', 'ماژیک و هایلایتر'),
  ('sub_4', 'cat_notebooks', 'دفتر سیمی و مشق'),
  ('sub_5', 'cat_notebooks', 'کاغذ A4 و A3'),
  ('sub_6', 'cat_office', 'زونکن و پوشه'),
  ('sub_7', 'cat_office', 'منگنه، پانچ و چسب'),
  ('sub_8', 'cat_art', 'مدادرنگی و آبرنگ')
ON CONFLICT (id) DO NOTHING;

-- ۳. پاکسازی و اصلاح رکوردهای یتیم یا رشته‌های خالی در جدول products
UPDATE products
SET category_id = NULL
WHERE category_id = '' 
   OR (category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories));

UPDATE products
SET sub_category_id = NULL
WHERE sub_category_id = '' 
   OR (sub_category_id IS NOT NULL AND sub_category_id NOT IN (SELECT id FROM sub_categories));

-- ۴. بازسازی قیدهای کلید خارجی به صورت ایمن با قابلیت ON DELETE SET NULL و ON UPDATE CASCADE
DO $$
BEGIN
  -- حذف قید قدیمی دسته‌بندی در صورت وجود
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
    ALTER TABLE products DROP CONSTRAINT products_category_id_fkey;
  END IF;

  -- ایجاد قید ایمن جدید برای دسته‌بندی
  ALTER TABLE products 
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

  -- حذف قید قدیمی زیردسته در صورت وجود
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sub_category_id_fkey') THEN
    ALTER TABLE products DROP CONSTRAINT products_sub_category_id_fkey;
  END IF;

  -- ایجاد قید ایمن جدید برای زیردسته
  ALTER TABLE products 
    ADD CONSTRAINT products_sub_category_id_fkey 
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;
