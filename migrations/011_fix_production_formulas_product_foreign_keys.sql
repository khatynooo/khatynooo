-- =============================================================================
-- مایگریشن 011: رفع خطای قیدهای کلید خارجی در جدول فرمولاسیون و اجرای تولید (production_formulas & production_runs)
-- Fix and Harden Production Formulas, Runs and Inventory Foreign Keys (ON DELETE SET NULL / CASCADE, ON UPDATE CASCADE)
-- =============================================================================

-- ۱. پاکسازی مقادیر خالی یا نامعتبر (Orphaned Keys) در جدول production_formulas
UPDATE production_formulas
SET output_product_id = NULL
WHERE output_product_id = '' 
   OR (output_product_id IS NOT NULL AND output_product_id NOT IN (SELECT id FROM products));

-- ۲. پاکسازی مقادیر خالی یا نامعتبر در جدول production_runs
UPDATE production_runs
SET output_product_id = NULL
WHERE output_product_id = '' 
   OR (output_product_id IS NOT NULL AND output_product_id NOT IN (SELECT id FROM products));

UPDATE production_runs
SET formula_id = NULL
WHERE formula_id = '' 
   OR (formula_id IS NOT NULL AND formula_id NOT IN (SELECT id FROM production_formulas));

UPDATE production_runs
SET user_id = NULL
WHERE user_id = '' 
   OR (user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users));

-- ۳. پاکسازی مقادیر نامعتبر در حواله‌های انبارداری (inventory_transfers)
DELETE FROM inventory_transfers
WHERE product_id NOT IN (SELECT id FROM products);

-- ۴. اصلاح و بازسازی قیدهای کلید خارجی در جدول production_formulas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_formulas_output_product_id_fkey') THEN
    ALTER TABLE production_formulas DROP CONSTRAINT production_formulas_output_product_id_fkey;
  END IF;

  ALTER TABLE production_formulas
    ADD CONSTRAINT production_formulas_output_product_id_fkey
    FOREIGN KEY (output_product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- ۵. اصلاح و بازسازی قیدهای کلید خارجی در جدول production_runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_runs_formula_id_fkey') THEN
    ALTER TABLE production_runs DROP CONSTRAINT production_runs_formula_id_fkey;
  END IF;

  ALTER TABLE production_runs
    ADD CONSTRAINT production_runs_formula_id_fkey
    FOREIGN KEY (formula_id) REFERENCES production_formulas(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_runs_output_product_id_fkey') THEN
    ALTER TABLE production_runs DROP CONSTRAINT production_runs_output_product_id_fkey;
  END IF;

  ALTER TABLE production_runs
    ADD CONSTRAINT production_runs_output_product_id_fkey
    FOREIGN KEY (output_product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_runs_user_id_fkey') THEN
    ALTER TABLE production_runs DROP CONSTRAINT production_runs_user_id_fkey;
  END IF;

  ALTER TABLE production_runs
    ADD CONSTRAINT production_runs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- ۶. اصلاح و بازسازی قیدهای کلید خارجی در جدول inventory_transfers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transfers_product_id_fkey') THEN
    ALTER TABLE inventory_transfers DROP CONSTRAINT inventory_transfers_product_id_fkey;
  END IF;

  ALTER TABLE inventory_transfers
    ADD CONSTRAINT inventory_transfers_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transfers_from_warehouse_id_fkey') THEN
    ALTER TABLE inventory_transfers DROP CONSTRAINT inventory_transfers_from_warehouse_id_fkey;
  END IF;

  ALTER TABLE inventory_transfers
    ADD CONSTRAINT inventory_transfers_from_warehouse_id_fkey
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transfers_to_warehouse_id_fkey') THEN
    ALTER TABLE inventory_transfers DROP CONSTRAINT inventory_transfers_to_warehouse_id_fkey;
  END IF;

  ALTER TABLE inventory_transfers
    ADD CONSTRAINT inventory_transfers_to_warehouse_id_fkey
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

-- ۷. اصلاح و بازسازی قیدهای کلید خارجی در جدول inventory_adjustments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_adjustments_product_id_fkey') THEN
    ALTER TABLE inventory_adjustments DROP CONSTRAINT inventory_adjustments_product_id_fkey;
  END IF;

  ALTER TABLE inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_adjustments_warehouse_id_fkey') THEN
    ALTER TABLE inventory_adjustments DROP CONSTRAINT inventory_adjustments_warehouse_id_fkey;
  END IF;

  ALTER TABLE inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- ۸. اصلاح و بازسازی قیدهای کلید خارجی در جدول inventory_by_location
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_by_location_product_id_fkey') THEN
    ALTER TABLE inventory_by_location DROP CONSTRAINT inventory_by_location_product_id_fkey;
  END IF;

  ALTER TABLE inventory_by_location
    ADD CONSTRAINT inventory_by_location_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_by_location_warehouse_id_fkey') THEN
    ALTER TABLE inventory_by_location DROP CONSTRAINT inventory_by_location_warehouse_id_fkey;
  END IF;

  ALTER TABLE inventory_by_location
    ADD CONSTRAINT inventory_by_location_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
END $$;
