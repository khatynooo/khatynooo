-- مهاجرت ۱۸: پشتیبانی از تسویه ترکیبی (نقد/چک)، چند چک، شماره شبا، و پیوست چندعکسی در فاکتورهای خرید
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cheque_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS cheques JSONB DEFAULT '[]'::jsonb;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS receipt_image_urls JSONB DEFAULT '[]'::jsonb;

-- فیلدهای تکمیلی جدول چک‌ها برای شبا و ارجاع به فاکتور
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS sheba_number VARCHAR(34);
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(64);
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
