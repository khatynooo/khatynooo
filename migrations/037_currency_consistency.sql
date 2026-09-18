-- =============================================================================
-- Migration 037: currency consistency and legacy-value normalization
-- =============================================================================
-- Monetary values in the application are stored in TOMAN (base unit).
-- IRR is a presentation/input unit only: 1 TOMAN = 10 RIAL.

-- Normalize legacy purchase invoice source-currency values.
ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS source_currency VARCHAR(10) DEFAULT 'toman';

UPDATE purchase_invoices
SET source_currency = CASE
  WHEN LOWER(TRIM(source_currency)) IN ('rial', 'irr', 'riyal') THEN 'rial'
  ELSE 'toman'
END
WHERE source_currency IS NULL
   OR LOWER(TRIM(source_currency)) NOT IN ('toman', 'rial');

ALTER TABLE purchase_invoices
  ALTER COLUMN source_currency SET DEFAULT 'toman';

-- Normalize store display currency to the application-level ISO-like codes.
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS display_currency VARCHAR(10) DEFAULT 'IRT';

UPDATE store_settings
SET display_currency = CASE
  WHEN UPPER(TRIM(display_currency)) IN ('IRR', 'RIAL', 'RIYAL') THEN 'IRR'
  ELSE 'IRT'
END
WHERE display_currency IS NULL
   OR UPPER(TRIM(display_currency)) NOT IN ('IRT', 'IRR');

ALTER TABLE store_settings
  ALTER COLUMN display_currency SET DEFAULT 'IRT';

-- The migration runner executes each migration once, so constraints can be added directly.
ALTER TABLE purchase_invoices
  ADD CONSTRAINT purchase_invoices_source_currency_check
  CHECK (source_currency IN ('toman', 'rial'));

ALTER TABLE store_settings
  ADD CONSTRAINT store_settings_display_currency_check
  CHECK (display_currency IN ('IRT', 'IRR'));
