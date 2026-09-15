-- Migration 032: افزودن ستون is_verified به جدول eitaa_identities
-- Flag indicating if the identity was cryptographically verified via Eitaa/Telegram WebApp initData HMAC
ALTER TABLE eitaa_identities ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
