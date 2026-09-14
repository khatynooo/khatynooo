-- =============================================================================
-- مایگریشن شماره ۲۵: ماژول سفارشات فنرزنی و مدیریت پیام مستقیم ایتا
-- (Binding Orders, Receipt Sequence, Eitaa Customer Chats & Direct Messaging)
-- =============================================================================

-- ۱. سکوئنس شماره فاکتور/رسید ترتیبی فنرزنی (شروع از ۱۰۰۱)
CREATE SEQUENCE IF NOT EXISTS binding_order_seq START WITH 1001 INCREMENT BY 1;

-- ۲. جدول سفارشات فنرزنی (Binding Orders)
CREATE TABLE IF NOT EXISTS binding_orders (
    id VARCHAR(64) PRIMARY KEY,
    receipt_code VARCHAR(32) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(30) NOT NULL,
    book_count INT NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL DEFAULT 0,
    discount BIGINT NOT NULL DEFAULT 0,
    total_price BIGINT NOT NULL DEFAULT 0,
    description TEXT,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- 'unpaid' | 'paid'
    work_status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending' | 'done' | 'cancelled'
    eitaa_intake_sent BOOLEAN DEFAULT FALSE,
    eitaa_ready_sent BOOLEAN DEFAULT FALSE,
    eitaa_intake_status VARCHAR(50) DEFAULT 'not_sent',   -- 'sent' | 'no_chat_id' | 'failed' | 'not_sent'
    eitaa_ready_status VARCHAR(50) DEFAULT 'not_sent',    -- 'sent' | 'no_chat_id' | 'failed' | 'not_sent'
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_binding_orders_receipt ON binding_orders(receipt_code);
CREATE INDEX IF NOT EXISTS idx_binding_orders_customer_name ON binding_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_binding_orders_customer_mobile ON binding_orders(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_binding_orders_work_status ON binding_orders(work_status);
CREATE INDEX IF NOT EXISTS idx_binding_orders_payment_status ON binding_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_binding_orders_created_at ON binding_orders(created_at DESC);

-- ۳. جدول نگاشت شماره موبایل و شناسه مشتری در ایتا جهت ارتباط و ارسال مستقیم پیام
CREATE TABLE IF NOT EXISTS eitaa_customer_chats (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) NOT NULL,
    mobile VARCHAR(30),
    eitaa_user_id VARCHAR(100),
    first_name VARCHAR(100),
    username VARCHAR(100),
    source VARCHAR(50) DEFAULT 'mini_app',
    receipt_codes TEXT[] DEFAULT '{}',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eitaa_chats_chat_id ON eitaa_customer_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_eitaa_chats_mobile ON eitaa_customer_chats(mobile);

-- ۴. جدول تنظیمات اختصاصی ماژول فنرزنی و قالب پیام‌های ایتا
CREATE TABLE IF NOT EXISTS binding_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(150) DEFAULT 'خطی‌نو',
    store_phone VARCHAR(50) DEFAULT '021-66990000',
    store_address TEXT DEFAULT 'تهران، خیابان انقلاب، پرتال خدمات خطی‌نو',
    default_paper_size VARCHAR(10) DEFAULT 'A6', -- 'A6' | 'A7'
    default_unit_price BIGINT DEFAULT 35000,
    eitaa_bot_token VARCHAR(255),
    auto_send_intake BOOLEAN DEFAULT TRUE,
    auto_send_ready BOOLEAN DEFAULT TRUE,
    intake_message_template TEXT DEFAULT 'سلام {customer_name} عزیز 🌸
کتاب‌های شما جهت فنرزنی در {store_name} با موفقیت دریافت شد.

📚 تعداد کتاب: {book_count} جلد
🔖 کد رسید پیگیری: {receipt_code}
💰 مبلغ قابل پرداخت: {total_price} تومان

پس از آماده‌سازی سفارش، از همین طریق به شما اطلاع‌رسانی خواهد شد. سپاس از اعتماد شما.',
    ready_message_template TEXT DEFAULT 'سلام {customer_name} گرامی 🌺
سفارش فنرزنی شما با کیفیت عالی آماده تحویل است! ✨

📚 تعداد کتاب: {book_count} جلد
🔖 کد رسید: {receipt_code}
📍 محل تحویل: {store_address}
📞 تلفن هماهنگی: {store_phone}

منتظر دیدار شما در {store_name} هستیم.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ۵. درج رکورد تنظیمات اولیه در صورت عدم وجود
INSERT INTO binding_settings (id, store_name, default_paper_size, default_unit_price)
VALUES ('default', 'خطی‌نو', 'A6', 35000)
ON CONFLICT (id) DO NOTHING;
