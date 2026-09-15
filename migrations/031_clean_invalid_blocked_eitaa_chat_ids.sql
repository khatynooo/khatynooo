-- Migration 031: پاکسازی chat_idهای نامعتبر و مسدود شده از سفارشات فنر خالی
-- (Clean invalid and blocked eitaa chat IDs from binding orders)

UPDATE binding_orders
SET customer_eitaa_chat_id = NULL, updated_at = NOW()
WHERE customer_eitaa_chat_id IN (
  SELECT chat_id FROM eitaa_identities WHERE is_blocked = TRUE
);
