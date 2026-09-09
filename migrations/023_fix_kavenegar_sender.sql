-- مهاجرت ۲۳: اصلاح خط ارسال آزمایشی کاوه‌نگار برای پیامک معمولی
-- فقط مقدارهای پیش‌فرض/قدیمی ریپو را اصلاح می‌کند و تنظیمات سفارشی معتبر را دست‌کاری نمی‌کند.

UPDATE sms_gateway_config
SET
    sender_number = '2000660110',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'default'
  AND provider = 'kavenegar'
  AND (
    sender_number IS NULL
    OR TRIM(sender_number) = ''
    OR TRIM(sender_number) = '10008585'
  );
