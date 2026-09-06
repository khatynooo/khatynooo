-- =============================================================================
-- مایگریشن 016: افزودن بارکد دوم (بارکد جعبه/کارتن) به کالاها
-- Add Secondary Box/Carton Barcode to Products
-- =============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS box_barcode VARCHAR(60);
CREATE INDEX IF NOT EXISTS idx_products_box_barcode ON products(box_barcode);
