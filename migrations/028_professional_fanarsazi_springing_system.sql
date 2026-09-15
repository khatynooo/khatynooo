-- =============================================================================
-- مایگریشن شماره ۲۸: سیستم جامع مدیریت عملیات فنرزنی، مصرف مواد، کنترل کیفیت و بهای تمام‌شده
-- (Professional Springing/Fanarsazi Operations, BOM Consumables, QC & Costing System)
-- =============================================================================

-- ۱. سکوئنس شماره عملیات فنرزنی
CREATE SEQUENCE IF NOT EXISTS springing_op_seq START WITH 1001 INCREMENT BY 1;

-- ۲. جدول ایستگاه‌ها و دستگاه‌های فنرزنی (Workstations / Machines)
CREATE TABLE IF NOT EXISTS springing_workstations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    device_model VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active' | 'maintenance' | 'inactive'
    hourly_cost BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_springing_ws_status ON springing_workstations(status);

-- درج ایستگاه‌های کاری پیش‌فرض کارگاه
INSERT INTO springing_workstations (id, name, code, device_model, status, hourly_cost, notes)
VALUES 
    ('ws_spiral_1', 'دستگاه برقی پانچ و فنرزن مارپیچ شماره ۱', 'WS-SPR-01', 'Super Binder Electric 500', 'active', 25000, 'مناسب دفاتر و جزوات مدارس تا ۲۵۰ برگ'),
    ('ws_wire_1', 'دستگاه فنرزن دوبل سیمی ۳:۱ (سایز متوسط)', 'WS-DBL-01', 'Renz SRW 360 Comfort', 'active', 35000, 'فنرزنی دوبل تقویم، دفاتر لوکس و کاتالوگ تا ۱۲۰ برگ'),
    ('ws_wire_2', 'دستگاه فنرزن دوبل سیمی ۲:۱ (سایز بزرگ)', 'WS-DBL-02', 'WireMac Duo 2:1 Heavy Duty', 'active', 40000, 'فنرزنی کتاب‌های ضخیم و پایان‌نامه‌ها تا ۲۸۰ برگ'),
    ('ws_staple_1', 'دستگاه منگنه صحافی صنعتی رومیزی', 'WS-STP-01', 'Rapid Heavy-Duty HD210', 'active', 15000, 'منگنه لخت و وسط‌زن جزوات آموزشی')
ON CONFLICT (id) DO NOTHING;

-- ۳. جدول عملیات فنرزنی کارگاه (Springing Operations)
CREATE TABLE IF NOT EXISTS springing_operations (
    id VARCHAR(64) PRIMARY KEY,
    operation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. OP-FNR-1001
    operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time VARCHAR(10), -- HH:mm (مثال: 08:30)
    end_time VARCHAR(10),   -- HH:mm (مثال: 11:45)
    operator_id VARCHAR(64),
    operator_name VARCHAR(150) NOT NULL,
    workstation_id VARCHAR(64) REFERENCES springing_workstations(id) ON DELETE SET NULL,
    workstation_name VARCHAR(150),
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE RESTRICT,
    product_code VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    warehouse_id VARCHAR(64) DEFAULT 'wh_central',
    output_warehouse_id VARCHAR(64) DEFAULT 'wh_central',
    
    -- شمارش‌ها و تعداد
    input_quantity INT NOT NULL DEFAULT 0,
    good_quantity INT NOT NULL DEFAULT 0,
    defective_quantity INT NOT NULL DEFAULT 0,
    scrap_quantity INT NOT NULL DEFAULT 0,
    returned_quantity INT NOT NULL DEFAULT 0,
    
    -- کنترل کیفیت (Quality Control)
    inspected_count INT NOT NULL DEFAULT 0,
    defect_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    failure_reason VARCHAR(255),
    qc_notes TEXT,
    
    -- هزینه‌ها و بهای تمام‌شده
    material_cost BIGINT NOT NULL DEFAULT 0,
    labor_cost BIGINT NOT NULL DEFAULT 0,
    machine_cost BIGINT NOT NULL DEFAULT 0,
    other_cost BIGINT NOT NULL DEFAULT 0,
    total_cost BIGINT NOT NULL DEFAULT 0,
    unit_cost BIGINT NOT NULL DEFAULT 0,
    
    -- وضعیت عملیات
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
    inventory_synced BOOLEAN NOT NULL DEFAULT FALSE,
    
    description TEXT,
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_springing_ops_number ON springing_operations(operation_number);
CREATE INDEX IF NOT EXISTS idx_springing_ops_date ON springing_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_springing_ops_product ON springing_operations(product_id);
CREATE INDEX IF NOT EXISTS idx_springing_ops_operator ON springing_operations(operator_name);
CREATE INDEX IF NOT EXISTS idx_springing_ops_ws ON springing_operations(workstation_id);
CREATE INDEX IF NOT EXISTS idx_springing_ops_status ON springing_operations(status);

-- ۴. جدول مواد و قطعات مصرفی هر عملیات فنرزنی (Consumed Materials per Operation)
CREATE TABLE IF NOT EXISTS springing_operation_materials (
    id VARCHAR(64) PRIMARY KEY,
    operation_id VARCHAR(64) NOT NULL REFERENCES springing_operations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    coil_type VARCHAR(50), -- 'metal_spiral' | 'double_wire' | 'plastic_spiral' | 'pvc_cover' | 'staple_wire'
    coil_size VARCHAR(50), -- '8mm' | '10mm' | '12mm' | '14mm' | '16mm' | '20mm' | '25mm' | '32mm'
    color VARCHAR(50),     -- مشکی، سفید، نقره‌ای، آبی، طلایی، شفاف
    quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(30) NOT NULL DEFAULT 'عدد',
    unit_cost BIGINT NOT NULL DEFAULT 0,
    total_cost BIGINT NOT NULL DEFAULT 0,
    supplier_name VARCHAR(150),
    batch_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_springing_mats_op ON springing_operation_materials(operation_id);
CREATE INDEX IF NOT EXISTS idx_springing_mats_prod ON springing_operation_materials(product_id);

-- ۵. درج اقلام مواد اولیه فنرزنی در جدول کاتالوگ محصولات در صورت عدم وجود
INSERT INTO products (
    id, name, code, category_id, sub_category_id, unit, buy_price, sale_price,
    price_shop1, price_shop2, price_shop3, wholesale_price, min_allowed_price,
    stock, min_stock_alert, is_special_offer, is_featured, only_accounting, description
) VALUES 
    ('raw_coil_spiral_10', 'فنر مارپیچ فلزی ۱۰ میلی‌متر مشکی (مواد اولیه)', 'RAW-SPR-10-BK', 'cat_office', 'sub_7', 'عدد', 4500, 7000, 7000, 6800, 6500, 5500, 5000, 450, 50, false, false, true, 'فنر مارپیچ استیل با روکش پلی‌اتیلن مشکی مناسب دفاتر ۱۰۰ برگ'),
    ('raw_coil_double_14', 'فنر دوبل فلزی ۳:۱ سایز ۱۴ میلی‌متر نقره‌ای (مواد اولیه)', 'RAW-DW-14-SL', 'cat_office', 'sub_7', 'عدد', 6800, 10000, 10000, 9500, 9000, 8000, 7500, 320, 40, false, false, true, 'فنر دوبل درجه یک خارجی برای صحافی جزوات و کتاب‌ها'),
    ('raw_pvc_cover_a4', 'طلق ضخیم شفاف A4 صحافی (جفت رو و پشت)', 'RAW-CVR-A4-CLR', 'cat_office', 'sub_7', 'دست', 5200, 8500, 8500, 8000, 7500, 6500, 6000, 500, 80, false, false, true, 'طلق مات و براق درجه یک پاپوش دفاتر'),
    ('raw_staple_23_13', 'سوزن منگنه صحافی سنگین ۲۳/۱۳ بسته ۱۰۰۰ عددی', 'RAW-STP-2313', 'cat_office', 'sub_7', 'بسته', 48000, 72000, 72000, 70000, 68000, 60000, 55000, 45, 10, false, false, true, 'مفتول سخت فولادی برای منگنه تا ۱۰۰ برگ کاغذ')
ON CONFLICT (id) DO NOTHING;
