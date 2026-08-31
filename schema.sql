-- =============================================================================
-- پایگاه داده جامع فروشگاه و سیستم حسابداری یکپارچه «خطینو» (Khatinoo)
-- دامنه: khatynoo.ir
-- سیستم پایگاه داده: PostgreSQL 14+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول کاربران سیستم (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'site_manager', 'seller', 'accountant', 'chief_accountant')),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. واحدهای شمارش و ضرایب تبدیل (Unit Definitions)
CREATE TABLE IF NOT EXISTS unit_definitions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- مثلاً کارتن
    sub_unit VARCHAR(50) NOT NULL, -- مثلاً عدد
    conversion_factor NUMERIC(12, 3) NOT NULL DEFAULT 1.0, -- مثلاً 24
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. دسته‌بندی‌ها و زیردسته‌ها (Categories & SubCategories)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Tag',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_categories (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. کالاها و انبار با قیمت‌گذاری ۵ سطحی (Products)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(60) UNIQUE NOT NULL,
    barcode VARCHAR(60) UNIQUE,
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    sub_category_id VARCHAR(64) REFERENCES sub_categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    unit VARCHAR(50) NOT NULL DEFAULT 'عدد',
    sub_unit VARCHAR(50),
    conversion_factor NUMERIC(12, 3) DEFAULT 1.0,
    buy_price BIGINT NOT NULL DEFAULT 0, -- بهای تمام‌شده خرید
    sale_price BIGINT NOT NULL DEFAULT 0, -- قیمت فروش دستی / پایه
    price_shop1 BIGINT NOT NULL DEFAULT 0, -- قیمت فروشگاه ۱ (حضوری/نقدی)
    price_shop2 BIGINT NOT NULL DEFAULT 0, -- قیمت فروشگاه ۲ (آنلاین/ترب)
    price_shop3 BIGINT NOT NULL DEFAULT 0, -- قیمت فروشگاه ۳ (همکار/شعبه ۲)
    wholesale_price BIGINT NOT NULL DEFAULT 0, -- قیمت عمده‌فروشی
    min_allowed_price BIGINT NOT NULL DEFAULT 0, -- حداقل قیمت مجاز فروش
    stock NUMERIC(14, 3) NOT NULL DEFAULT 0, -- موجودی لحظه‌ای
    min_stock_alert NUMERIC(14, 3) NOT NULL DEFAULT 5, -- حد هشدار کسری موجودی
    description TEXT,
    image_url TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    extra_images JSONB DEFAULT '[]'::jsonb,
    show_on_website BOOLEAN DEFAULT FALSE,
    only_accounting BOOLEAN DEFAULT TRUE,
    is_special_offer BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- 5. مشتریان و تامین‌کنندگان (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    mobile VARCHAR(30) UNIQUE NOT NULL,
    national_code VARCHAR(20),
    address TEXT,
    postal_code VARCHAR(20),
    province VARCHAR(60),
    city VARCHAR(60),
    full_address TEXT,
    email VARCHAR(120),
    profile_completed BOOLEAN DEFAULT FALSE,
    total_purchase_amount BIGINT DEFAULT 0,
    balance BIGINT DEFAULT 0, -- مثبت = بستانکار، منفی = بدهکار
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5.1 کدهای یکبارمصرف ورود پیامکی مشتریان (Customer OTP Codes)
CREATE TABLE IF NOT EXISTS customer_otp_codes (
    id VARCHAR(64) PRIMARY KEY,
    mobile VARCHAR(30) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_otp_mobile ON customer_otp_codes(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    address TEXT,
    debt_to_supplier BIGINT DEFAULT 0, -- بدهی فروشگاه به تامین‌کننده
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('credit_sale', 'payment_received', 'manual_adjustment')),
    amount BIGINT NOT NULL,
    invoice_id VARCHAR(64),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
    id VARCHAR(64) PRIMARY KEY,
    supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('purchase_credit', 'payment_made', 'manual_adjustment')),
    amount BIGINT NOT NULL,
    payment_method VARCHAR(32) DEFAULT 'cash',
    invoice_id VARCHAR(64),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. فاکتورهای فروش و خرید (Sales & Purchase Invoices)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(30),
    items JSONB NOT NULL, -- آرایه اقلام با بهای خرید، قیمت فروش، تخفیف و سطح قیمت
    subtotal BIGINT NOT NULL,
    discount BIGINT DEFAULT 0,
    tax BIGINT DEFAULT 0,
    final_amount BIGINT NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'pos_pasargad', 'credit', 'installment', 'sms_link')),
    paid_amount BIGINT NOT NULL DEFAULT 0,
    remaining_amount BIGINT NOT NULL DEFAULT 0,
    cash_amount BIGINT DEFAULT 0,
    cheque_amount BIGINT DEFAULT 0,
    cheque_info JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'partial', 'pending', 'cancelled')),
    pos_ref_number VARCHAR(60),
    pos_rrn VARCHAR(60),
    sms_payment_status VARCHAR(20) DEFAULT 'not_sent',
    notes TEXT,
    created_by_user_id VARCHAR(64) REFERENCES users(id),
    created_by_user_name VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(150) NOT NULL,
    items JSONB NOT NULL,
    total_amount BIGINT NOT NULL,
    paid_amount BIGINT NOT NULL DEFAULT 0,
    remaining_amount BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL,
    cheque_info JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. مدیریت چک‌ها (Cheques)
CREATE TABLE IF NOT EXISTS cheques (
    id VARCHAR(64) PRIMARY KEY,
    cheque_number VARCHAR(50) NOT NULL,
    sayad_id VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('received', 'paid')),
    bank_name VARCHAR(80) NOT NULL,
    branch_code VARCHAR(30),
    amount BIGINT NOT NULL,
    due_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    drawer_name VARCHAR(120) NOT NULL,
    contact_number VARCHAR(30),
    entity_id VARCHAR(64),
    entity_name VARCHAR(150),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. سفارش‌های آنلاین و فروشگاه اینترنتی (Online Orders)
CREATE TABLE IF NOT EXISTS online_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(30) NOT NULL,
    customer_address TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal BIGINT NOT NULL,
    shipping_cost BIGINT DEFAULT 0,
    shipping_method VARCHAR(80) NOT NULL,
    discount_amount BIGINT DEFAULT 0,
    coupon_code VARCHAR(50),
    final_amount BIGINT NOT NULL,
    payment_gateway VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('paid', 'pending', 'failed', 'refunded')),
    order_status VARCHAR(30) NOT NULL CHECK (order_status IN ('processing', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    tracking_code VARCHAR(60),
    transaction_ref VARCHAR(60),
    sales_invoice_id VARCHAR(64) REFERENCES sales_invoices(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. تنظیمات کارتخوان و لاگ‌های POS پاسارگاد
CREATE TABLE IF NOT EXISTS pos_configs (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    terminal_id VARCHAR(30) NOT NULL,
    merchant_id VARCHAR(30) NOT NULL,
    ip VARCHAR(45) NOT NULL DEFAULT '192.168.1.150',
    port INT NOT NULL DEFAULT 7000,
    timeout_ms INT DEFAULT 60000,
    auto_send BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_simulation BOOLEAN DEFAULT TRUE,
    protocol_type VARCHAR(30) DEFAULT 'pasargad_tcp'
);

CREATE TABLE IF NOT EXISTS pos_transaction_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invoice_id VARCHAR(64),
    amount BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    raw_request_hex TEXT,
    raw_response_hex TEXT,
    ref_number VARCHAR(60),
    rrn VARCHAR(60),
    terminal_id VARCHAR(30),
    error_code VARCHAR(30),
    error_message TEXT,
    latency_ms INT DEFAULT 0
);

-- 10. خدمات کپی و پرینت (Copy & Print Services)
CREATE TABLE IF NOT EXISTS service_presets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    unit VARCHAR(40) NOT NULL DEFAULT 'صفحه',
    price BIGINT NOT NULL,
    price_single1 BIGINT DEFAULT 0,
    price_single2 BIGINT DEFAULT 0,
    price_double1 BIGINT DEFAULT 0,
    price_double2 BIGINT DEFAULT 0,
    binding_spiral_price BIGINT DEFAULT 0,
    binding_hardcover_price BIGINT DEFAULT 0,
    binding_cellophane_price BIGINT DEFAULT 0,
    volume_discount_threshold INT DEFAULT 50,
    volume_discount_percent INT DEFAULT 10,
    visibility VARCHAR(30) DEFAULT 'both',
    description TEXT,
    show_in_pos BOOLEAN DEFAULT TRUE,
    show_on_website BOOLEAN DEFAULT FALSE,
    only_accounting BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    extra_images JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(150) DEFAULT 'مشتری عمومی / حضوری',
    customer_mobile VARCHAR(30),
    service_name VARCHAR(120) NOT NULL,
    category VARCHAR(50),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'done',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. تولید و فرمولاسیون کارگاهی (Production & Formulas)
CREATE TABLE IF NOT EXISTS production_formulas (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    output_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    output_product_name VARCHAR(255) NOT NULL,
    output_category VARCHAR(100),
    output_unit VARCHAR(50) NOT NULL DEFAULT 'جلد',
    base_output_quantity NUMERIC(10, 2) NOT NULL DEFAULT 100,
    materials JSONB NOT NULL,
    overheads JSONB NOT NULL,
    suggested_sale_price BIGINT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_runs (
    id VARCHAR(64) PRIMARY KEY,
    run_number VARCHAR(50) UNIQUE NOT NULL,
    formula_id VARCHAR(64) REFERENCES production_formulas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    formula_name VARCHAR(150) NOT NULL,
    output_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    output_product_name VARCHAR(255) NOT NULL,
    produced_quantity NUMERIC(12, 3) NOT NULL,
    output_unit VARCHAR(50) NOT NULL,
    total_material_cost BIGINT NOT NULL,
    total_overhead_cost BIGINT NOT NULL,
    total_cost BIGINT NOT NULL,
    unit_cost BIGINT NOT NULL,
    consumed_materials JSONB NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    user_name VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. تنظیمات فروشگاه و سایت (Website & Store Settings)
CREATE TABLE IF NOT EXISTS website_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    site_title VARCHAR(200) NOT NULL,
    site_subtitle TEXT,
    notice_text TEXT,
    notice_badge_text VARCHAR(100) DEFAULT 'اطلاعیه فروشگاه',
    notice_link TEXT,
    show_notice BOOLEAN DEFAULT TRUE,
    quick_tracking_text VARCHAR(100) DEFAULT 'پیگیری سریع سفارشات',
    show_quick_tracking BOOLEAN DEFAULT TRUE,
    search_placeholder TEXT DEFAULT 'جستجوی خودکار در میان صدها قلم کالا، خودکار، دفتر، ماژیک، زونکن...',
    calculator_button_text VARCHAR(100) DEFAULT 'محاسبه هزینه کپی و پرینت',
    show_calculator_button BOOLEAN DEFAULT TRUE,
    cart_button_text VARCHAR(100) DEFAULT 'سبد خرید',
    support_phone VARCHAR(50),
    whatsapp VARCHAR(50),
    telegram VARCHAR(50),
    working_hours VARCHAR(100),
    instagram VARCHAR(50),
    enamad_code VARCHAR(100),
    enamad_image_url TEXT,
    samandehi_code VARCHAR(100),
    samandehi_image_url TEXT,
    default_price_tier VARCHAR(30) DEFAULT 'shop2',
    min_order_amount BIGINT DEFAULT 100000,
    logo_url TEXT,
    logo_height INT DEFAULT 48,
    logo_width INT DEFAULT 48,
    logo_fit VARCHAR(30) DEFAULT 'contain',
    logo_border_radius VARCHAR(30) DEFAULT 'rounded-2xl',
    show_logo_text BOOLEAN DEFAULT TRUE,
    favicon_url TEXT,
    header_menu_items JSONB,
    header_elements JSONB
);

CREATE TABLE IF NOT EXISTS store_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    tax_rate INT DEFAULT 10,
    barcode_prefix VARCHAR(20) DEFAULT 'KHAT',
    auto_print_receipt BOOLEAN DEFAULT TRUE,
    default_receipt_format VARCHAR(20) DEFAULT '80mm',
    sound_effects_enabled BOOLEAN DEFAULT TRUE,
    currency_symbol VARCHAR(20) DEFAULT 'تومان',
    price_tier1_name VARCHAR(50) DEFAULT 'قیمت حضوری و نقدی',
    price_tier2_name VARCHAR(50) DEFAULT 'قیمت آنلاین و ترب',
    price_tier3_name VARCHAR(50) DEFAULT 'قیمت همکار و عمده'
);

-- 13. دفتر معین متمرکز خزانه و جریان نقدینگی (Treasury & Cash Ledger)
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id VARCHAR(64) PRIMARY KEY,
    transaction_type VARCHAR(32) NOT NULL, -- 'sale_income', 'purchase_expense', 'pos_settlement', 'cheque_cleared', 'cash_in', 'cash_out'
    source_module VARCHAR(32) NOT NULL,    -- 'sales', 'purchases', 'pos', 'cheques', 'services'
    reference_id VARCHAR(64),              -- invoice_id, cheque_id, etc.
    amount BIGINT NOT NULL,                -- Amount in Tomans (positive for income/inflow, negative for expense/outflow)
    payment_method VARCHAR(32) NOT NULL,   -- 'cash', 'pos_pasargad', 'credit', 'cheque', 'bank_transfer'
    account_title VARCHAR(128) NOT NULL,   -- e.g. 'صندوق مرکزی', 'کارتخوان پاسارگاد', 'بانک ملت'
    description TEXT,
    balance_after BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treasury_type ON treasury_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_treasury_source ON treasury_transactions(source_module);
CREATE INDEX IF NOT EXISTS idx_treasury_created ON treasury_transactions(created_at);

-- 14. جدول ثبت پایدار تاریخچه اسنپ‌شات‌های قیمت بازار (Market Price Snapshots)
CREATE TABLE IF NOT EXISTS market_price_snapshots (
    id SERIAL PRIMARY KEY,
    product_key VARCHAR(255) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    torob_min_price INTEGER DEFAULT 0,
    digikala_price INTEGER DEFAULT 0,
    market_avg_price INTEGER DEFAULT 0,
    khatinoo_price INTEGER DEFAULT 0,
    date_str VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_key_date UNIQUE (product_key, date_str)
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_key ON market_price_snapshots(product_key);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_date ON market_price_snapshots(date_str);

-- 15. انبارها و موقعیت‌های فیزیکی (Warehouses & Locations)
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

-- 16. موجودی کالاها به تفکیک انبار / موقعیت (Inventory By Location)
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

-- 17. حواله‌های انتقال کالا بین انبارها (Inventory Transfers)
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id VARCHAR(64) PRIMARY KEY,
    transfer_number VARCHAR(64) UNIQUE NOT NULL,
    from_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    to_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
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

-- 18. اصلاح دستی موجودی با ثبت علت و کاربر (Inventory Adjustments)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    warehouse_id VARCHAR(64) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
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

-- 19. لاگ‌های امنیتی، مدیریتی و حسابرسی (Audit Logs)
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



