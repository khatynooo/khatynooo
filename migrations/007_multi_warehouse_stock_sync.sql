-- ==============================================================================
-- Migration 007: Multi-Warehouse Stock Sync, Triggers & Invariants
-- ==============================================================================

-- ۱. افزودن ستون warehouse_id به جداول فاکتورها و سفارشات در صورت عدم وجود (Additive)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_invoices' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE sales_invoices ADD COLUMN warehouse_id VARCHAR(64) REFERENCES warehouses(id) DEFAULT 'wh_central';
        CREATE INDEX IF NOT EXISTS idx_sales_invoices_wh ON sales_invoices(warehouse_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_invoices' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE purchase_invoices ADD COLUMN warehouse_id VARCHAR(64) REFERENCES warehouses(id) DEFAULT 'wh_central';
        CREATE INDEX IF NOT EXISTS idx_purchase_invoices_wh ON purchase_invoices(warehouse_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'online_orders' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE online_orders ADD COLUMN warehouse_id VARCHAR(64) REFERENCES warehouses(id) DEFAULT 'wh_online';
        CREATE INDEX IF NOT EXISTS idx_online_orders_wh ON online_orders(warehouse_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'production_runs' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE production_runs ADD COLUMN warehouse_id VARCHAR(64) REFERENCES warehouses(id) DEFAULT 'wh_central';
        CREATE INDEX IF NOT EXISTS idx_production_runs_wh ON production_runs(warehouse_id);
    END IF;
END $$;

-- ۲. تابع تریگر برای محاسبه و همگام‌سازی خودکار ستون products.stock بر اساس SUM(inventory_by_location.stock)
CREATE OR REPLACE FUNCTION fn_sync_product_stock_from_inventory()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id VARCHAR(64);
    calculated_total_stock NUMERIC(14, 3);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;

    -- محاسبه مجموع موجودی تمام موقعیت‌ها/انبارهای این کالا
    SELECT COALESCE(SUM(stock), 0)
    INTO calculated_total_stock
    FROM inventory_by_location
    WHERE product_id = target_product_id;

    -- به‌روزرسانی ردیف کالا
    UPDATE products
    SET stock = calculated_total_stock,
        updated_at = NOW()
    WHERE id = target_product_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ۳. ایجاد تریگر روی جدول inventory_by_location
DROP TRIGGER IF EXISTS trg_sync_product_stock_from_inventory ON inventory_by_location;

CREATE TRIGGER trg_sync_product_stock_from_inventory
AFTER INSERT OR UPDATE OR DELETE ON inventory_by_location
FOR EACH ROW
EXECUTE FUNCTION fn_sync_product_stock_from_inventory();

-- ۴. اطمینان از وجود ردیف موجودی برای تمام کالاهای موجود در انبار مرکزی (Backfill Invariant)
INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
SELECT
    'invloc_' || p.id || '_wh_central',
    'wh_central',
    p.id,
    COALESCE(p.stock, 0),
    COALESCE(p.min_stock_alert, 5),
    'قفسه مرکزی',
    NOW()
FROM products p
ON CONFLICT (warehouse_id, product_id)
DO UPDATE SET
    stock = CASE
        WHEN (SELECT COUNT(*) FROM inventory_by_location WHERE product_id = EXCLUDED.product_id) = 1
        THEN EXCLUDED.stock
        ELSE inventory_by_location.stock
    END,
    updated_at = NOW();

-- ۵. همگام‌سازی نهایی products.stock بر اساس تجمیع کل تمام انبارها
UPDATE products p
SET stock = COALESCE((
    SELECT SUM(stock)
    FROM inventory_by_location
    WHERE product_id = p.id
), 0),
updated_at = NOW();
