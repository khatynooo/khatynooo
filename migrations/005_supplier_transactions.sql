-- ==============================================================================
-- Migration 005: Supplier Transactions & Ledger History
-- جدول تاریخچه تراکنش‌ها و پرداخت‌های مالی به تامین‌کنندگان
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier_id ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_created_at ON supplier_transactions(created_at);
