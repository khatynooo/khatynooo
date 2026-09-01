-- ==============================================================================
-- مایگریشن ۰۱۵: سیستم جامع مرجوعی کالا (خرابی یا انصراف) و انبار ضایعات/قرنطینه
-- Migration 015: Returns Management System (Defective & Unwanted)
-- ==============================================================================

-- ۱. ساخت جدول فاکتورهای مرجوعی (فروش و خرید)
CREATE TABLE IF NOT EXISTS return_invoices (
  id VARCHAR(64) PRIMARY KEY,
  return_number VARCHAR(64) UNIQUE NOT NULL,
  original_invoice_id VARCHAR(64),
  original_invoice_number VARCHAR(64),
  customer_id VARCHAR(64),
  customer_name VARCHAR(255) NOT NULL,
  customer_mobile VARCHAR(50),
  type VARCHAR(32) NOT NULL DEFAULT 'sales_return', -- 'sales_return' | 'purchase_return'
  reason_category VARCHAR(32) NOT NULL, -- 'defective' (خرابی و عیب فیزیکی) | 'unwanted' (انصراف یا نخواستن)
  reason_note TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_refund_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  refund_method VARCHAR(32) NOT NULL DEFAULT 'cash', -- 'cash' | 'customer_credit' | 'bank_transfer' | 'none'
  warehouse_id VARCHAR(64) DEFAULT 'wh_central',
  status VARCHAR(32) NOT NULL DEFAULT 'completed', -- 'completed' | 'pending' | 'rejected'
  created_by_user_id VARCHAR(64),
  created_by_user_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_return_invoices_original_id ON return_invoices(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_return_invoices_created_at ON return_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_invoices_reason ON return_invoices(reason_category);

-- ۲. افزودن انبار اختصاصی اقلام معیوب و ضایعات مرجوعی
INSERT INTO warehouses (id, code, name, address, phone, is_default, is_active, created_at)
VALUES (
  'wh_waste',
  'WH-WASTE',
  'انبار ضایعات و مرجوعی‌های معیوب',
  'بخش قرنطینه و تفکیک کالاهای مرجوعی معیوب',
  '۰۲۱-۸۸۸۸۸۸۸۸',
  FALSE,
  TRUE,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
