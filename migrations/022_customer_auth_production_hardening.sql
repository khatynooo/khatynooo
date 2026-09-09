-- مهاجرت ۲۲: امن‌سازی و آماده‌سازی پروداکشن احراز هویت مشتریان و درگاه پیامک کاوه‌نگار
-- حذف کلید نمونه، غیرفعال‌سازی شبیه‌ساز و بهینه‌سازی جداول OTP و دسترسی داده‌های مشتریان

-- ۱. پاکسازی کلید نمونه و خروج دائمی از حالت شبیه‌ساز در جدول تنظیمات پیامک
UPDATE sms_gateway_config
SET 
    api_key = CASE 
        WHEN api_key = 'khatinoo_kavenegar_live_api_key_sample' THEN NULL 
        ELSE api_key 
    END,
    is_simulated = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'default';

-- ۲. ایجاد ایندکس‌های بهینه برای افزایش سرعت بررسی کدهای اعتبارسنجی و جلوگیری از حملات Brute-Force
CREATE INDEX IF NOT EXISTS idx_customer_otp_lookup ON customer_otp_codes(mobile, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_otp_created ON customer_otp_codes(created_at);

-- ۳. ایندکس‌گذاری و اطمینان از صحت پیوند سفارش‌ها و فاکتورها به شماره موبایل و شناسه مشتری
CREATE INDEX IF NOT EXISTS idx_online_orders_customer_id ON online_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_customer_mobile ON online_orders(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_mobile ON sales_invoices(customer_mobile);
