-- Currency policy: all persisted monetary values are TOMAN (IRT).
-- This migration is intentionally additive: existing numeric monetary columns remain
-- untouched because their values are already canonical TOMAN values.
-- API/UI layers must convert IRR input to IRT before persistence and convert IRT to
-- the selected display currency only at presentation boundaries.

CREATE TABLE IF NOT EXISTS currency_policy (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  base_currency VARCHAR(3) NOT NULL DEFAULT 'IRT',
  rials_per_toman INTEGER NOT NULL DEFAULT 10,
  CONSTRAINT currency_policy_singleton CHECK (id = 1),
  CONSTRAINT currency_policy_base CHECK (base_currency = 'IRT'),
  CONSTRAINT currency_policy_ratio CHECK (rials_per_toman = 10)
);

INSERT INTO currency_policy (id, base_currency, rials_per_toman)
VALUES (1, 'IRT', 10)
ON CONFLICT (id) DO UPDATE SET base_currency = 'IRT', rials_per_toman = 10;
