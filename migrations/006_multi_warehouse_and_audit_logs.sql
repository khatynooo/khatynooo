-- ==============================================================================
-- Migration 006: Multi-Warehouse, Inventory By Location, Transfers, Adjustments & Real Audit Logs
-- مدیریت چند-انباره، موجودی به تفکیک موقعیت، حواله انتقال بین‌انباری، اصلاح با قفل ردیف و لاگ حسابرسی
-- ==============================================================================

-- ۱. جدول انبارها و موقعیت‌های فیزیکی (Warehouses / Locations)
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'store' CHECK (type IN ('central_warehouse', 'store', 'online')),
    address TEXT,
    phone VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

-- ۲. جدول موجودی هر کالا به تفکیک انبار / شعبه (Inventory By Location)
CREATE TABLE IF NOT EXISTS inventory_by_location (
    id VARCHAR(64) PRIMARY KEY,
    warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock NUMERIC(14, 3) NOT NULL DEFAULT 0,
    min_stock_alert NUMERIC(14, 3) DEFAULT 5,
    aisle_shelf VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_product UNIQUE(warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_loc_warehouse ON inventory_by_location(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_loc_product ON inventory_by_location(product_id);

-- ۳. جدول حواله‌های انتقال کالا بین انبارها (Inventory Transfers)
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id VARCHAR(64) PRIMARY KEY,
    transfer_number VARCHAR(64) UNIQUE NOT NULL,
    from_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id),
    to_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id),
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
    transferred_by VARCHAR(64),
    user_name VARCHAR(128),
    status VARCHAR(32) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_transfer_number ON inventory_transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_product ON inventory_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_from ON inventory_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_to ON inventory_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_date ON inventory_transfers(created_at);

-- ۴. جدول تاریخچه اصلاح دستی موجودی (Inventory Adjustments)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id VARCHAR(64) REFERENCES warehouses(id),
    user_id VARCHAR(64),
    user_name VARCHAR(128),
    previous_stock NUMERIC(14, 3) NOT NULL,
    new_stock NUMERIC(14, 3) NOT NULL,
    delta NUMERIC(14, 3) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_adj_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_adj_warehouse ON inventory_adjustments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_adj_date ON inventory_adjustments(created_at);

-- ۵. جدول جامع لاگ‌های امنیتی و رویدادهای مدیریتی و حسابرسی (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    username VARCHAR(128) NOT NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(64) DEFAULT 'general',
    target_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    ip VARCHAR(64) DEFAULT '127.0.0.1',
    user_agent VARCHAR(255) DEFAULT 'System',
    status VARCHAR(32) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'warning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ۶. مقداردهی اولیه انبارهای پیش‌فرض در صورت عدم وجود (Seeding Default Warehouses)
INSERT INTO warehouses (id, name, code, type, address, phone, is_active, is_default)
VALUES 
    ('wh_central', 'انبار مرکزی و کارگاه', 'WH-CENTRAL', 'central_warehouse', 'انبار مرکزی خطی‌نو - خیابان انقلاب', '021-66990001', TRUE, TRUE),
    ('wh_shop1', 'مغازه شعبه ۱ (فروش حضوری)', 'SHOP-01', 'store', 'فروشگاه حضوری خطی‌نو - مجتمع تجاری بهار', '021-66990002', TRUE, FALSE),
    ('wh_online', 'انبار سفارشات آنلاین و ترب', 'WH-ONLINE', 'online', 'بخش پردازش و بسته‌بندی مرسولات آنلاین', '021-66990003', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ۷. مقداردهی اولیه موجودی انبار مرکزی از روی موجودی فعلی محصولات (Additive Backfill)
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
ON CONFLICT (warehouse_id, product_id) DO NOTHING;
