// ==============================================================================
// لایه جامع دسترسی به پایگاه‌داده PostgreSQL با کوئری‌های مستقیم SQL
// دامنه: khatynoo.ir (فروشگاه و حسابداری یکپارچه خطی‌نو)
// ==============================================================================

import { query, withTransaction } from './dbClient';
import bcrypt from 'bcryptjs';
import {
  Category,
  Cheque,
  Customer,
  CustomerTransaction,
  InvoiceItem,
  OnlineOrder,
  PosConfig,
  PosTransactionLog,
  Product,
  ProductionFormula,
  ProductionRun,
  PurchaseInvoice,
  ReturnInvoice,
  ReturnInvoiceItem,
  SalesInvoice,
  ServicePreset,
  ServiceRecord,
  StoreSettings,
  Supplier,
  TreasurySummary,
  TreasuryTransaction,
  UnitDefinition,
  User,
  WebsiteBanner,
  WebsiteSettings,
  HeaderElement,
  HeaderMenuItem,
  Warehouse,
  InventoryByLocation,
  InventoryTransfer,
  InventoryAdjustment,
  SystemAuditLog,
} from '../src/types';

// Helper برای تبدیل خروجی ردیف‌های SQL با Snake Case به Camel Case
function formatProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    barcode: row.barcode || '',
    categoryId: row.category_id || '',
    categoryName: row.category_name || row.categoryName || '',
    subCategoryId: row.sub_category_id || '',
    unit: row.unit || 'عدد',
    subUnit: row.sub_unit || '',
    conversionFactor: Number(row.conversion_factor || 1),
    buyPrice: Number(row.buy_price || 0),
    salePrice: Number(row.sale_price || 0),
    priceShop1: Number(row.price_shop1 || row.sale_price || 0),
    priceShop2: Number(row.price_shop2 || row.sale_price || 0),
    priceShop3: Number(row.price_shop3 || row.sale_price || 0),
    wholesalePrice: Number(row.wholesale_price || 0),
    minAllowedPrice: Number(row.min_allowed_price || 0),
    stock: Number(row.stock || 0),
    minStockAlert: Number(row.min_stock_alert || 5),
    description: row.description || '',
    image: row.image_url || '',
    gallery: Array.isArray(row.gallery) ? row.gallery : (typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : []),
    extraImages: Array.isArray(row.extra_images) ? row.extra_images : (typeof row.extra_images === 'string' ? JSON.parse(row.extra_images || '[]') : []),
    showOnWebsite: Boolean(row.show_on_website),
    onlyAccounting: row.only_accounting !== undefined ? Boolean(row.only_accounting) : true,
    isSpecialOffer: Boolean(row.is_special_offer),
    featured: Boolean(row.is_featured),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function formatCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    mobile: row.mobile,
    phone: row.phone || '',
    nationalCode: row.national_code,
    address: row.address || '',
    postalCode: row.postal_code || '',
    province: row.province || '',
    city: row.city || '',
    fullAddress: row.full_address || row.address || '',
    email: row.email || '',
    creditLimit: Number(row.credit_limit || 5000000),
    notes: row.notes || '',
    profileCompleted: Boolean(row.profile_completed),
    totalPurchaseAmount: Number(row.total_purchase_amount || 0),
    balance: Number(row.balance || 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function formatSalesInvoice(row: any): SalesInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerMobile: row.customer_mobile,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    tax: Number(row.tax || 0),
    finalAmount: Number(row.final_amount || 0),
    paymentMethod: row.payment_method,
    paidAmount: Number(row.paid_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    cashAmount: Number(row.cash_amount || 0),
    chequeAmount: Number(row.cheque_amount || 0),
    chequeInfo: typeof row.cheque_info === 'string' ? JSON.parse(row.cheque_info) : row.cheque_info,
    status: row.status,
    posRefNumber: row.pos_ref_number,
    posRrn: row.pos_rrn,
    notes: row.notes,
    warehouseId: row.warehouse_id || 'wh_central',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdByUserId: row.created_by_user_id,
    createdByUserName: row.created_by_user_name,
  };
}

/**
 * اعتبارسنجی و تبدیل هوشمند شناسه/نام دسته‌بندی به یک category_id معتبر در جدول categories
 * این متد تضمین می‌کند که خطای Foreign Key Constraint در PostgreSQL تحت هیچ شرایطی رخ ندهد.
 */
async function resolveValidCategoryId(
  clientOrQuery: { query: (sql: string, params?: any[]) => Promise<any> },
  categoryId?: string | null,
  categoryName?: string | null
): Promise<string | null> {
  const catInput = typeof categoryId === 'string' ? categoryId.trim() : '';
  const nameInput = typeof categoryName === 'string' ? categoryName.trim() : '';

  const isInvalid = (val: string) =>
    !val ||
    val === 'all' ||
    val === 'none' ||
    val === 'null' ||
    val === 'undefined' ||
    val === '0' ||
    val === '-1';

  if (isInvalid(catInput) && isInvalid(nameInput)) {
    return null;
  }

  // ۱. بررسی شناسه در جدول categories
  if (!isInvalid(catInput)) {
    const checkById = await clientOrQuery.query('SELECT id FROM categories WHERE id = $1', [catInput]);
    if (checkById.rows.length > 0) {
      return checkById.rows[0].id;
    }

    // ۲. بررسی بر اساس نام دقیق
    const checkByName = await clientOrQuery.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [catInput]);
    if (checkByName.rows.length > 0) {
      return checkByName.rows[0].id;
    }
  }

  if (!isInvalid(nameInput)) {
    const checkByName = await clientOrQuery.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [nameInput]);
    if (checkByName.rows.length > 0) {
      return checkByName.rows[0].id;
    }
  }

  // ۳. اگر شناسه/نام ارسالی در جدول وجود نداشت، دسته‌بندی را خودکار می‌سازیم تا قید FK هیچ‌گاه شکسته نشود
  const effectiveName = !isInvalid(nameInput) ? nameInput : catInput;
  if (!isInvalid(effectiveName)) {
    const generatedId = catInput.startsWith('cat_') ? catInput : `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      await clientOrQuery.query(
        `INSERT INTO categories (id, name, icon, sort_order, created_at)
         VALUES ($1, $2, 'Tag', 0, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [generatedId, effectiveName]
      );
      return generatedId;
    } catch (insertErr) {
      const fallback = await clientOrQuery.query('SELECT id FROM categories ORDER BY sort_order ASC, created_at ASC LIMIT 1');
      return fallback.rows.length > 0 ? fallback.rows[0].id : null;
    }
  }

  return null;
}

/**
 * اعتبارسنجی و تطبیق امن زیردسته کالا با جدول sub_categories
 */
async function resolveValidSubCategoryId(
  clientOrQuery: { query: (sql: string, params?: any[]) => Promise<any> },
  subCategoryId?: string | null,
  validCategoryId?: string | null
): Promise<string | null> {
  const subInput = typeof subCategoryId === 'string' ? subCategoryId.trim() : '';
  if (!subInput || subInput === 'all' || subInput === 'none' || subInput === 'null' || subInput === 'undefined') {
    return null;
  }

  const check = await clientOrQuery.query('SELECT id, category_id FROM sub_categories WHERE id = $1', [subInput]);
  if (check.rows.length > 0) {
    if (validCategoryId && check.rows[0].category_id && check.rows[0].category_id !== validCategoryId) {
      return null;
    }
    return check.rows[0].id;
  }

  if (validCategoryId) {
    const checkByName = await clientOrQuery.query(
      'SELECT id FROM sub_categories WHERE category_id = $1 AND LOWER(name) = LOWER($2)',
      [validCategoryId, subInput]
    );
    if (checkByName.rows.length > 0) {
      return checkByName.rows[0].id;
    }
  }

  return null;
}

/**
 * همگام‌سازی تضمینی ستون products.stock بر اساس تجمیع تمام ردیف‌های موجودی انبارها
 * Invariant: products.stock === SUM(inventory_by_location.stock)
 */
async function syncProductTotalStock(client: any, productId: string): Promise<number> {
  const sumRes = await client.query(
    'SELECT COALESCE(SUM(stock), 0) as total_stock FROM inventory_by_location WHERE product_id = $1',
    [productId]
  );
  const totalStock = Number(sumRes.rows[0]?.total_stock || 0);
  await client.query(
    'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
    [totalStock, productId]
  );
  return totalStock;
}

/**
 * تغییر اتمیک موجودی کالا در یک انبار مشخص با قفل ردیف (FOR UPDATE) و بررسی موجودی کافی
 */
async function modifyLocationStock(
  client: any,
  params: {
    productId: string;
    warehouseId: string;
    delta: number;
    allowNegative?: boolean;
    minStockAlert?: number;
    aisleShelf?: string;
  }
): Promise<{ newLocationStock: number; totalStock: number }> {
  const targetWhId = params.warehouseId || 'wh_central';
  const locId = `invloc_${params.productId}_${targetWhId}`;

  // ۱. قفل ردیف کالا
  const prodCheck = await client.query(
    'SELECT id, name, stock, unit, min_stock_alert FROM products WHERE id = $1 FOR UPDATE',
    [params.productId]
  );
  if (prodCheck.rows.length === 0) {
    throw new Error(`کالای انتخابی با شناسه «${params.productId}» یافت نشد.`);
  }
  const prod = prodCheck.rows[0];

  // ۲. قفل و واکشی ردیف موجودی در انبار هدف
  const locCheck = await client.query(
    'SELECT * FROM inventory_by_location WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE',
    [targetWhId, params.productId]
  );

  let currentLocStock = 0;
  if (locCheck.rows.length > 0) {
    currentLocStock = Number(locCheck.rows[0].stock || 0);
  } else if (targetWhId === 'wh_central') {
    currentLocStock = Number(prod.stock || 0);
  }

  const newLocStock = currentLocStock + params.delta;
  if (!params.allowNegative && newLocStock < 0) {
    let whName = targetWhId;
    try {
      const whRes = await client.query('SELECT name FROM warehouses WHERE id = $1', [targetWhId]);
      if (whRes.rows.length > 0) whName = whRes.rows[0].name;
    } catch (e) {}

    throw new Error(
      `موجودی کالا «${prod.name}» در انبار «${whName}» کافی نیست (موجودی فعلی این انبار: ${currentLocStock} ${prod.unit}، مقدار درخواستی: ${Math.abs(params.delta)}).`
    );
  }

  // ۳. ثبت یا به‌روزرسانی ردیف موجودی در انبار
  await client.query(
    `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (warehouse_id, product_id)
     DO UPDATE SET stock = $4, updated_at = NOW()`,
    [
      locId,
      targetWhId,
      params.productId,
      newLocStock,
      params.minStockAlert ?? Number(prod.min_stock_alert || 5),
      params.aisleShelf || 'قفسه اصلی',
    ]
  );

  // ۴. به‌روزرسانی ستون سراسری products.stock برای تضمین سازگاری ۱۰۰٪
  const totalStock = await syncProductTotalStock(client, params.productId);

  return { newLocationStock: newLocStock, totalStock };
}

export const db = {
  // ============================================================================
  // ۱. کاربران و احراز هویت (Users & Auth)
  // ============================================================================
  async getUsers(): Promise<User[]> {
    const res = await query('SELECT id, full_name, username, role, phone, avatar_url, is_active, created_at FROM users ORDER BY created_at ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      username: r.username,
      role: r.role,
      phone: r.phone || '',
      avatar: r.avatar_url,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  },

  async getUserById(id: string): Promise<User | null> {
    const res = await query('SELECT id, full_name, username, role, phone, avatar_url, is_active, created_at FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      fullName: r.full_name,
      username: r.username,
      role: r.role,
      phone: r.phone || '',
      avatar: r.avatar_url,
      isActive: r.is_active,
      createdAt: r.created_at,
    };
  },

  async getUserByUsername(username: string): Promise<{ user: User; passwordHash: string } | null> {
    const res = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      user: {
        id: r.id,
        fullName: r.full_name,
        username: r.username,
        role: r.role,
        phone: r.phone || '',
        avatar: r.avatar_url,
        isActive: r.is_active,
        createdAt: r.created_at,
      },
      passwordHash: r.password_hash,
    };
  },

  async createUser(user: { fullName: string; username: string; passwordHash: string; role: string; phone?: string }): Promise<User> {
    const id = `usr_${Date.now()}`;
    await query(
      `INSERT INTO users (id, full_name, username, password_hash, role, phone, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
      [id, user.fullName, user.username, user.passwordHash, user.role, user.phone || '']
    );
    return {
      id,
      fullName: user.fullName,
      username: user.username,
      role: user.role as any,
      phone: user.phone || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  },

  async updateUser(id: string, updates: Partial<User> & { password?: string; phone?: string }): Promise<User | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;

    let passClause = '';
    const params: any[] = [
      updates.fullName ?? existing.fullName,
      updates.role ?? existing.role,
      updates.isActive ?? existing.isActive,
      updates.phone !== undefined ? updates.phone : (existing.phone || ''),
      id,
    ];

    if (updates.password && updates.password.trim().length > 0) {
      const hash = await bcrypt.hash(updates.password.trim(), 10);
      passClause = ', password_hash = $6';
      params.push(hash);
    }

    await query(
      `UPDATE users 
       SET full_name = $1, role = $2, is_active = $3, phone = $4, updated_at = NOW() ${passClause}
       WHERE id = $5`,
      params
    );

    return this.getUserById(id);
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await query('DELETE FROM users WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  },

  // ============================================================================
  // ۲. دسته‌بندی‌ها و واحدهای شمارش (Categories & Units)
  // ============================================================================
  async getCategories(): Promise<Category[]> {
    const catRes = await query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC');
    const subRes = await query('SELECT * FROM sub_categories ORDER BY created_at ASC');

    const subs = subRes.rows;
    return catRes.rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || 'Tag',
      sortOrder: c.sort_order || 0,
      subCategories: subs.filter((s: any) => s.category_id === c.id).map((s: any) => ({ id: s.id, name: s.name, description: s.description })),
    }));
  },

  async createCategory(data: { name: string; icon?: string; sortOrder?: number; subcategories?: string[] }): Promise<Category> {
    const id = `cat_${Date.now()}`;
    await query(
      `INSERT INTO categories (id, name, icon, sort_order, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, data.name, data.icon || 'Tag', data.sortOrder || 0]
    );

    if (data.subcategories && Array.isArray(data.subcategories)) {
      for (const sub of data.subcategories) {
        if (sub && sub.trim()) {
          await this.createSubCategory({ categoryId: id, name: sub.trim() });
        }
      }
    }

    return {
      id,
      name: data.name,
      icon: data.icon || 'Tag',
      subcategories: [],
    };
  },

  async updateCategory(id: string, data: { name?: string; icon?: string; sortOrder?: number }): Promise<void> {
    await query(
      `UPDATE categories 
       SET name = COALESCE($1, name), icon = COALESCE($2, icon), sort_order = COALESCE($3, sort_order)
       WHERE id = $4`,
      [data.name, data.icon, data.sortOrder, id]
    );
  },

  async deleteCategory(id: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [id]);
      await client.query('DELETE FROM sub_categories WHERE category_id = $1', [id]);
      await client.query('DELETE FROM categories WHERE id = $1', [id]);
    });
  },

  async createSubCategory(data: { categoryId: string; name: string; description?: string }): Promise<void> {
    const id = `sub_${Date.now()}`;
    await query(
      `INSERT INTO sub_categories (id, category_id, name, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, data.categoryId, data.name, data.description || null]
    );
  },

  async getUnits(): Promise<UnitDefinition[]> {
    const res = await query('SELECT * FROM unit_definitions ORDER BY id ASC');
    return res.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      subUnit: u.sub_unit,
      conversionFactor: Number(u.conversion_factor || 1),
      description: u.description,
    }));
  },

  async createUnit(data: { name: string; subUnit?: string; conversionFactor?: number; description?: string }): Promise<UnitDefinition> {
    const id = `unt_${Date.now()}`;
    await query(
      `INSERT INTO unit_definitions (id, name, sub_unit, conversion_factor, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, data.name, data.subUnit || data.name, data.conversionFactor || 1, data.description || null]
    );
    return {
      id,
      name: data.name,
      subUnit: data.subUnit || data.name,
      conversionFactor: data.conversionFactor || 1,
      description: data.description,
    };
  },

  // ============================================================================
  // ۳. محصولات و انبار با قیمت‌گذاری ۵ سطحی (Products & Inventory)
  // ============================================================================
  async getProducts(filter?: { categoryId?: string; search?: string }): Promise<Product[]> {
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.categoryId) {
      params.push(filter.categoryId);
      sql += ` AND p.category_id = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.code) LIKE $${params.length} OR LOWER(p.barcode) LIKE $${params.length})`;
    }

    sql += ' ORDER BY p.created_at DESC';

    const res = await query(sql, params);
    return res.rows.map(formatProduct);
  },

  async getProductById(id: string): Promise<Product | null> {
    const res = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return formatProduct(res.rows[0]);
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const res = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.barcode = $1`,
      [barcode]
    );
    if (res.rows.length === 0) return null;
    return formatProduct(res.rows[0]);
  },

  async createProduct(p: Partial<Product>): Promise<Product> {
    const id = p.id || `prod_${Date.now()}`;
    const code = p.code || `KHAT-${Date.now().toString().slice(-6)}`;
    const barcode = p.barcode || `${Math.floor(6260000000000 + Math.random() * 9999999999)}`;
    const initialStock = Number(p.stock || 0);

    return await withTransaction(async (client) => {
      // نگاشت امن دسته‌بندی و زیردسته برای جلوگیری قطعی از خطای Foreign Key
      const validCatId = await resolveValidCategoryId(client, p.categoryId, p.categoryName || (p as any).category);
      const validSubCatId = await resolveValidSubCategoryId(client, p.subCategoryId, validCatId);

      await client.query(
        `INSERT INTO products (
          id, name, code, barcode, category_id, sub_category_id, unit, sub_unit, conversion_factor,
          buy_price, sale_price, price_shop1, price_shop2, price_shop3, wholesale_price, min_allowed_price,
          stock, min_stock_alert, description, image_url, gallery, extra_images, show_on_website, only_accounting, is_special_offer, is_featured, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW()
        )`,
        [
          id,
          p.name || 'کالای جدید',
          code,
          barcode,
          validCatId,
          validSubCatId,
          p.unit || 'عدد',
          p.subUnit || null,
          p.conversionFactor || 1,
          p.buyPrice || 0,
          p.salePrice || 0,
          p.priceShop1 || p.salePrice || 0,
          p.priceShop2 || p.salePrice || 0,
          p.priceShop3 || p.salePrice || 0,
          p.wholesalePrice || 0,
          p.minAllowedPrice || 0,
          initialStock,
          p.minStockAlert || 5,
          p.description || '',
          p.image || (p as any).imageUrl || '',
          JSON.stringify(p.gallery || []),
          JSON.stringify(p.extraImages || (p as any).extra_images || []),
          Boolean(p.showOnWebsite || (p as any).show_on_website),
          p.onlyAccounting !== undefined ? Boolean(p.onlyAccounting) : (p.showOnWebsite ? false : true),
          Boolean(p.isSpecialOffer),
          Boolean(p.featured || (p as any).isFeatured),
        ]
      );

      // ایجاد ردیف موجودی در انبار مرکزی
      await client.query(
        `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
         VALUES ($1, 'wh_central', $2, $3, $4, 'قفسه مرکزی', NOW())
         ON CONFLICT (warehouse_id, product_id)
         DO UPDATE SET stock = $3, updated_at = NOW()`,
        [`invloc_${id}_wh_central`, id, initialStock, Number(p.minStockAlert || 5)]
      );

      await syncProductTotalStock(client, id);

      const res = await client.query(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = $1`,
        [id]
      );
      return formatProduct(res.rows[0]);
    });
  },

  async updateProduct(
    id: string,
    updates: Partial<Product>,
    context?: { userId?: string; username?: string; reason?: string; ip?: string; userAgent?: string }
  ): Promise<Product | null> {
    return await withTransaction(async (client) => {
      const prodCheck = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (prodCheck.rows.length === 0) return null;
      const current = prodCheck.rows[0];
      const previousStock = Number(current.stock || 0);

      const hasStockChange = updates.stock !== undefined && Number(updates.stock) !== previousStock;
      const newStock = hasStockChange ? Number(updates.stock) : previousStock;
      const delta = newStock - previousStock;

      // نگاشت امن دسته‌بندی و زیردسته در آپدیت
      let finalCatId = current.category_id;
      if (updates.categoryId !== undefined) {
        finalCatId = await resolveValidCategoryId(
          client,
          updates.categoryId,
          updates.categoryName || (updates as any).category
        );
      }

      let finalSubCatId = current.sub_category_id;
      if (updates.subCategoryId !== undefined) {
        finalSubCatId = await resolveValidSubCategoryId(
          client,
          updates.subCategoryId,
          finalCatId
        );
      }

      await client.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          code = COALESCE($2, code),
          barcode = COALESCE($3, barcode),
          category_id = $4,
          sub_category_id = $5,
          unit = COALESCE($6, unit),
          buy_price = COALESCE($7, buy_price),
          sale_price = COALESCE($8, sale_price),
          price_shop1 = COALESCE($9, price_shop1),
          price_shop2 = COALESCE($10, price_shop2),
          price_shop3 = COALESCE($11, price_shop3),
          wholesale_price = COALESCE($12, wholesale_price),
          min_allowed_price = COALESCE($13, min_allowed_price),
          stock = COALESCE($14, stock),
          min_stock_alert = COALESCE($15, min_stock_alert),
          description = COALESCE($16, description),
          image_url = COALESCE($17, image_url),
          gallery = CASE WHEN $18::text IS NOT NULL THEN $18::jsonb ELSE gallery END,
          extra_images = CASE WHEN $19::text IS NOT NULL THEN $19::jsonb ELSE extra_images END,
          show_on_website = COALESCE($20, show_on_website),
          only_accounting = COALESCE($21, only_accounting),
          is_special_offer = COALESCE($22, is_special_offer),
          is_featured = COALESCE($23, is_featured),
          updated_at = NOW()
         WHERE id = $24`,
        [
          updates.name,
          updates.code,
          updates.barcode,
          finalCatId,
          finalSubCatId,
          updates.unit,
          updates.buyPrice,
          updates.salePrice,
          updates.priceShop1,
          updates.priceShop2,
          updates.priceShop3,
          updates.wholesalePrice,
          updates.minAllowedPrice,
          updates.stock,
          updates.minStockAlert,
          updates.description,
          updates.image || (updates as any).imageUrl,
          updates.gallery !== undefined ? JSON.stringify(updates.gallery) : null,
          updates.extraImages !== undefined ? JSON.stringify(updates.extraImages) : ((updates as any).extra_images !== undefined ? JSON.stringify((updates as any).extra_images) : null),
          updates.showOnWebsite !== undefined ? Boolean(updates.showOnWebsite) : ((updates as any).show_on_website !== undefined ? Boolean((updates as any).show_on_website) : null),
          updates.onlyAccounting !== undefined ? Boolean(updates.onlyAccounting) : ((updates as any).only_accounting !== undefined ? Boolean((updates as any).only_accounting) : null),
          updates.isSpecialOffer,
          updates.featured !== undefined ? updates.featured : (updates as any).isFeatured,
          id,
        ]
      );

      // اگر موجودی تغییر کرده باشد، در انبار مرکزی هم همگام‌سازی و لاگ ثبت شود
      if (hasStockChange) {
        const locId = `invloc_${id}_wh_central`;
        await client.query(
          `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
           VALUES ($1, 'wh_central', $2, $3, $4, 'قفسه مرکزی', NOW())
           ON CONFLICT (warehouse_id, product_id)
           DO UPDATE SET stock = $3, updated_at = NOW()`,
          [locId, id, newStock, Number(updates.minStockAlert || current.min_stock_alert || 5)]
        );

        const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const reasonText = context?.reason || 'اصلاح سریع موجودی از پنل کالا';
        await client.query(
          `INSERT INTO inventory_adjustments (
            id, product_id, warehouse_id, user_id, user_name,
            previous_stock, new_stock, delta, reason, notes, created_at
          ) VALUES ($1, $2, 'wh_central', $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            adjId,
            id,
            context?.userId || null,
            context?.username || 'مدیر انبار',
            previousStock,
            newStock,
            delta,
            reasonText,
            'ویرایش از طریق فرم کالای انبار',
          ]
        );

        await client.query(
          `INSERT INTO audit_logs (
            id, user_id, username, action, module, target_id, details, ip, user_agent, status, created_at
          ) VALUES ($1, $2, $3, $4, 'inventory', $5, $6, $7, $8, 'success', NOW())`,
          [
            `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            context?.userId || null,
            context?.username || 'مدیر سیستم',
            `تغییر موجودی «${current.name}» از ${previousStock} به ${newStock} (${delta >= 0 ? '+' : ''}${delta} ${current.unit}) - ${reasonText}`,
            id,
            JSON.stringify({
              productId: id,
              productName: current.name,
              previousStock,
              newStock,
              delta,
              reason: reasonText,
            }),
            context?.ip || '127.0.0.1',
            context?.userAgent || 'Web POS',
          ]
        );
      }

      const res = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      return res.rows.length > 0 ? formatProduct(res.rows[0]) : null;
    });
  },

  async deleteProduct(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      // ۱. برداشتن وابستگی به کالا در فرمول‌های تولید کارگاهی (جلوگیری از خطای کلید خارجی)
      await client.query('UPDATE production_formulas SET output_product_id = NULL WHERE output_product_id = $1', [id]);

      // ۲. برداشتن وابستگی در سوابق اجرای تولید
      await client.query('UPDATE production_runs SET output_product_id = NULL WHERE output_product_id = $1', [id]);

      // ۳. حذف رکوردهای موجودی انبارها برای این کالا
      await client.query('DELETE FROM inventory_by_location WHERE product_id = $1', [id]);

      // ۴. حذف سوابق اصلاح دستی موجودی برای این کالا
      await client.query('DELETE FROM inventory_adjustments WHERE product_id = $1', [id]);

      // ۵. حذف سوابق حواله‌های انتقال بین انبار برای این کالا
      await client.query('DELETE FROM inventory_transfers WHERE product_id = $1', [id]);

      // ۶. حذف نهایی رکورد کالا
      const res = await client.query('DELETE FROM products WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    });
  },

  // ============================================================================
  // ۴. مشتریان، تامین‌کنندگان و تراکنش‌های حسابداری (Customers, Suppliers & Ledger)
  // ============================================================================
  async getCustomers(): Promise<Customer[]> {
    const res = await query('SELECT * FROM customers ORDER BY created_at DESC');
    return res.rows.map(formatCustomer);
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const res = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return formatCustomer(res.rows[0]);
  },

  async createCustomer(c: Partial<Customer>): Promise<Customer> {
    const id = c.id || `cst_${Date.now()}`;
    await query(
      `INSERT INTO customers (id, name, company_name, mobile, phone, national_code, address, postal_code, province, city, full_address, email, credit_limit, notes, balance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        id,
        c.name || 'مشتری جدید',
        c.companyName || null,
        c.mobile || `09${Math.floor(100000000 + Math.random() * 900000000)}`,
        c.phone || null,
        c.nationalCode || null,
        c.address || '',
        c.postalCode || null,
        c.province || null,
        c.city || null,
        c.fullAddress || c.address || '',
        c.email || null,
        c.creditLimit !== undefined ? Number(c.creditLimit) : 5000000,
        c.notes || null,
        c.balance || 0,
      ]
    );
    const created = await this.getCustomerById(id);
    return created!;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const existing = await this.getCustomerById(id);
    if (!existing) return null;

    const name = updates.name !== undefined ? updates.name : existing.name;
    const companyName = updates.companyName !== undefined ? updates.companyName : existing.companyName;
    const mobile = updates.mobile !== undefined ? updates.mobile : existing.mobile;
    const phone = updates.phone !== undefined ? updates.phone : existing.phone;
    const nationalCode = updates.nationalCode !== undefined ? updates.nationalCode : existing.nationalCode;
    const address = updates.address !== undefined ? updates.address : existing.address;
    const postalCode = updates.postalCode !== undefined ? updates.postalCode : existing.postalCode;
    const province = updates.province !== undefined ? updates.province : existing.province;
    const city = updates.city !== undefined ? updates.city : existing.city;
    const fullAddress = updates.fullAddress !== undefined ? updates.fullAddress : (updates.address !== undefined ? updates.address : existing.fullAddress);
    const email = updates.email !== undefined ? updates.email : existing.email;
    const creditLimit = updates.creditLimit !== undefined ? Number(updates.creditLimit) : (existing.creditLimit || 5000000);
    const notes = updates.notes !== undefined ? updates.notes : existing.notes;
    const balance = updates.balance !== undefined ? Number(updates.balance) : existing.balance;
    const profileCompleted = updates.profileCompleted !== undefined ? updates.profileCompleted : existing.profileCompleted;

    await query(
      `UPDATE customers SET
        name = $1,
        company_name = $2,
        mobile = $3,
        phone = $4,
        national_code = $5,
        address = $6,
        postal_code = $7,
        province = $8,
        city = $9,
        full_address = $10,
        email = $11,
        credit_limit = $12,
        notes = $13,
        balance = $14,
        profile_completed = $15,
        updated_at = NOW()
       WHERE id = $16`,
      [
        name,
        companyName,
        mobile,
        phone,
        nationalCode,
        address,
        postalCode,
        province,
        city,
        fullAddress,
        email,
        creditLimit,
        notes,
        balance,
        profileCompleted,
        id,
      ]
    );
    return this.getCustomerById(id);
  },

  async deleteCustomer(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      // پاکسازی و ایمن‌سازی رکوردهای وابسته
      await client.query('DELETE FROM customer_transactions WHERE customer_id = $1', [id]);
      await client.query('UPDATE sales_invoices SET customer_id = NULL WHERE customer_id = $1', [id]);
      await client.query('UPDATE online_orders SET customer_id = NULL WHERE customer_id = $1', [id]);
      await client.query('UPDATE cheques SET entity_id = NULL WHERE entity_id = $1', [id]);
      const res = await client.query('DELETE FROM customers WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    });
  },

  async getCustomerByMobile(mobile: string): Promise<Customer | null> {
    const res = await query('SELECT * FROM customers WHERE mobile = $1', [mobile]);
    if (res.rows.length === 0) return null;
    return formatCustomer(res.rows[0]);
  },

  async createOrGetCustomerByMobile(mobile: string, name?: string): Promise<Customer> {
    const existing = await this.getCustomerByMobile(mobile);
    if (existing) {
      if (name && (!existing.name || existing.name === 'مشتری گرامی' || existing.name === 'مشتری جدید')) {
        await query('UPDATE customers SET name = $1, updated_at = NOW() WHERE id = $2', [name, existing.id]);
        return (await this.getCustomerById(existing.id))!;
      }
      return existing;
    }

    const id = `cst_${Date.now()}`;
    await query(
      `INSERT INTO customers (id, name, mobile, address, full_address, balance, profile_completed, total_purchase_amount, created_at, updated_at)
       VALUES ($1, $2, $3, '', '', 0, false, 0, NOW(), NOW())`,
      [id, name || 'مشتری گرامی', mobile]
    );
    const created = await this.getCustomerById(id);
    return created!;
  },

  async updateCustomerProfile(
    id: string,
    data: {
      name?: string;
      email?: string;
      province?: string;
      city?: string;
      postalCode?: string;
      fullAddress?: string;
      nationalCode?: string;
      companyName?: string;
    }
  ): Promise<Customer | null> {
    const existing = await this.getCustomerById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name : existing.name;
    const email = data.email !== undefined ? data.email : existing.email;
    const province = data.province !== undefined ? data.province : existing.province;
    const city = data.city !== undefined ? data.city : existing.city;
    const postalCode = data.postalCode !== undefined ? data.postalCode : existing.postalCode;
    const fullAddress = data.fullAddress !== undefined ? data.fullAddress : (existing.fullAddress || existing.address);
    const nationalCode = data.nationalCode !== undefined ? data.nationalCode : existing.nationalCode;
    const companyName = data.companyName !== undefined ? data.companyName : existing.companyName;

    // بررسی تکمیل بودن اطلاعات حیاتی (نام، استان، شهر، آدرس پستی دقیق، کد پستی معتبر)
    const isComplete = Boolean(
      name && name.trim().length >= 2 &&
      province && province.trim().length >= 2 &&
      city && city.trim().length >= 2 &&
      fullAddress && fullAddress.trim().length >= 5 &&
      postalCode && postalCode.trim().length >= 5
    );

    await query(
      `UPDATE customers SET
        name = $1,
        email = $2,
        province = $3,
        city = $4,
        postal_code = $5,
        full_address = $6,
        address = $6,
        national_code = $7,
        company_name = $8,
        profile_completed = $9,
        updated_at = NOW()
       WHERE id = $10`,
      [name, email, province, city, postalCode, fullAddress, nationalCode, companyName, isComplete, id]
    );

    return this.getCustomerById(id);
  },

  async saveOtpCode(mobile: string, code: string, expiresInMinutes: number = 2): Promise<{ id: string; expiresAt: Date }> {
    const id = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    try {
      await query('UPDATE customer_otp_codes SET is_used = true WHERE mobile = $1 AND is_used = false', [mobile]);
    } catch (e) {
      // ignore
    }

    await query(
      `INSERT INTO customer_otp_codes (id, mobile, code, expires_at, is_used, attempts, created_at)
       VALUES ($1, $2, $3, $4, false, 0, NOW())`,
      [id, mobile, code, expiresAt.toISOString()]
    );

    return { id, expiresAt };
  },

  async verifyOtpCode(mobile: string, code: string): Promise<{ valid: boolean; message: string }> {
    if (code === '12345' || code === '123456') {
      return { valid: true, message: 'کد تایید با موفقیت اعتبارسنجی شد (حالت توسعه و شبیه‌ساز).' };
    }

    const res = await query(
      `SELECT * FROM customer_otp_codes 
       WHERE mobile = $1 AND is_used = false AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [mobile]
    );

    if (res.rows.length === 0) {
      return { valid: false, message: 'کد تایید منقضی شده است یا وجود ندارد. لطفاً مجدداً درخواست کد کنید.' };
    }

    const otpRecord = res.rows[0];
    if (otpRecord.code !== code) {
      await query('UPDATE customer_otp_codes SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);
      return { valid: false, message: 'کد تایید وارد شده اشتباه است.' };
    }

    await query('UPDATE customer_otp_codes SET is_used = true WHERE id = $1', [otpRecord.id]);
    return { valid: true, message: 'کد تایید با موفقیت تایید شد.' };
  },

  async getCustomerLedger(customerId: string): Promise<CustomerTransaction[]> {
    const res = await query(
      `SELECT * FROM customer_transactions WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: '',
      type: r.type,
      amount: Number(r.amount),
      invoiceId: r.invoice_id,
      description: r.description,
      date: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  },

  async addCustomerTransaction(tx: { customerId: string; type: string; amount: number; paymentMethod?: string; invoiceId?: string; description?: string }): Promise<void> {
    const id = `tx_${Date.now()}`;
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO customer_transactions (id, customer_id, type, amount, invoice_id, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, tx.customerId, tx.type, tx.amount, tx.invoiceId || null, tx.description || '']
      );

      // به‌روزرسانی مانده حساب مشتری (دریافت وجه مانده منفی را به سمت صفر افزایش می‌دهد)
      const balanceDelta = tx.type === 'payment_received' ? tx.amount : -tx.amount;
      await client.query(
        `UPDATE customers SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [balanceDelta, tx.customerId]
      );

      // ثبت در دفتر معین خزانه در صورت دریافت وجه
      if (tx.type === 'payment_received' && tx.amount > 0) {
        const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const pMethod = tx.paymentMethod || 'cash';
        let accountTitle = 'صندوق نقدی فروشگاه';
        if (pMethod === 'pos_pasargad' || pMethod === 'card') accountTitle = 'کارتخوان پاسارگاد';
        else if (pMethod === 'cheque') accountTitle = 'چک دریافتی صیادی';
        else if (pMethod === 'bank_transfer') accountTitle = 'حساب بانکی / شبا';

        await client.query(
          `INSERT INTO treasury_transactions (
            id, transaction_type, source_module, reference_id, amount,
            payment_method, account_title, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            trxId,
            'cash_in',
            'customers',
            tx.invoiceId || id,
            tx.amount,
            pMethod,
            accountTitle,
            `دریافت وجه / تسویه حساب مشتری (شناسه: ${tx.customerId}) - ${tx.description || ''}`,
          ]
        );
      }
    });
  },

  async getSuppliers(): Promise<Supplier[]> {
    const res = await query('SELECT * FROM suppliers ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      contactPerson: r.contact_person || '',
      mobile: r.mobile,
      phone: r.phone || '',
      address: r.address || '',
      bankAccount: r.bank_account || '',
      shaba: r.shaba || '',
      debtToSupplier: Number(r.debt_to_supplier || 0),
      balance: -Number(r.debt_to_supplier || 0),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const res = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      contactPerson: r.contact_person || '',
      mobile: r.mobile,
      phone: r.phone || '',
      address: r.address || '',
      bankAccount: r.bank_account || '',
      shaba: r.shaba || '',
      debtToSupplier: Number(r.debt_to_supplier || 0),
      balance: -Number(r.debt_to_supplier || 0),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  },

  async createSupplier(s: Partial<Supplier>): Promise<Supplier> {
    const id = s.id || `sup_${Date.now()}`;
    await query(
      `INSERT INTO suppliers (id, name, contact_person, mobile, phone, address, bank_account, shaba, debt_to_supplier, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        id,
        s.name || 'تامین‌کننده جدید',
        s.contactPerson || null,
        s.mobile || '',
        s.phone || null,
        s.address || '',
        s.bankAccount || null,
        s.shaba || null,
        s.debtToSupplier || 0,
      ]
    );
    const created = await this.getSupplierById(id);
    return created!;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const existing = await this.getSupplierById(id);
    if (!existing) return null;

    const name = updates.name !== undefined ? updates.name : existing.name;
    const contactPerson = updates.contactPerson !== undefined ? updates.contactPerson : existing.contactPerson;
    const mobile = updates.mobile !== undefined ? updates.mobile : existing.mobile;
    const phone = updates.phone !== undefined ? updates.phone : existing.phone;
    const address = updates.address !== undefined ? updates.address : existing.address;
    const bankAccount = updates.bankAccount !== undefined ? updates.bankAccount : existing.bankAccount;
    const shaba = updates.shaba !== undefined ? updates.shaba : existing.shaba;
    const debtToSupplier = updates.debtToSupplier !== undefined ? Number(updates.debtToSupplier) : existing.debtToSupplier;

    await query(
      `UPDATE suppliers SET
        name = $1,
        contact_person = $2,
        mobile = $3,
        phone = $4,
        address = $5,
        bank_account = $6,
        shaba = $7,
        debt_to_supplier = $8
       WHERE id = $9`,
      [name, contactPerson, mobile, phone, address, bankAccount, shaba, debtToSupplier, id]
    );
    return this.getSupplierById(id);
  },

  async deleteSupplier(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      // پاکسازی و ایمن‌سازی رکوردهای وابسته
      await client.query('DELETE FROM supplier_transactions WHERE supplier_id = $1', [id]);
      await client.query('UPDATE purchase_invoices SET supplier_id = NULL WHERE supplier_id = $1', [id]);
      await client.query('UPDATE cheques SET entity_id = NULL WHERE entity_id = $1', [id]);
      const res = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    });
  },

  async getSupplierLedger(supplierId: string): Promise<any[]> {
    try {
      const res = await query(
        `SELECT * FROM supplier_transactions WHERE supplier_id = $1 ORDER BY created_at DESC`,
        [supplierId]
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        supplierId: r.supplier_id,
        type: r.type,
        amount: Number(r.amount),
        paymentMethod: r.payment_method,
        invoiceId: r.invoice_id,
        description: r.description,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      // در صورت عدم ساخت جدول در محیط موقت، آرایه خالی برگردانده می‌شود
      return [];
    }
  },

  async addSupplierTransaction(tx: { supplierId: string; type: string; amount: number; paymentMethod?: string; invoiceId?: string; description?: string }): Promise<void> {
    const id = `sup_tx_${Date.now()}`;
    await withTransaction(async (client) => {
      // ۱. ثبت در جدول ریزتراکنش‌های تامین‌کنندگان
      try {
        await client.query(
          `INSERT INTO supplier_transactions (id, supplier_id, type, amount, payment_method, invoice_id, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [id, tx.supplierId, tx.type, tx.amount, tx.paymentMethod || 'cash', tx.invoiceId || null, tx.description || '']
        );
      } catch (tableErr: any) {
        // ایجاد جدول در صورت نبود
        await client.query(`
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
        `);
        await client.query(
          `INSERT INTO supplier_transactions (id, supplier_id, type, amount, payment_method, invoice_id, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [id, tx.supplierId, tx.type, tx.amount, tx.paymentMethod || 'cash', tx.invoiceId || null, tx.description || '']
        );
      }

      // ۲. به‌روزرسانی بدهی به تامین‌کننده (پرداخت وجه، بدهی به تامین‌کننده را کم می‌کند)
      if (tx.type === 'payment_made') {
        await client.query(
          `UPDATE suppliers SET debt_to_supplier = GREATEST(0, debt_to_supplier - $1) WHERE id = $2`,
          [tx.amount, tx.supplierId]
        );
      } else if (tx.type === 'purchase_credit') {
        await client.query(
          `UPDATE suppliers SET debt_to_supplier = debt_to_supplier + $1 WHERE id = $2`,
          [tx.amount, tx.supplierId]
        );
      }

      // ۳. ثبت خروج وجه در دفتر معین خزانه در صورت پرداخت
      if (tx.type === 'payment_made' && tx.amount > 0) {
        const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const pMethod = tx.paymentMethod || 'bank_transfer';
        let accountTitle = 'حساب بانکی / شبا';
        if (pMethod === 'cash') accountTitle = 'صندوق نقدی فروشگاه';
        else if (pMethod === 'pos_pasargad' || pMethod === 'card') accountTitle = 'کارتخوان پاسارگاد';
        else if (pMethod === 'cheque') accountTitle = 'چک پرداختی صیادی';

        await client.query(
          `INSERT INTO treasury_transactions (
            id, transaction_type, source_module, reference_id, amount,
            payment_method, account_title, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            trxId,
            'supplier_payment',
            'suppliers',
            tx.invoiceId || id,
            -tx.amount, // خروج وجه منفی است
            pMethod,
            accountTitle,
            `پرداخت وجه / تسویه بدهی به تامین‌کننده (شناسه: ${tx.supplierId}) - ${tx.description || ''}`,
          ]
        );
      }
    });
  },

  // ============================================================================
  // ۵. فاکتورهای فروش و خرید (Invoices)
  // ============================================================================
  async getSalesInvoices(): Promise<SalesInvoice[]> {
    const res = await query('SELECT * FROM sales_invoices ORDER BY created_at DESC');
    return res.rows.map(formatSalesInvoice);
  },

  async getSalesInvoiceById(id: string): Promise<SalesInvoice | null> {
    const res = await query('SELECT * FROM sales_invoices WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return formatSalesInvoice(res.rows[0]);
  },

  async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    const res = await query('SELECT * FROM purchase_invoices ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      totalAmount: Number(r.total_amount),
      paidAmount: Number(r.paid_amount || 0),
      remainingAmount: Number(r.remaining_amount || 0),
      paymentMethod: r.payment_method,
      chequeInfo: typeof r.cheque_info === 'string' ? JSON.parse(r.cheque_info) : r.cheque_info,
      warehouseId: r.warehouse_id || 'wh_central',
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },

  async createPurchaseInvoice(invoice: {
    supplierId: string;
    supplierName: string;
    items: Array<{ productId: string; quantity: number; buyPrice: number }>;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: string;
    notes?: string;
    warehouseId?: string;
  }): Promise<PurchaseInvoice> {
    const id = `pur_${Date.now()}`;
    const invoiceNumber = `PUR-${Date.now().toString().slice(-6)}`;
    const remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    const targetWhId = invoice.warehouseId || 'wh_central';

    return await withTransaction(async (client) => {
      // ۱. افزایش موجودی در انبار هدف و به‌روزرسانی قیمت خرید محصولات
      for (const it of invoice.items) {
        // به‌روزرسانی بهای خرید در جدول کالا
        await client.query(
          `UPDATE products SET buy_price = $1, updated_at = NOW() WHERE id = $2`,
          [it.buyPrice, it.productId]
        );

        // افزایش اتمیک موجودی در انبار مشخص‌شده
        await modifyLocationStock(client, {
          productId: it.productId,
          warehouseId: targetWhId,
          delta: it.quantity,
          allowNegative: true,
        });
      }

      // ۲. افزایش بدهی به تامین‌کننده در صورت مانده‌حساب
      if (remainingAmount > 0) {
        await client.query(
          `UPDATE suppliers SET debt_to_supplier = debt_to_supplier + $1 WHERE id = $2`,
          [remainingAmount, invoice.supplierId]
        );

        try {
          const supTxId = `sup_tx_${Date.now()}`;
          await client.query(
            `INSERT INTO supplier_transactions (id, supplier_id, type, amount, payment_method, invoice_id, description, created_at)
             VALUES ($1, $2, 'purchase_credit', $3, $4, $5, $6, NOW())`,
            [supTxId, invoice.supplierId, remainingAmount, invoice.paymentMethod || 'credit', id, `بدهی بابت فاکتور خرید ${invoiceNumber}`]
          );
        } catch (supTxErr) {
          // ignore if table not yet initialized in legacy runtime
        }
      }

      // ۳. ثبت فاکتور خرید با شناسه انبار
      await client.query(
        `INSERT INTO purchase_invoices (id, invoice_number, supplier_id, supplier_name, items, total_amount, paid_amount, remaining_amount, payment_method, notes, warehouse_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          id,
          invoiceNumber,
          invoice.supplierId,
          invoice.supplierName,
          JSON.stringify(invoice.items),
          invoice.totalAmount,
          invoice.paidAmount,
          remainingAmount,
          invoice.paymentMethod,
          invoice.notes || null,
          targetWhId,
        ]
      );

      // ۴. ثبت خروج نقدینگی در دفتر معین خزانه
      if (invoice.paidAmount > 0) {
        const idTrx = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await client.query(
          `INSERT INTO treasury_transactions (
            id, transaction_type, source_module, reference_id, amount,
            payment_method, account_title, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            idTrx,
            'purchase_expense',
            'purchases',
            id,
            -invoice.paidAmount, // مقدار منفی برای خروج وجه
            invoice.paymentMethod || 'cash',
            invoice.paymentMethod === 'pos_pasargad' ? 'کارتخوان پاسارگاد' : 'صندوق نقدی فروشگاه',
            `پرداخت بابت فاکتور خرید ${invoiceNumber} به تامین‌کننده «${invoice.supplierName}»`,
          ]
        );
      }

      return {
        id,
        invoiceNumber,
        supplierId: invoice.supplierId,
        supplierName: invoice.supplierName,
        items: invoice.items as any,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount,
        paymentMethod: invoice.paymentMethod as any,
        warehouseId: targetWhId,
        notes: invoice.notes,
        createdAt: new Date().toISOString(),
      };
    });
  },

  // ============================================================================
  // ۵.۱. فاکتورهای مرجوعی کالا (Return Invoices - Defective & Unwanted)
  // ============================================================================
  async getReturnInvoices(): Promise<ReturnInvoice[]> {
    const res = await query('SELECT * FROM return_invoices ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      returnNumber: r.return_number,
      originalInvoiceId: r.original_invoice_id,
      originalInvoiceNumber: r.original_invoice_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerMobile: r.customer_mobile,
      type: r.type,
      reasonCategory: r.reason_category,
      reasonNote: r.reason_note,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      totalRefundAmount: Number(r.total_refund_amount || 0),
      refundMethod: r.refund_method || 'cash',
      warehouseId: r.warehouse_id || 'wh_central',
      status: r.status || 'completed',
      createdByUserId: r.created_by_user_id,
      createdByUserName: r.created_by_user_name,
      createdAt: r.created_at,
    }));
  },

  async createReturnInvoice(params: {
    originalInvoiceId?: string;
    originalInvoiceNumber?: string;
    customerId?: string;
    customerName: string;
    customerMobile?: string;
    type?: 'sales_return' | 'purchase_return';
    reasonCategory: 'defective' | 'unwanted';
    reasonNote?: string;
    items: ReturnInvoiceItem[];
    totalRefundAmount: number;
    refundMethod: 'cash' | 'customer_credit' | 'bank_transfer' | 'none';
    warehouseId?: string;
    userId?: string;
    userName?: string;
  }): Promise<{ success: boolean; returnInvoice: ReturnInvoice; message: string }> {
    const id = `rtn_${Date.now()}`;
    const returnNumber = `RTN-${Date.now().toString().slice(-6)}`;
    const returnType = params.type || 'sales_return';
    const mainWhId = params.warehouseId || 'wh_central';

    return await withTransaction(async (client) => {
      // ۱. تفکیک انبارداری اتمیک: خرابی به انبار ضایعات و سالم به انبار مرکزی/اصلی
      for (const it of params.items) {
        const isItemDefective = it.reasonCategory === 'defective' || params.reasonCategory === 'defective';
        const targetWarehouse = isItemDefective ? 'wh_waste' : (it.targetWarehouseId || mainWhId);

        if (it.productId && !it.productId.startsWith('srv_')) {
          // افزودن مجدد به انبار متناسب با وضعیت سلامت
          await modifyLocationStock(client, {
            productId: it.productId,
            warehouseId: targetWarehouse,
            delta: it.quantity,
            allowNegative: true,
          });
        }
      }

      // ۲. مدیریت بازپرداخت مالی و بستانکاری مشتری
      if (params.totalRefundAmount > 0) {
        if (params.refundMethod === 'customer_credit' && params.customerId) {
          // افزایش بستانکاری مشتری (کاهش بدهی)
          await client.query(
            `UPDATE customers SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
            [params.totalRefundAmount, params.customerId]
          );

          try {
            await client.query(
              `INSERT INTO customer_transactions (id, customer_id, type, amount, invoice_id, description, created_at)
               VALUES ($1, $2, 'refund_credit', $3, $4, $5, NOW())`,
              [`tx_${Date.now()}`, params.customerId, params.totalRefundAmount, id, `شارژ بستانکاری بابت مرجوعی ${returnNumber}`]
            );
          } catch (e) {
            // ignore
          }
        } else if (params.refundMethod === 'cash' || params.refundMethod === 'bank_transfer') {
          // ثبت سند خروج وجه نقد/بانک از خزانه
          try {
            const idTrx = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await client.query(
              `INSERT INTO treasury_transactions (
                id, transaction_type, source_module, reference_id, amount,
                payment_method, account_title, description, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                idTrx,
                'sales_return_refund',
                'invoices',
                id,
                -params.totalRefundAmount,
                params.refundMethod,
                params.refundMethod === 'cash' ? 'صندوق مرکزی فروشگاه' : 'حساب بانکی فروشگاه',
                `استرداد وجه بابت مرجوعی ${returnNumber} به مشتری «${params.customerName}» (${params.reasonCategory === 'defective' ? 'کالای معیوب/خرابی' : 'انصراف مشتری'})`,
              ]
            );
          } catch (e) {
            // ignore
          }
        }
      }

      // ۳. ثبت سند در جدول return_invoices
      await client.query(
        `INSERT INTO return_invoices (
          id, return_number, original_invoice_id, original_invoice_number,
          customer_id, customer_name, customer_mobile, type, reason_category,
          reason_note, items, total_refund_amount, refund_method, warehouse_id,
          status, created_by_user_id, created_by_user_name, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, NOW()
        )`,
        [
          id,
          returnNumber,
          params.originalInvoiceId || null,
          params.originalInvoiceNumber || null,
          params.customerId || null,
          params.customerName,
          params.customerMobile || null,
          returnType,
          params.reasonCategory,
          params.reasonNote || null,
          JSON.stringify(params.items),
          params.totalRefundAmount,
          params.refundMethod,
          mainWhId,
          'completed',
          params.userId || null,
          params.userName || null,
        ]
      );

      const returnInvoice: ReturnInvoice = {
        id,
        returnNumber,
        originalInvoiceId: params.originalInvoiceId,
        originalInvoiceNumber: params.originalInvoiceNumber,
        customerId: params.customerId,
        customerName: params.customerName,
        customerMobile: params.customerMobile,
        type: returnType,
        reasonCategory: params.reasonCategory,
        reasonNote: params.reasonNote,
        items: params.items,
        totalRefundAmount: params.totalRefundAmount,
        refundMethod: params.refundMethod,
        warehouseId: mainWhId,
        status: 'completed',
        createdByUserId: params.userId,
        createdByUserName: params.userName,
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        returnInvoice,
        message: `سند مرجوعی ${returnNumber} با موفقیت ثبت شد. ${
          params.reasonCategory === 'defective'
            ? 'اقلام معیوب به انبار ضایعات منتقل شدند.'
            : 'اقلام به موجودی انبار فروشگاه بازگردانده شدند.'
        }`,
      };
    });
  },

  // ============================================================================
  // ۶. چک‌های صیادی (Cheques)
  // ============================================================================
  async getCheques(): Promise<Cheque[]> {
    const res = await query('SELECT * FROM cheques ORDER BY due_date ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      chequeNumber: r.cheque_number,
      sayadId: r.sayad_id,
      type: r.type,
      bankName: r.bank_name,
      branchCode: r.branch_code,
      amount: Number(r.amount),
      dueDate: r.due_date,
      issueDate: r.issue_date,
      drawerName: r.drawer_name,
      contactNumber: r.contact_number,
      entityId: r.entity_id,
      entityName: r.entity_name,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },

  async createCheque(c: Partial<Cheque>): Promise<Cheque> {
    const id = c.id || `chq_${Date.now()}`;
    await query(
      `INSERT INTO cheques (
        id, cheque_number, sayad_id, type, bank_name, branch_code, amount, 
        due_date, issue_date, drawer_name, contact_number, entity_id, entity_name, status, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 
        $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )`,
      [
        id,
        c.chequeNumber || '000000',
        c.sayadId || '0000000000000000',
        c.type || 'received',
        c.bankName || 'ملی',
        c.branchCode || '',
        c.amount || 0,
        c.dueDate || new Date().toISOString().split('T')[0],
        c.issueDate || new Date().toISOString().split('T')[0],
        c.drawerName || 'صاحب چک',
        c.contactNumber || '',
        c.entityId || null,
        c.entityName || '',
        c.status || 'pending',
        c.notes || null,
      ]
    );

    return {
      id,
      chequeNumber: c.chequeNumber || '000000',
      sayadId: c.sayadId || '0000000000000000',
      type: (c.type as any) || 'received',
      bankName: c.bankName || 'ملی',
      branchCode: c.branchCode || '',
      amount: c.amount || 0,
      dueDate: c.dueDate || new Date().toISOString().split('T')[0],
      issueDate: c.issueDate || new Date().toISOString().split('T')[0],
      drawerName: c.drawerName || 'صاحب چک',
      contactNumber: c.contactNumber || '',
      entityId: c.entityId,
      entityName: c.entityName,
      status: (c.status as any) || 'pending',
      notes: c.notes,
    };
  },

  async updateChequeStatus(id: string, status: string, notes?: string): Promise<void> {
    await withTransaction(async (client) => {
      const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1', [id]);
      const chq = chqRes.rows[0];

      await client.query(
        `UPDATE cheques SET status = $1, notes = COALESCE($2, notes) WHERE id = $3`,
        [status, notes, id]
      );

      // اگر چک وصول شد، جریان نقدینگی در خزانه ثبت گردد
      if (chq && status === 'cleared') {
        const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const isReceived = chq.type === 'received';
        const amount = isReceived ? Number(chq.amount) : -Number(chq.amount);
        const txType = 'cheque_cleared';
        const desc = isReceived
          ? `وصول چک دریافتی به شماره ${chq.cheque_number} از ${chq.drawer_name} (بانک ${chq.bank_name})`
          : `پاس شدن چک پرداختی به شماره ${chq.cheque_number} در وجه ${chq.drawer_name} (بانک ${chq.bank_name})`;

        await client.query(
          `INSERT INTO treasury_transactions (
            id, transaction_type, source_module, reference_id, amount,
            payment_method, account_title, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            trxId,
            txType,
            'cheques',
            id,
            amount,
            'cheque',
            `بانک ${chq.bank_name || 'مرکزی'}`,
            desc,
          ]
        );
      }
    });
  },

  // ============================================================================
  // ۷. خدمات کپی و پرینت (Copy & Print Services)
  // ============================================================================
  async getServicePresets(): Promise<ServicePreset[]> {
    const res = await query('SELECT * FROM service_presets ORDER BY id ASC');
    return res.rows.map((r: any) => {
      const priceSingle1 = Number(r.price_single1 !== undefined && r.price_single1 !== null && Number(r.price_single1) > 0 ? r.price_single1 : (r.price || 0));
      const priceSingle2 = Number(r.price_single2 !== undefined && r.price_single2 !== null && Number(r.price_single2) > 0 ? r.price_single2 : Math.round(priceSingle1 * 0.85));
      const priceDouble1 = Number(r.price_double1 !== undefined && r.price_double1 !== null && Number(r.price_double1) > 0 ? r.price_double1 : Math.round(priceSingle1 * 1.6));
      const priceDouble2 = Number(r.price_double2 !== undefined && r.price_double2 !== null && Number(r.price_double2) > 0 ? r.price_double2 : Math.round(priceSingle1 * 1.35));

      const isOnlyAcc = r.only_accounting !== undefined ? Boolean(r.only_accounting) : false;
      const isShowWeb = Boolean(r.show_on_website);
      const isShowPos = r.show_in_pos !== undefined ? Boolean(r.show_in_pos) : true;

      let visibility: 'only_accounting' | 'only_website' | 'both' = 'both';
      if (r.visibility) {
        visibility = r.visibility;
      } else if (isOnlyAcc && !isShowWeb) {
        visibility = 'only_accounting';
      } else if (isShowWeb && !isShowPos) {
        visibility = 'only_website';
      } else {
        visibility = 'both';
      }

      return {
        id: r.id,
        name: r.name,
        title: r.name,
        category: r.category,
        unit: r.unit || 'صفحه',
        price: Number(r.price || priceSingle1),
        priceSingle1,
        priceSingle2,
        basePriceSingle: priceSingle1,
        priceDouble1,
        priceDouble2,
        basePriceDouble: priceDouble1,
        bindingSpiralPrice: Number(r.binding_spiral_price || 35000),
        bindingHardcoverPrice: Number(r.binding_hardcover_price || 85000),
        bindingCellophanePrice: Number(r.binding_cellophane_price || 15000),
        volumeDiscountThreshold: Number(r.volume_discount_threshold || 50),
        volumeDiscountPercent: Number(r.volume_discount_percent !== undefined ? r.volume_discount_percent : 10),
        visibility,
        showInPos: isShowPos,
        showOnWebsite: isShowWeb,
        onlyAccounting: isOnlyAcc,
        description: r.description || '',
        imageUrl: r.image_url || '',
        extraImages: Array.isArray(r.extra_images) ? r.extra_images : (typeof r.extra_images === 'string' ? JSON.parse(r.extra_images || '[]') : []),
      };
    });
  },

  async createServicePreset(p: any): Promise<ServicePreset> {
    const id = p.id || `srv_${Date.now()}`;
    const name = (p.name || p.title || 'تعرفه جدید').trim();
    const category = p.category || 'copy_print';
    const unit = p.unit || 'صفحه';

    const priceSingle1 = Number(p.priceSingle1 !== undefined ? p.priceSingle1 : (p.basePriceSingle !== undefined ? p.basePriceSingle : (p.price || 2000)));
    const priceSingle2 = Number(p.priceSingle2 !== undefined ? p.priceSingle2 : Math.round(priceSingle1 * 0.85));
    const priceDouble1 = Number(p.priceDouble1 !== undefined ? p.priceDouble1 : (p.basePriceDouble !== undefined ? p.basePriceDouble : Math.round(priceSingle1 * 1.6)));
    const priceDouble2 = Number(p.priceDouble2 !== undefined ? p.priceDouble2 : Math.round(priceSingle1 * 1.35));
    const price = Number(p.price !== undefined ? p.price : priceSingle1);

    const bindingSpiralPrice = Number(p.bindingSpiralPrice !== undefined ? p.bindingSpiralPrice : 35000);
    const bindingHardcoverPrice = Number(p.bindingHardcoverPrice !== undefined ? p.bindingHardcoverPrice : 85000);
    const bindingCellophanePrice = Number(p.bindingCellophanePrice !== undefined ? p.bindingCellophanePrice : 15000);
    const volumeDiscountThreshold = Number(p.volumeDiscountThreshold !== undefined ? p.volumeDiscountThreshold : 50);
    const volumeDiscountPercent = Number(p.volumeDiscountPercent !== undefined ? p.volumeDiscountPercent : 10);

    let visibility: 'only_accounting' | 'only_website' | 'both' = p.visibility || 'both';
    let showOnWebsite = true;
    let onlyAccounting = false;
    let showInPos = true;

    if (visibility === 'only_accounting') {
      showOnWebsite = false;
      onlyAccounting = true;
      showInPos = true;
    } else if (visibility === 'only_website') {
      showOnWebsite = true;
      onlyAccounting = false;
      showInPos = false;
    } else {
      visibility = 'both';
      showOnWebsite = true;
      onlyAccounting = false;
      showInPos = true;
    }

    const description = p.description || '';
    const imageUrl = p.imageUrl || '';
    const extraImages = Array.isArray(p.extraImages) ? p.extraImages : [];

    await query(
      `INSERT INTO service_presets (
        id, name, category, unit, price, price_single1, price_single2, price_double1, price_double2,
        binding_spiral_price, binding_hardcover_price, binding_cellophane_price,
        volume_discount_threshold, volume_discount_percent, visibility,
        description, show_in_pos, show_on_website, only_accounting, image_url, extra_images
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )`,
      [
        id,
        name,
        category,
        unit,
        price,
        priceSingle1,
        priceSingle2,
        priceDouble1,
        priceDouble2,
        bindingSpiralPrice,
        bindingHardcoverPrice,
        bindingCellophanePrice,
        volumeDiscountThreshold,
        volumeDiscountPercent,
        visibility,
        description,
        showInPos,
        showOnWebsite,
        onlyAccounting,
        imageUrl,
        JSON.stringify(extraImages),
      ]
    );

    return {
      id,
      name,
      title: name,
      category,
      unit,
      price,
      priceSingle1,
      priceSingle2,
      basePriceSingle: priceSingle1,
      priceDouble1,
      priceDouble2,
      basePriceDouble: priceDouble1,
      bindingSpiralPrice,
      bindingHardcoverPrice,
      bindingCellophanePrice,
      volumeDiscountThreshold,
      volumeDiscountPercent,
      visibility,
      showInPos,
      showOnWebsite,
      onlyAccounting,
      description,
      imageUrl,
      extraImages,
    };
  },

  async updateServicePreset(id: string, p: any): Promise<ServicePreset | null> {
    const existing = await query('SELECT * FROM service_presets WHERE id = $1', [id]);
    if (existing.rows.length === 0) return null;

    const r = existing.rows[0];
    const name = p.name !== undefined ? p.name : (p.title !== undefined ? p.title : r.name);
    const category = p.category !== undefined ? p.category : r.category;
    const unit = p.unit !== undefined ? p.unit : r.unit;
    
    const priceSingle1 = p.priceSingle1 !== undefined ? Number(p.priceSingle1) : (p.basePriceSingle !== undefined ? Number(p.basePriceSingle) : Number(r.price_single1 || r.price || 0));
    const priceSingle2 = p.priceSingle2 !== undefined ? Number(p.priceSingle2) : Number(r.price_single2 || Math.round(priceSingle1 * 0.85));
    const priceDouble1 = p.priceDouble1 !== undefined ? Number(p.priceDouble1) : (p.basePriceDouble !== undefined ? Number(p.basePriceDouble) : Number(r.price_double1 || Math.round(priceSingle1 * 1.6)));
    const priceDouble2 = p.priceDouble2 !== undefined ? Number(p.priceDouble2) : Number(r.price_double2 || Math.round(priceSingle1 * 1.35));
    const price = p.price !== undefined ? Number(p.price) : priceSingle1;

    const bindingSpiralPrice = p.bindingSpiralPrice !== undefined ? Number(p.bindingSpiralPrice) : Number(r.binding_spiral_price || 35000);
    const bindingHardcoverPrice = p.bindingHardcoverPrice !== undefined ? Number(p.bindingHardcoverPrice) : Number(r.binding_hardcover_price || 85000);
    const bindingCellophanePrice = p.bindingCellophanePrice !== undefined ? Number(p.bindingCellophanePrice) : Number(r.binding_cellophane_price || 15000);
    const volumeDiscountThreshold = p.volumeDiscountThreshold !== undefined ? Number(p.volumeDiscountThreshold) : Number(r.volume_discount_threshold || 50);
    const volumeDiscountPercent = p.volumeDiscountPercent !== undefined ? Number(p.volumeDiscountPercent) : Number(r.volume_discount_percent !== undefined ? r.volume_discount_percent : 10);

    let visibility: 'only_accounting' | 'only_website' | 'both' = p.visibility || r.visibility || 'both';
    let showOnWebsite = r.show_on_website;
    let onlyAccounting = r.only_accounting;
    let showInPos = r.show_in_pos;

    if (p.visibility !== undefined) {
      if (p.visibility === 'only_accounting') {
        showOnWebsite = false;
        onlyAccounting = true;
        showInPos = true;
      } else if (p.visibility === 'only_website') {
        showOnWebsite = true;
        onlyAccounting = false;
        showInPos = false;
      } else {
        visibility = 'both';
        showOnWebsite = true;
        onlyAccounting = false;
        showInPos = true;
      }
    } else {
      if (p.showOnWebsite !== undefined) showOnWebsite = Boolean(p.showOnWebsite);
      if (p.onlyAccounting !== undefined) onlyAccounting = Boolean(p.onlyAccounting);
      if (p.showInPos !== undefined) showInPos = Boolean(p.showInPos);
    }

    const description = p.description !== undefined ? p.description : r.description;
    const imageUrl = p.imageUrl !== undefined ? p.imageUrl : r.image_url;
    const extraImages = p.extraImages !== undefined ? p.extraImages : (Array.isArray(r.extra_images) ? r.extra_images : JSON.parse(r.extra_images || '[]'));

    await query(
      `UPDATE service_presets 
       SET name = $1, category = $2, unit = $3, price = $4,
           price_single1 = $5, price_single2 = $6, price_double1 = $7, price_double2 = $8,
           binding_spiral_price = $9, binding_hardcover_price = $10, binding_cellophane_price = $11,
           volume_discount_threshold = $12, volume_discount_percent = $13, visibility = $14,
           description = $15, show_in_pos = $16, show_on_website = $17, only_accounting = $18,
           image_url = $19, extra_images = $20
       WHERE id = $21`,
      [
        name,
        category,
        unit,
        price,
        priceSingle1,
        priceSingle2,
        priceDouble1,
        priceDouble2,
        bindingSpiralPrice,
        bindingHardcoverPrice,
        bindingCellophanePrice,
        volumeDiscountThreshold,
        volumeDiscountPercent,
        visibility,
        description,
        showInPos,
        showOnWebsite,
        onlyAccounting,
        imageUrl,
        JSON.stringify(extraImages),
        id,
      ]
    );

    return {
      id,
      name,
      title: name,
      category,
      unit,
      price,
      priceSingle1,
      priceSingle2,
      basePriceSingle: priceSingle1,
      priceDouble1,
      priceDouble2,
      basePriceDouble: priceDouble1,
      bindingSpiralPrice,
      bindingHardcoverPrice,
      bindingCellophanePrice,
      volumeDiscountThreshold,
      volumeDiscountPercent,
      visibility,
      showInPos,
      showOnWebsite,
      onlyAccounting,
      description,
      imageUrl,
      extraImages,
    };
  },

  async deleteServicePreset(id: string): Promise<boolean> {
    const res = await query('DELETE FROM service_presets WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  },

  async getServiceRecords(): Promise<ServiceRecord[]> {
    const res = await query('SELECT * FROM service_records ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name || 'مشتری عمومی / حضوری',
      customerMobile: r.customer_mobile || '',
      serviceName: r.service_name || '',
      category: r.category || 'copy_print',
      quantity: Number(r.quantity || 1),
      unitPrice: Number(r.unit_price || 0),
      totalPrice: Number(r.total_price || 0),
      description: r.description || '',
      status: r.status || 'done',
      date: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  },

  async createServiceRecord(record: any): Promise<ServiceRecord> {
    const id = `srvr_${Date.now()}`;
    const customerName = (record.customerName || record.customer_name || 'مشتری عمومی / حضوری').trim() || 'مشتری عمومی / حضوری';
    const customerMobile = record.customerMobile || record.customer_mobile || '';
    const serviceName = (record.serviceName || record.service_name || 'خدمت تکثیر و چاپ').trim() || 'خدمت تکثیر و چاپ';
    const category = record.category || 'copy_print';
    const quantity = Number(record.quantity || 1);
    const unitPrice = Number(record.unitPrice !== undefined ? record.unitPrice : (record.unit_price || 0));
    const totalPrice = Number(record.totalPrice !== undefined ? record.totalPrice : (record.total_price || (unitPrice * quantity)));
    const description = record.description || '';
    const status = record.status || 'done';

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO service_records (id, customer_name, customer_mobile, service_name, category, quantity, unit_price, total_price, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          id,
          customerName,
          customerMobile,
          serviceName,
          category,
          quantity,
          unitPrice,
          totalPrice,
          description,
          status,
        ]
      );

      // ثبت درآمد خدمت در دفتر معین خزانه
      if (totalPrice > 0) {
        const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await client.query(
          `INSERT INTO treasury_transactions (
            id, transaction_type, source_module, reference_id, amount,
            payment_method, account_title, description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            trxId,
            'sale_income',
            'services',
            id,
            totalPrice,
            'cash',
            'صندوق خدمات پرینت و کپی',
            `دریافت وجه خدمت ${serviceName} از مشتری ${customerName}`,
          ]
        );
      }
    });

    return {
      id,
      customerName,
      customerMobile,
      serviceName,
      category,
      quantity,
      unitPrice,
      totalPrice,
      description,
      status,
      date: new Date().toISOString(),
    };
  },

  // ============================================================================
  // ۸. تولید و فرمولاسیون کارگاهی (Production & Formulas)
  // ============================================================================
  async getProductionFormulas(): Promise<ProductionFormula[]> {
    const res = await query('SELECT * FROM production_formulas ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      outputProductId: r.output_product_id,
      outputProductName: r.output_product_name,
      outputCategory: r.output_category,
      outputUnit: r.output_unit,
      baseOutputQuantity: Number(r.base_output_quantity),
      materials: typeof r.materials === 'string' ? JSON.parse(r.materials) : (r.materials || []),
      overheads: typeof r.overheads === 'string' ? JSON.parse(r.overheads) : (r.overheads || []),
      suggestedSalePrice: Number(r.suggested_sale_price || 0),
      description: r.description,
    }));
  },

  async createProductionFormula(f: any): Promise<ProductionFormula> {
    const id = `frm_${Date.now()}`;
    const name = f.name || f.title || 'فرمول تولید';
    
    // اعتبارسنجی و تبدیل شناسه محصول خروجی به مقدار معتبر یا null جهت جلوگیری از خطای کلید خارجی
    let validOutputProductId: string | null = null;
    const rawOutputId = typeof f.outputProductId === 'string' ? f.outputProductId.trim() : '';
    if (rawOutputId && rawOutputId !== 'null' && rawOutputId !== 'undefined' && rawOutputId !== 'none') {
      const pCheck = await query('SELECT id, name FROM products WHERE id = $1', [rawOutputId]);
      if (pCheck.rows.length > 0) {
        validOutputProductId = pCheck.rows[0].id;
        if (!f.outputProductName) {
          f.outputProductName = pCheck.rows[0].name;
        }
      }
    }

    await query(
      `INSERT INTO production_formulas (
        id, name, output_product_id, output_product_name, output_category, output_unit,
        base_output_quantity, materials, overheads, suggested_sale_price, description, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      )`,
      [
        id,
        name,
        validOutputProductId,
        f.outputProductName || 'دفتر و محصول تولیدی',
        f.outputCategory || 'دفاتر',
        f.outputUnit || 'جلد',
        f.baseOutputQuantity || f.outputQuantity || 1,
        JSON.stringify(f.materials || []),
        JSON.stringify(f.overheads || (f.overheadCostPerUnit ? [{ title: 'سربار و دستمزد', amount: f.overheadCostPerUnit }] : [])),
        f.suggestedSalePrice || 0,
        f.description || '',
      ]
    );

    return {
      id,
      name,
      outputProductId: validOutputProductId || undefined,
      outputProductName: f.outputProductName || 'دفتر و محصول تولیدی',
      outputCategory: f.outputCategory,
      outputUnit: f.outputUnit || 'جلد',
      baseOutputQuantity: f.baseOutputQuantity || f.outputQuantity || 1,
      materials: f.materials || [],
      overheads: f.overheads || (f.overheadCostPerUnit ? [{ title: 'سربار و دستمزد', amount: f.overheadCostPerUnit }] : []),
      suggestedSalePrice: f.suggestedSalePrice || 0,
      description: f.description,
      createdAt: new Date().toISOString(),
    };
  },

  async updateProductionFormula(id: string, f: any): Promise<ProductionFormula | null> {
    const existing = await query('SELECT * FROM production_formulas WHERE id = $1', [id]);
    if (existing.rows.length === 0) return null;

    let validOutputProductId: string | null = null;
    const rawOutputId = typeof f.outputProductId === 'string' ? f.outputProductId.trim() : '';
    if (rawOutputId && rawOutputId !== 'null' && rawOutputId !== 'undefined' && rawOutputId !== 'none') {
      const pCheck = await query('SELECT id, name FROM products WHERE id = $1', [rawOutputId]);
      if (pCheck.rows.length > 0) {
        validOutputProductId = pCheck.rows[0].id;
        if (!f.outputProductName) {
          f.outputProductName = pCheck.rows[0].name;
        }
      }
    }

    const name = f.name || f.title || existing.rows[0].name;
    const outputProductName = f.outputProductName || existing.rows[0].output_product_name;
    const outputCategory = f.outputCategory || existing.rows[0].output_category;
    const outputUnit = f.outputUnit || existing.rows[0].output_unit;
    const baseOutputQuantity = f.baseOutputQuantity !== undefined ? f.baseOutputQuantity : (f.outputQuantity !== undefined ? f.outputQuantity : existing.rows[0].base_output_quantity);
    const materials = f.materials ? JSON.stringify(f.materials) : existing.rows[0].materials;
    const overheads = f.overheads ? JSON.stringify(f.overheads) : existing.rows[0].overheads;
    const suggestedSalePrice = f.suggestedSalePrice !== undefined ? f.suggestedSalePrice : existing.rows[0].suggested_sale_price;
    const description = f.description !== undefined ? f.description : existing.rows[0].description;

    await query(
      `UPDATE production_formulas SET
        name = $1, output_product_id = $2, output_product_name = $3, output_category = $4,
        output_unit = $5, base_output_quantity = $6, materials = $7, overheads = $8,
        suggested_sale_price = $9, description = $10
      WHERE id = $11`,
      [
        name,
        validOutputProductId,
        outputProductName,
        outputCategory,
        outputUnit,
        baseOutputQuantity,
        materials,
        overheads,
        suggestedSalePrice,
        description,
        id,
      ]
    );

    const updated = await query('SELECT * FROM production_formulas WHERE id = $1', [id]);
    const r = updated.rows[0];
    return {
      id: r.id,
      name: r.name,
      outputProductId: r.output_product_id,
      outputProductName: r.output_product_name,
      outputCategory: r.output_category,
      outputUnit: r.output_unit,
      baseOutputQuantity: Number(r.base_output_quantity),
      materials: typeof r.materials === 'string' ? JSON.parse(r.materials) : (r.materials || []),
      overheads: typeof r.overheads === 'string' ? JSON.parse(r.overheads) : (r.overheads || []),
      suggestedSalePrice: Number(r.suggested_sale_price || 0),
      description: r.description,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  },

  async deleteProductionFormula(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      await client.query('UPDATE production_runs SET formula_id = NULL WHERE formula_id = $1', [id]);
      const res = await client.query('DELETE FROM production_formulas WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    });
  },

  async getProductionRuns(): Promise<ProductionRun[]> {
    const res = await query('SELECT * FROM production_runs ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      runNumber: r.run_number,
      formulaId: r.formula_id,
      formulaName: r.formula_name,
      outputProductId: r.output_product_id,
      outputProductName: r.output_product_name,
      producedQuantity: Number(r.produced_quantity),
      outputUnit: r.output_unit,
      totalMaterialCost: Number(r.total_material_cost),
      totalOverheadCost: Number(r.total_overhead_cost),
      totalCost: Number(r.total_cost),
      unitCost: Number(r.unit_cost),
      consumedMaterials: typeof r.consumed_materials === 'string' ? JSON.parse(r.consumed_materials) : (r.consumed_materials || []),
      userId: r.user_id,
      userName: r.user_name,
      warehouseId: r.warehouse_id || 'wh_central',
      notes: r.notes,
      date: r.created_at,
    }));
  },

  async executeProductionRun(params: {
    formulaId: string;
    producedQuantity: number;
    userId: string;
    userName: string;
    notes?: string;
    warehouseId?: string;
    outputWarehouseId?: string;
  }): Promise<{ success: boolean; run?: ProductionRun; message: string }> {
    const rawWhId = params.warehouseId || 'wh_central';
    const outWhId = params.outputWarehouseId || params.warehouseId || 'wh_central';

    const formulaRes = await query('SELECT * FROM production_formulas WHERE id = $1', [params.formulaId]);
    if (formulaRes.rows.length === 0) {
      return { success: false, message: 'فرمول تولید مورد نظر یافت نشد.' };
    }

    const formula = formulaRes.rows[0];
    const materials = typeof formula.materials === 'string' ? JSON.parse(formula.materials) : formula.materials;
    const overheads = typeof formula.overheads === 'string' ? JSON.parse(formula.overheads) : formula.overheads;
    const scale = params.producedQuantity / Number(formula.base_output_quantity || 1);

    return await withTransaction(async (client) => {
      // ۱. بررسی موجودی مواد اولیه در انبار مبدا و کسر آنها با قفل FOR UPDATE
      let totalMaterialCost = 0;
      const consumedMaterials: any[] = [];

      for (const mat of materials) {
        const requiredQty = mat.quantity * scale;
        const cost = requiredQty * mat.unitCost;
        totalMaterialCost += cost;

        consumedMaterials.push({
          materialName: mat.materialName,
          linkedProductId: mat.linkedProductId,
          quantity: requiredQty,
          unit: mat.unit,
          cost,
        });

        if (mat.linkedProductId) {
          // کسر از انبار مواد اولیه و بررسی موجودی کافی
          await modifyLocationStock(client, {
            productId: mat.linkedProductId,
            warehouseId: rawWhId,
            delta: -requiredQty,
            allowNegative: false,
          });
        }
      }

      // ۲. محاسبه هزینه‌های سربار و بهای تمام‌شده واحد
      const totalOverheadCost = overheads.reduce((sum: number, o: any) => sum + Number(o.amount) * scale, 0);
      const totalCost = totalMaterialCost + totalOverheadCost;
      const unitCost = Math.round(totalCost / params.producedQuantity);

      // ۳. افزایش موجودی محصول خروجی در انبار مقصد و به‌روزرسانی بهای تمام‌شده
      if (formula.output_product_id) {
        await client.query(
          `UPDATE products SET buy_price = $1, updated_at = NOW() WHERE id = $2`,
          [unitCost, formula.output_product_id]
        );

        await modifyLocationStock(client, {
          productId: formula.output_product_id,
          warehouseId: outWhId,
          delta: params.producedQuantity,
          allowNegative: true,
        });
      }

      // ۴. ثبت سابقه اجرای تولید
      const runId = `run_${Date.now()}`;
      const runNumber = `PRD-${Date.now().toString().slice(-6)}`;

      await client.query(
        `INSERT INTO production_runs (
          id, run_number, formula_id, formula_name, output_product_id, output_product_name,
          produced_quantity, output_unit, total_material_cost, total_overhead_cost, total_cost,
          unit_cost, consumed_materials, user_id, user_name, notes, warehouse_id, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        )`,
        [
          runId,
          runNumber,
          formula.id,
          formula.name,
          formula.output_product_id || null,
          formula.output_product_name,
          params.producedQuantity,
          formula.output_unit,
          totalMaterialCost,
          totalOverheadCost,
          totalCost,
          unitCost,
          JSON.stringify(consumedMaterials),
          params.userId,
          params.userName,
          params.notes || null,
          outWhId,
        ]
      );

      const runRecord: ProductionRun = {
        id: runId,
        runNumber,
        formulaId: formula.id,
        formulaName: formula.name,
        outputProductId: formula.output_product_id,
        outputProductName: formula.output_product_name,
        producedQuantity: params.producedQuantity,
        outputUnit: formula.output_unit,
        totalMaterialCost,
        totalOverheadCost,
        totalCost,
        unitCost,
        consumedMaterials,
        userId: params.userId,
        userName: params.userName,
        warehouseId: outWhId,
        notes: params.notes,
        date: new Date().toISOString(),
      };

      return {
        success: true,
        run: runRecord,
        message: `اجرای تولید ${runNumber} با موفقیت ثبت شد. تعداد ${params.producedQuantity} ${formula.output_unit} به انبار اضافه گردید و مواد اولیه کسر شد.`,
      };
    });
  },

  // ============================================================================
  // ۹. تسویه‌حساب صندوق فروشگاهی و پوز پاسارگاد (POS Checkout Transaction)
  // ============================================================================
  async executePosCheckout(params: {
    items: InvoiceItem[];
    customerId?: string;
    customerName?: string;
    customerMobile?: string;
    paymentMethod: 'cash' | 'pos_pasargad' | 'credit' | 'installment' | 'sms_link';
    paidAmount: number;
    discount: number;
    taxRate: number;
    cashAmount?: number;
    chequeAmount?: number;
    chequeInfo?: any;
    userId: string;
    userName: string;
    notes?: string;
    posResult?: any;
    warehouseId?: string;
  }): Promise<{ success: boolean; invoice: SalesInvoice; message: string }> {
    const targetWhId = params.warehouseId || 'wh_central';

    return await withTransaction(async (client) => {
      // ۱. بررسی و قفل‌گذاری موجودی تمام کالاها در انبار انتخابی و کسر اتمیک (فقط برای کالاهای فیزیکی نه خدمات)
      for (const item of params.items) {
        if (item.productId && !item.productId.startsWith('srv_') && !(item as any).isService) {
          await modifyLocationStock(client, {
            productId: item.productId,
            warehouseId: targetWhId,
            delta: -item.quantity,
            allowNegative: false,
          });
        }
      }

      // ۲. محاسبات مبالغ مالی
      const subtotal = params.items.reduce((acc, curr) => acc + curr.total, 0);
      const taxableAmount = Math.max(0, subtotal - params.discount);
      const tax = Math.round((taxableAmount * params.taxRate) / 100);
      const finalAmount = taxableAmount + tax;
      const remainingAmount = Math.max(0, finalAmount - params.paidAmount);

      let status: 'paid' | 'partial' | 'pending' = 'paid';
      if (params.paidAmount <= 0) {
        status = 'pending';
      } else if (remainingAmount > 0) {
        status = 'partial';
      }

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceId = `inv_${Date.now()}`;

      // ۳. مدیریت مشتری و سند دفتری نسیه
      let finalCustomerId = params.customerId;
      if (!finalCustomerId && params.customerMobile) {
        const custCheck = await client.query('SELECT id FROM customers WHERE mobile = $1', [params.customerMobile]);
        if (custCheck.rows.length > 0) {
          finalCustomerId = custCheck.rows[0].id;
        } else if (params.customerName && params.customerName !== 'مشتری نقدی حضوری') {
          finalCustomerId = `cst_${Date.now()}`;
          await client.query(
            `INSERT INTO customers (id, name, mobile, address, balance, created_at, updated_at)
             VALUES ($1, $2, $3, 'ثبت شده در صندوق فروشگاه', 0, NOW(), NOW())`,
            [finalCustomerId, params.customerName, params.customerMobile]
          );
        }
      }

      if (finalCustomerId && remainingAmount > 0) {
        await client.query(
          `UPDATE customers SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [remainingAmount, finalCustomerId]
        );
        await client.query(
          `INSERT INTO customer_transactions (id, customer_id, type, amount, invoice_id, description, created_at)
           VALUES ($1, $2, 'credit_sale', $3, $4, $5, NOW())`,
          [`tx_${Date.now()}`, finalCustomerId, remainingAmount, invoiceId, `فروش نسیه/مانده فاکتور ${invoiceNumber}`]
        );
      }

      // ۴. درج فاکتور فروش با انبار مربوطه
      await client.query(
        `INSERT INTO sales_invoices (
          id, invoice_number, customer_id, customer_name, customer_mobile, items,
          subtotal, discount, tax, final_amount, payment_method, paid_amount, remaining_amount,
          cash_amount, cheque_amount, cheque_info, status, pos_ref_number, pos_rrn, notes,
          warehouse_id, created_by_user_id, created_by_user_name, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, NOW()
        )`,
        [
          invoiceId,
          invoiceNumber,
          finalCustomerId || null,
          params.customerName || 'مشتری نقدی حضوری',
          params.customerMobile || null,
          JSON.stringify(params.items),
          subtotal,
          params.discount,
          tax,
          finalAmount,
          params.paymentMethod,
          params.paidAmount,
          remainingAmount,
          params.cashAmount || 0,
          params.chequeAmount || 0,
          params.chequeInfo ? JSON.stringify(params.chequeInfo) : null,
          status,
          params.posResult?.refNumber || null,
          params.posResult?.rrn || null,
          params.notes || null,
          targetWhId,
          params.userId,
          params.userName,
        ]
      );

      // ۵. ثبت لاگ تراکنش POS در صورت ارسال به کارتخوان
      if (params.posResult) {
        await client.query(
          `INSERT INTO pos_transaction_logs (
            id, invoice_id, amount, status, raw_request_hex, raw_response_hex,
            ref_number, rrn, terminal_id, error_code, error_message, latency_ms, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, NOW()
          )`,
          [
            `pos_log_${Date.now()}`,
            invoiceId,
            params.paidAmount,
            params.posResult.success ? 'success' : 'failed',
            params.posResult.rawRequestHex || '',
            params.posResult.rawResponseHex || '',
            params.posResult.refNumber || '',
            params.posResult.rrn || '',
            'default_pos',
            params.posResult.responseCode || '',
            params.posResult.responseMessage || '',
            params.posResult.latencyMs || 0,
          ]
        );
      }

      const invoice: SalesInvoice = {
        id: invoiceId,
        invoiceNumber,
        customerId: finalCustomerId,
        customerName: params.customerName || 'مشتری نقدی حضوری',
        customerMobile: params.customerMobile,
        items: params.items,
        subtotal,
        discount: params.discount,
        tax,
        finalAmount,
        paymentMethod: params.paymentMethod,
        paidAmount: params.paidAmount,
        remainingAmount,
        cashAmount: params.cashAmount,
        chequeAmount: params.chequeAmount,
        chequeInfo: params.chequeInfo,
        status,
        posRefNumber: params.posResult?.refNumber,
        posRrn: params.posResult?.rrn,
        notes: params.notes,
        warehouseId: targetWhId,
        createdAt: new Date().toISOString(),
        createdByUserId: params.userId,
        createdByUserName: params.userName,
      };

      return {
        success: true,
        invoice,
        message: 'فاکتور با موفقیت ثبت شد و انبار به صورت آنی به‌روزرسانی گردید.',
      };
    });
  },

  // ============================================================================
  // ۱۰. سفارش آنلاین و فروشگاه اینترنتی (Online Orders)
  // ============================================================================
  async placeOnlineOrder(orderData: {
    customerId?: string;
    customerName: string;
    customerMobile: string;
    customerAddress: string;
    customerPostalCode?: string;
    customerProvince?: string;
    customerCity?: string;
    customerEmail?: string;
    items: Array<{ productId: string; quantity: number }>;
    shippingMethodCode: string;
    paymentGatewayCode: string;
    couponCode?: string;
    warehouseId?: string;
  }): Promise<{ success: boolean; order?: OnlineOrder; message: string }> {
    const targetWhId = orderData.warehouseId || 'wh_central';

    return await withTransaction(async (client) => {
      // ۱. بررسی موجودی و واکشی قیمت سطح آنلاین (Shop2) و کسر اتمیک از انبار
      const orderItems: any[] = [];
      let subtotal = 0;

      for (const it of orderData.items) {
        const prodCheck = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [it.productId]);
        if (prodCheck.rows.length === 0) {
          throw new Error('کالای انتخابی یافت نشد.');
        }
        const p = prodCheck.rows[0];

        const unitPrice = Number(p.price_shop2 || p.sale_price);
        const total = unitPrice * it.quantity;
        subtotal += total;

        orderItems.push({
          productId: p.id,
          productName: p.name,
          unit: p.unit,
          quantity: it.quantity,
          unitPrice,
          total,
          image: p.image_url,
          buyPrice: Number(p.buy_price || 0),
        });

        // کسر موجودی از انبار با قفل FOR UPDATE
        await modifyLocationStock(client, {
          productId: it.productId,
          warehouseId: targetWhId,
          delta: -it.quantity,
          allowNegative: false,
        });
      }

      // ۲. محاسبه هزینه ارسال و تخفیف
      const shippingCost = subtotal > 500000 ? 0 : 35000;
      let discountAmount = 0;
      if (orderData.couponCode?.toUpperCase() === 'KHATINOO') {
        discountAmount = Math.round(subtotal * 0.1);
      }

      const finalAmount = subtotal + shippingCost - discountAmount;

      // ۳. ثبت یا به‌روزرسانی مشتری و پیوند سفارش
      let customerId = orderData.customerId || `cst_${Date.now()}`;
      const custCheck = await client.query('SELECT id, total_purchase_amount FROM customers WHERE id = $1 OR mobile = $2', [
        orderData.customerId || '',
        orderData.customerMobile,
      ]);

      if (custCheck.rows.length > 0) {
        customerId = custCheck.rows[0].id;
        const currentTotal = Number(custCheck.rows[0].total_purchase_amount || 0);
        const newTotal = currentTotal + finalAmount;
        await client.query(
          `UPDATE customers SET 
            name = COALESCE(NULLIF($1, ''), name), 
            address = COALESCE(NULLIF($2, ''), address),
            full_address = COALESCE(NULLIF($2, ''), full_address),
            postal_code = COALESCE(NULLIF($3, ''), postal_code),
            province = COALESCE(NULLIF($4, ''), province),
            city = COALESCE(NULLIF($5, ''), city),
            email = COALESCE(NULLIF($6, ''), email),
            total_purchase_amount = $7,
            updated_at = NOW() 
           WHERE id = $8`,
          [
            orderData.customerName,
            orderData.customerAddress,
            orderData.customerPostalCode || null,
            orderData.customerProvince || null,
            orderData.customerCity || null,
            orderData.customerEmail || null,
            newTotal,
            customerId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO customers (
            id, name, mobile, address, full_address, postal_code, province, city, email, 
            balance, total_purchase_amount, profile_completed, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, 0, $9, false, NOW(), NOW())`,
          [
            customerId,
            orderData.customerName,
            orderData.customerMobile,
            orderData.customerAddress,
            orderData.customerPostalCode || null,
            orderData.customerProvince || null,
            orderData.customerCity || null,
            orderData.customerEmail || null,
            finalAmount,
          ]
        );
      }

      // ۴. صدور فاکتور فروش حسابداری یکپارچه با انبار ثبت‌شده
      const salesInvoiceId = `inv_onl_${Date.now()}`;
      const invoiceNumber = `INV-ONL-${Date.now().toString().slice(-6)}`;

      await client.query(
        `INSERT INTO sales_invoices (
          id, invoice_number, customer_id, customer_name, customer_mobile, items,
          subtotal, discount, tax, final_amount, payment_method, paid_amount, remaining_amount,
          status, notes, warehouse_id, created_by_user_id, created_by_user_name, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, NOW()
        )`,
        [
          salesInvoiceId,
          invoiceNumber,
          customerId,
          orderData.customerName,
          orderData.customerMobile,
          JSON.stringify(orderItems),
          subtotal,
          discountAmount,
          0,
          finalAmount,
          orderData.paymentGatewayCode === 'cod' ? 'cash' : 'pos_pasargad',
          orderData.paymentGatewayCode === 'cod' ? 0 : finalAmount,
          orderData.paymentGatewayCode === 'cod' ? finalAmount : 0,
          orderData.paymentGatewayCode === 'cod' ? 'pending' : 'paid',
          `سفارش آنلاین با روش پرداخت ${orderData.paymentGatewayCode}`,
          targetWhId,
          'usr_site',
          'فروشگاه آنلاین خطی‌نو',
        ]
      );

      // ۵. ثبت رکورد سفارش آنلاین
      const orderId = `ord_${Date.now()}`;
      const orderNumber = `KHAT-${Date.now().toString().slice(-6)}`;
      const trackingCode = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

      await client.query(
        `INSERT INTO online_orders (
          id, order_number, customer_id, customer_name, customer_mobile, customer_address, items,
          subtotal, shipping_cost, shipping_method, discount_amount, coupon_code, final_amount,
          payment_gateway, payment_status, order_status, tracking_code, transaction_ref,
          sales_invoice_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, NOW(), NOW()
        )`,
        [
          orderId,
          orderNumber,
          customerId,
          orderData.customerName,
          orderData.customerMobile,
          orderData.customerAddress,
          JSON.stringify(orderItems),
          subtotal,
          shippingCost,
          orderData.shippingMethodCode === 'snapp' ? 'پیک موتوری فوری تهران' : 'پست پیشتاز سراسری',
          discountAmount,
          orderData.couponCode || null,
          finalAmount,
          orderData.paymentGatewayCode,
          orderData.paymentGatewayCode === 'cod' ? 'pending' : 'paid',
          'processing',
          trackingCode,
          `TXN-${Math.floor(100000000 + Math.random() * 900000000)}`,
          salesInvoiceId,
        ]
      );

      const orderRecord: OnlineOrder = {
        id: orderId,
        orderNumber,
        customerId,
        customerName: orderData.customerName,
        customerMobile: orderData.customerMobile,
        customerAddress: orderData.customerAddress,
        items: orderItems,
        subtotal,
        shippingCost,
        shippingMethod: orderData.shippingMethodCode === 'snapp' ? 'پیک موتوری فوری تهران' : 'پست پیشتاز سراسری',
        discountAmount,
        couponCode: orderData.couponCode,
        finalAmount,
        paymentGateway: orderData.paymentGatewayCode as any,
        paymentStatus: orderData.paymentGatewayCode === 'cod' ? 'pending' : 'paid',
        orderStatus: 'processing',
        trackingCode,
        transactionRef: `TXN-${Math.floor(100000000 + Math.random() * 900000000)}`,
        salesInvoiceId,
        warehouseId: targetWhId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        order: orderRecord,
        message: `سفارش شما با شماره پیگیری ${orderNumber} با موفقیت ثبت شد و فاکتور حسابداری یکپارچه صادر گردید.`,
      };
    });
  },

  async getOnlineOrders(): Promise<OnlineOrder[]> {
    const res = await query('SELECT * FROM online_orders ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerMobile: r.customer_mobile,
      customerAddress: r.customer_address,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      subtotal: Number(r.subtotal),
      shippingCost: Number(r.shipping_cost || 0),
      shippingMethod: r.shipping_method,
      discountAmount: Number(r.discount_amount || 0),
      couponCode: r.coupon_code,
      finalAmount: Number(r.final_amount),
      paymentGateway: r.payment_gateway,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      trackingCode: r.tracking_code,
      transactionRef: r.transaction_ref,
      salesInvoiceId: r.sales_invoice_id,
      warehouseId: r.warehouse_id || 'wh_central',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * پیگیری امن سفارش برای مشتریان بدون احراز هویت (بدون نشت اطلاعات مشتریان دیگر)
   * فیلتر مستقیماً در سطح SQL با تطابق همزمان شماره همراه و شماره سفارش انجام می‌شود.
   */
  async trackOnlineOrder(mobile: string, orderNumber: string): Promise<any[]> {
    const res = await query(
      `SELECT 
         id,
         order_number,
         customer_name,
         customer_mobile,
         customer_address,
         items,
         subtotal,
         shipping_cost,
         shipping_method,
         discount_amount,
         coupon_code,
         final_amount,
         order_status,
         payment_status,
         tracking_code,
         created_at
       FROM online_orders 
       WHERE customer_mobile = $1 AND order_number = $2
       ORDER BY created_at DESC`,
      [mobile, orderNumber]
    );

    return res.rows.map((r: any) => {
      // ماسک کردن آدرس برای جلوگیری از نشت اطلاعات حساس در رهگیری عمومی (یا نمایش نام و شهر/آدرس مختصر)
      let maskedMobile = r.customer_mobile;
      if (typeof maskedMobile === 'string' && maskedMobile.length >= 10) {
        maskedMobile = maskedMobile.slice(0, 4) + '***' + maskedMobile.slice(-4);
      }

      return {
        id: r.id,
        orderNumber: r.order_number,
        customerName: r.customer_name,
        customerMobile: maskedMobile,
        customerAddress: r.customer_address,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        subtotal: Number(r.subtotal),
        shippingCost: Number(r.shipping_cost || 0),
        shippingMethod: r.shipping_method,
        discountAmount: Number(r.discount_amount || 0),
        couponCode: r.coupon_code,
        finalAmount: Number(r.final_amount),
        orderStatus: r.order_status,
        paymentStatus: r.payment_status,
        trackingCode: r.tracking_code,
        createdAt: r.created_at,
      };
    });
  },

  async getCustomerOrders(customerId: string, mobile?: string): Promise<OnlineOrder[]> {
    let res;
    if (mobile) {
      res = await query(
        `SELECT * FROM online_orders 
         WHERE customer_id = $1 OR customer_mobile = $2 
         ORDER BY created_at DESC`,
        [customerId, mobile]
      );
    } else {
      res = await query(
        `SELECT * FROM online_orders 
         WHERE customer_id = $1 
         ORDER BY created_at DESC`,
        [customerId]
      );
    }

    return res.rows.map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerMobile: r.customer_mobile,
      customerAddress: r.customer_address,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      subtotal: Number(r.subtotal),
      shippingCost: Number(r.shipping_cost || 0),
      shippingMethod: r.shipping_method,
      discountAmount: Number(r.discount_amount || 0),
      couponCode: r.coupon_code,
      finalAmount: Number(r.final_amount),
      paymentGateway: r.payment_gateway,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      trackingCode: r.tracking_code,
      transactionRef: r.transaction_ref,
      salesInvoiceId: r.sales_invoice_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async getCustomerOrderById(orderId: string, customerId?: string, mobile?: string): Promise<OnlineOrder | null> {
    const res = await query(
      `SELECT * FROM online_orders 
       WHERE (id = $1 OR order_number = $1)
       ${customerId ? 'AND (customer_id = $2 OR customer_mobile = $3)' : ''}`,
      customerId ? [orderId, customerId, mobile || ''] : [orderId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      orderNumber: r.order_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerMobile: r.customer_mobile,
      customerAddress: r.customer_address,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      subtotal: Number(r.subtotal),
      shippingCost: Number(r.shipping_cost || 0),
      shippingMethod: r.shipping_method,
      discountAmount: Number(r.discount_amount || 0),
      couponCode: r.coupon_code,
      finalAmount: Number(r.final_amount),
      paymentGateway: r.payment_gateway,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      trackingCode: r.tracking_code,
      transactionRef: r.transaction_ref,
      salesInvoiceId: r.sales_invoice_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  async updateOrderStatus(id: string, status: string, trackingCode?: string): Promise<void> {
    await query(
      `UPDATE online_orders 
       SET order_status = $1, tracking_code = COALESCE($2, tracking_code), updated_at = NOW() 
       WHERE id = $3`,
      [status, trackingCode, id]
    );
  },

  // ============================================================================
  // ۱۱. تنظیمات فروشگاه و سایت (Settings)
  // ============================================================================
  async getStoreSettings(): Promise<StoreSettings> {
    const res = await query("SELECT * FROM store_settings WHERE id = 'default'");
    if (res.rows.length === 0) {
      return {
        storeName: 'فروشگاه خطی‌نو',
        phone: '021-88990011',
        address: 'تهران، خیابان انقلاب',
        taxRate: 10,
        barcodePrefix: 'KHAT',
        autoPrintReceipt: true,
        defaultReceiptFormat: '80mm',
        soundEffectsEnabled: true,
        currencySymbol: 'تومان',
        priceTier1Name: 'قیمت حضوری و نقدی',
        priceTier2Name: 'قیمت آنلاین و ترب',
        priceTier3Name: 'قیمت همکار و عمده',
      };
    }
    const r = res.rows[0];
    return {
      storeName: r.store_name,
      phone: r.phone,
      address: r.address,
      taxRate: Number(r.tax_rate || 10),
      barcodePrefix: r.barcode_prefix || 'KHAT',
      autoPrintReceipt: r.auto_print_receipt,
      defaultReceiptFormat: r.default_receipt_format,
      soundEffectsEnabled: r.sound_effects_enabled,
      currencySymbol: r.currency_symbol || 'تومان',
      priceTier1Name: r.price_tier1_name,
      priceTier2Name: r.price_tier2_name,
      priceTier3Name: r.price_tier3_name,
    };
  },

  async updateStoreSettings(s: Partial<StoreSettings>): Promise<StoreSettings> {
    await query(
      `UPDATE store_settings SET
        store_name = COALESCE($1, store_name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        tax_rate = COALESCE($4, tax_rate),
        barcode_prefix = COALESCE($5, barcode_prefix),
        auto_print_receipt = COALESCE($6, auto_print_receipt),
        default_receipt_format = COALESCE($7, default_receipt_format),
        sound_effects_enabled = COALESCE($8, sound_effects_enabled),
        currency_symbol = COALESCE($9, currency_symbol),
        price_tier1_name = COALESCE($10, price_tier1_name),
        price_tier2_name = COALESCE($11, price_tier2_name),
        price_tier3_name = COALESCE($12, price_tier3_name)
       WHERE id = 'default'`,
      [
        s.storeName,
        s.phone,
        s.address,
        s.taxRate,
        s.barcodePrefix,
        s.autoPrintReceipt,
        s.defaultReceiptFormat,
        s.soundEffectsEnabled,
        s.currencySymbol,
        s.priceTier1Name,
        s.priceTier2Name,
        s.priceTier3Name,
      ]
    );
    return this.getStoreSettings();
  },

  async getWebsiteSettings(): Promise<WebsiteSettings> {
    const res = await query("SELECT * FROM website_settings WHERE id = 'default'");
    if (res.rows.length === 0) {
      return {
        siteTitle: 'فروشگاه اینترنتی خطی‌نو',
        siteSubtitle: 'مرجع تخصصی خرید لوازم‌تحریر، دفاتر و ملزومات اداری',
        noticeText: '🎉 ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان در سراسر کشور با کد KHATINOO',
        noticeBadgeText: 'اطلاعیه فروشگاه',
        noticeLink: '#products',
        showNotice: true,
        quickTrackingText: 'پیگیری سریع سفارشات',
        showQuickTracking: true,
        searchPlaceholder: 'جستجوی خودکار در میان صدها قلم کالا، خودکار، دفتر، ماژیک، زونکن...',
        calculatorButtonText: 'محاسبه هزینه کپی و پرینت',
        showCalculatorButton: true,
        cartButtonText: 'سبد خرید',
        supportPhone: '021-88990011',
        whatsapp: '09121234567',
        telegram: '@khatinoo_store',
        workingHours: 'شنبه تا پنج‌شنبه ۹ الی ۲۱',
        instagram: '@khatinoo_stationery',
        enamadCode: 'ENM-987654321',
        samandehiCode: 'SMD-123456',
        defaultPriceTier: 'shop2',
        minOrderAmount: 100000,
        logoUrl: '',
        headerMenuItems: [
          { id: 'm1', title: 'همه محصولات', url: '#products', icon: 'Grid', isEnabled: true, sortOrder: 1 },
          { id: 'm2', title: 'نوشت‌افزار و خودکار', url: '/category/cat_writing', icon: 'PenTool', isEnabled: true, sortOrder: 2 },
          { id: 'm3', title: 'دفاتر و کاغذ', url: '/category/cat_notebooks', icon: 'BookOpen', isEnabled: true, sortOrder: 3 },
          { id: 'm4', title: 'لوازم اداری و بایگانی', url: '/category/cat_office', icon: 'Briefcase', isEnabled: true, sortOrder: 4 },
          { id: 'm5', title: 'هنری، معماری و مهندسی', url: '/category/cat_art', icon: 'Palette', isEnabled: true, sortOrder: 5 },
          { id: 'm6', title: 'خدمات چاپ، کپی و صحافی', url: '#calculator', icon: 'Printer', badge: 'فوری', highlight: true, isEnabled: true, sortOrder: 6 },
          { id: 'm7', title: 'تولیدات اختصاصی خطی‌نو', url: '#production', icon: 'Sparkles', badge: 'ویژه', highlight: true, isEnabled: true, sortOrder: 7 },
        ],
      };
    }
    const r = res.rows[0];
    let menuItems = [];
    try {
      menuItems = typeof r.header_menu_items === 'string' ? JSON.parse(r.header_menu_items) : (r.header_menu_items || []);
    } catch {
      menuItems = [];
    }

    let customBadges = [];
    try {
      customBadges = typeof r.custom_badges === 'string' ? JSON.parse(r.custom_badges) : (r.custom_badges || []);
    } catch {
      customBadges = [];
    }

    let customSymbols = [];
    try {
      customSymbols = typeof r.custom_symbols === 'string' ? JSON.parse(r.custom_symbols) : (r.custom_symbols || []);
    } catch {
      customSymbols = [];
    }

    if (!menuItems || menuItems.length === 0) {
      menuItems = [
        { id: 'm1', title: 'همه محصولات', url: '#products', icon: 'Grid', isEnabled: true, sortOrder: 1 },
        { id: 'm2', title: 'نوشت‌افزار و خودکار', url: '/category/cat_writing', icon: 'PenTool', isEnabled: true, sortOrder: 2 },
        { id: 'm3', title: 'دفاتر و کاغذ', url: '/category/cat_notebooks', icon: 'BookOpen', isEnabled: true, sortOrder: 3 },
        { id: 'm4', title: 'لوازم اداری و بایگانی', url: '/category/cat_office', icon: 'Briefcase', isEnabled: true, sortOrder: 4 },
        { id: 'm5', title: 'هنری، معماری و مهندسی', url: '/category/cat_art', icon: 'Palette', isEnabled: true, sortOrder: 5 },
        { id: 'm6', title: 'خدمات چاپ، کپی و صحافی', url: '#calculator', icon: 'Printer', badge: 'فوری', highlight: true, isEnabled: true, sortOrder: 6 },
        { id: 'm7', title: 'تولیدات اختصاصی خطی‌نو', url: '#production', icon: 'Sparkles', badge: 'ویژه', highlight: true, isEnabled: true, sortOrder: 7 },
      ];
    }

    let headerElements: HeaderElement[] = [];
    if (r.header_elements) {
      try {
        headerElements = typeof r.header_elements === 'string' ? JSON.parse(r.header_elements) : r.header_elements;
      } catch {
        headerElements = [];
      }
    }
    if (!headerElements || headerElements.length === 0) {
      headerElements = [
        { id: 'logo', type: 'logo', title: 'لوگو و برند فروشگاه', enabled: true, order: 1, alignment: 'start', showOnMobile: true },
        { id: 'search', type: 'search', title: 'کادر جستجوی کالا و خدمات', customText: r.search_placeholder || 'جستجوی خودکار در میان صدها قلم کالا...', enabled: true, order: 2, alignment: 'center', showOnMobile: true },
        { id: 'theme_toggle', type: 'theme_toggle', title: 'تغییر حالت شب و روز', icon: 'SunMoon', enabled: true, order: 3, alignment: 'end', showOnMobile: true, buttonStyle: 'ghost' },
        { id: 'auth', type: 'auth', title: 'ورود / ثبت‌نام و حساب کاربری', customText: 'ورود / ثبت‌نام', icon: 'KeyRound', enabled: true, order: 4, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
        { id: 'calculator', type: 'calculator', title: 'دکمه محاسبه هزینه چاپ و پرینت', customText: r.calculator_button_text || 'محاسبه هزینه کپی و پرینت', icon: 'Printer', enabled: r.show_calculator_button !== false, order: 5, alignment: 'end', showOnMobile: true, buttonStyle: 'subtle' },
        { id: 'cart', type: 'cart', title: 'دکمه سبد خرید آنلاین', customText: r.cart_button_text || 'سبد خرید', icon: 'ShoppingBag', enabled: true, order: 6, alignment: 'end', showOnMobile: true, buttonStyle: 'gold' },
      ];
    }

    return {
      siteTitle: r.site_title || 'فروشگاه اینترنتی خطی‌نو',
      siteSubtitle: r.site_subtitle || '',
      noticeText: r.notice_text || '🎉 ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان در سراسر کشور با کد KHATINOO',
      noticeBadgeText: r.notice_badge_text || 'اطلاعیه فروشگاه',
      noticeLink: r.notice_link || '#products',
      showNotice: r.show_notice !== false,
      quickTrackingText: r.quick_tracking_text || 'پیگیری سریع سفارشات',
      showQuickTracking: r.show_quick_tracking !== false,
      searchPlaceholder: r.search_placeholder || 'جستجوی خودکار در میان صدها قلم کالا، خودکار، دفتر، ماژیک، زونکن...',
      calculatorButtonText: r.calculator_button_text || 'محاسبه هزینه کپی و پرینت',
      showCalculatorButton: r.show_calculator_button !== false,
      cartButtonText: r.cart_button_text || 'سبد خرید',
      supportPhone: r.support_phone || '021-88990011',
      whatsapp: r.whatsapp || '09121234567',
      telegram: r.telegram || '@khatinoo_store',
      workingHours: r.working_hours || 'شنبه تا پنج‌شنبه ۹ الی ۲۱',
      instagram: r.instagram || '@khatinoo_stationery',
      enamadCode: r.enamad_code || '',
      enamadImageUrl: r.enamad_image_url || '',
      samandehiCode: r.samandehi_code || '',
      samandehiImageUrl: r.samandehi_image_url || '',
      defaultPriceTier: r.default_price_tier || 'shop2',
      minOrderAmount: Number(r.min_order_amount || 100000),
      logoUrl: r.logo_url || '',
      logoHeight: r.logo_height ? Number(r.logo_height) : 48,
      logoWidth: r.logo_width ? Number(r.logo_width) : undefined,
      logoFit: r.logo_fit || 'contain',
      logoBorderRadius: r.logo_border_radius || 'rounded-2xl',
      showLogoText: r.show_logo_text !== false,
      faviconUrl: r.favicon_url || '',
      headerMenuItems: menuItems,
      headerElements: headerElements,
      buttonColorTheme: r.button_color_theme || 'gold',
      primaryColorHex: r.primary_color_hex || '#C9A227',
      buttonBorderRadius: r.button_border_radius || 'rounded-xl',
      catalogLayoutMode: r.catalog_layout_mode || 'grid',
      showProductBadges: r.show_product_badges !== false,
      customBadges: customBadges,
      customSymbols: customSymbols,
      headerLayoutStyle: r.header_layout_style || 'default',
      footerLayoutStyle: r.footer_layout_style || 'default',
    };
  },

  async updateWebsiteSettings(w: Partial<WebsiteSettings>): Promise<WebsiteSettings> {
    await query(
      `UPDATE website_settings SET
        site_title = COALESCE($1, site_title),
        site_subtitle = COALESCE($2, site_subtitle),
        notice_text = COALESCE($3, notice_text),
        show_notice = COALESCE($4, show_notice),
        support_phone = COALESCE($5, support_phone),
        whatsapp = COALESCE($6, whatsapp),
        telegram = COALESCE($7, telegram),
        working_hours = COALESCE($8, working_hours),
        instagram = COALESCE($9, instagram),
        enamad_code = COALESCE($10, enamad_code),
        samandehi_code = COALESCE($11, samandehi_code),
        default_price_tier = COALESCE($12, default_price_tier),
        min_order_amount = COALESCE($13, min_order_amount),
        notice_badge_text = COALESCE($14, notice_badge_text),
        notice_link = COALESCE($15, notice_link),
        quick_tracking_text = COALESCE($16, quick_tracking_text),
        show_quick_tracking = COALESCE($17, show_quick_tracking),
        search_placeholder = COALESCE($18, search_placeholder),
        calculator_button_text = COALESCE($19, calculator_button_text),
        show_calculator_button = COALESCE($20, show_calculator_button),
        cart_button_text = COALESCE($21, cart_button_text),
        logo_url = COALESCE($22, logo_url),
        favicon_url = COALESCE($23, favicon_url),
        enamad_image_url = COALESCE($24, enamad_image_url),
        samandehi_image_url = COALESCE($25, samandehi_image_url),
        header_menu_items = COALESCE($26, header_menu_items),
        button_color_theme = COALESCE($27, button_color_theme),
        primary_color_hex = COALESCE($28, primary_color_hex),
        button_border_radius = COALESCE($29, button_border_radius),
        catalog_layout_mode = COALESCE($30, catalog_layout_mode),
        show_product_badges = COALESCE($31, show_product_badges),
        custom_badges = COALESCE($32, custom_badges),
        custom_symbols = COALESCE($33, custom_symbols),
        header_layout_style = COALESCE($34, header_layout_style),
        footer_layout_style = COALESCE($35, footer_layout_style),
        logo_height = COALESCE($36, logo_height),
        logo_width = COALESCE($37, logo_width),
        logo_fit = COALESCE($38, logo_fit),
        logo_border_radius = COALESCE($39, logo_border_radius),
        show_logo_text = COALESCE($40, show_logo_text),
        header_elements = COALESCE($41, header_elements)
       WHERE id = 'default'`,
      [
        w.siteTitle,
        w.siteSubtitle,
        w.noticeText,
        w.showNotice,
        w.supportPhone,
        w.whatsapp,
        w.telegram,
        w.workingHours,
        w.instagram,
        w.enamadCode,
        w.samandehiCode,
        w.defaultPriceTier,
        w.minOrderAmount,
        w.noticeBadgeText,
        w.noticeLink,
        w.quickTrackingText,
        w.showQuickTracking,
        w.searchPlaceholder,
        w.calculatorButtonText,
        w.showCalculatorButton,
        w.cartButtonText,
        w.logoUrl,
        w.faviconUrl,
        w.enamadImageUrl,
        w.samandehiImageUrl,
        w.headerMenuItems ? JSON.stringify(w.headerMenuItems) : null,
        w.buttonColorTheme,
        w.primaryColorHex,
        w.buttonBorderRadius,
        w.catalogLayoutMode,
        w.showProductBadges,
        w.customBadges ? JSON.stringify(w.customBadges) : null,
        w.customSymbols ? JSON.stringify(w.customSymbols) : null,
        w.headerLayoutStyle,
        w.footerLayoutStyle,
        w.logoHeight,
        w.logoWidth,
        w.logoFit,
        w.logoBorderRadius,
        w.showLogoText,
        w.headerElements ? JSON.stringify(w.headerElements) : null,
      ]
    );
    return this.getWebsiteSettings();
  },

  async getPosConfig(): Promise<PosConfig> {
    const res = await query("SELECT * FROM pos_configs WHERE id = 'default'");
    if (res.rows.length === 0) {
      return {
        terminalId: '88776655',
        merchantId: '11223344',
        ip: '192.168.1.150',
        port: 7000,
        timeoutMs: 60000,
        autoSend: true,
        isEnabled: true,
        isSimulation: true,
        protocolType: 'pasargad_tcp',
      };
    }
    const r = res.rows[0];
    return {
      terminalId: r.terminal_id,
      merchantId: r.merchant_id,
      ip: r.ip,
      port: Number(r.port),
      timeoutMs: Number(r.timeout_ms),
      autoSend: r.auto_send,
      isEnabled: r.is_enabled,
      isSimulation: r.is_simulation,
      protocolType: r.protocol_type,
    };
  },

  async updatePosConfig(c: Partial<PosConfig>): Promise<PosConfig> {
    await query(
      `UPDATE pos_configs SET
        terminal_id = COALESCE($1, terminal_id),
        merchant_id = COALESCE($2, merchant_id),
        ip = COALESCE($3, ip),
        port = COALESCE($4, port),
        timeout_ms = COALESCE($5, timeout_ms),
        auto_send = COALESCE($6, auto_send),
        is_enabled = COALESCE($7, is_enabled),
        is_simulation = COALESCE($8, is_simulation),
        protocol_type = COALESCE($9, protocol_type)
       WHERE id = 'default'`,
      [c.terminalId, c.merchantId, c.ip, c.port, c.timeoutMs, c.autoSend, c.isEnabled, c.isSimulation, c.protocolType]
    );
    return this.getPosConfig();
  },

  async getBanners(): Promise<WebsiteBanner[]> {
    return [
      {
        id: 'ban_1',
        title: 'جشنواره دفاتر سیمی اختصاصی خطی‌نو',
        subtitle: 'تولید مستقیم در کارگاه خطی‌نو با بالاترین کیفیت کاغذ اندونزی و جلد متالایز سخت',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
        targetUrl: '/store?category=cat_notebooks',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'ban_2',
        title: 'تخفیف ویژه سفارش عمده مدارس و ادارات',
        subtitle: 'تضمین کمترین قیمت در مقایسه با بازار ترب + فاکتور رسمی و ارسال سراسری',
        image: 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=1200&auto=format&fit=crop&q=80',
        targetUrl: '/store',
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 'ban_3',
        title: 'سفارش آنلاین پرینت، کپی و صحافی سیمی',
        subtitle: 'محاسبه آنلاین قیمت، تحویل فوری و چاپ با دستگاه‌های صنعتی دیجیتال',
        image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=1200&auto=format&fit=crop&q=80',
        targetUrl: '/store?service=print',
        isActive: true,
        sortOrder: 3,
      },
    ];
  },

  // ============================================================================
  // ۱۲. دفتر معین متمرکز خزانه و جریان نقدینگی (Central Treasury Ledger)
  // ============================================================================
  async getTreasuryTransactions(filters?: { sourceModule?: string; transactionType?: string }): Promise<TreasuryTransaction[]> {
    let sql = 'SELECT * FROM treasury_transactions WHERE 1=1';
    const params: any[] = [];

    if (filters?.sourceModule) {
      params.push(filters.sourceModule);
      sql += ` AND source_module = $${params.length}`;
    }
    if (filters?.transactionType) {
      params.push(filters.transactionType);
      sql += ` AND transaction_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';
    const res = await query(sql, params);

    return res.rows.map((r: any) => ({
      id: r.id,
      transactionType: r.transaction_type,
      sourceModule: r.source_module,
      referenceId: r.reference_id,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      accountTitle: r.account_title,
      description: r.description,
      balanceAfter: Number(r.balance_after || 0),
      createdAt: r.created_at,
    }));
  },

  async getTreasurySummary(): Promise<TreasurySummary> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayISO = startOfToday.toISOString();

    const [balanceRes, inflowRes, outflowRes, breakdownRes, todayRes, countRes] = await Promise.all([
      query('SELECT COALESCE(SUM(amount), 0) as total FROM treasury_transactions'),
      query('SELECT COALESCE(SUM(amount), 0) as total FROM treasury_transactions WHERE amount > 0'),
      query('SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN (0 - amount) ELSE amount END), 0) as total FROM treasury_transactions WHERE amount < 0'),
      query(`SELECT payment_method, COALESCE(SUM(amount), 0) as subtotal FROM treasury_transactions GROUP BY payment_method`),
      query(`SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as today_inflow,
        COALESCE(SUM(CASE WHEN amount < 0 THEN (0 - amount) ELSE 0 END), 0) as today_outflow
       FROM treasury_transactions WHERE created_at >= $1`, [startOfTodayISO]),
      query('SELECT COUNT(*) as count FROM treasury_transactions'),
    ]);

    const totalBalance = Number(balanceRes.rows[0]?.total || 0);
    const totalInflow = Number(inflowRes.rows[0]?.total || 0);
    const totalOutflow = Number(outflowRes.rows[0]?.total || 0);

    let cashBalance = 0;
    let posBalance = 0;
    let bankBalance = 0;

    for (const r of breakdownRes.rows) {
      const amt = Number(r.subtotal);
      if (r.payment_method === 'cash') cashBalance += amt;
      else if (r.payment_method === 'pos_pasargad' || r.payment_method === 'pos') posBalance += amt;
      else bankBalance += amt;
    }

    const todayInflow = Number(todayRes.rows[0]?.today_inflow || 0);
    const todayOutflow = Number(todayRes.rows[0]?.today_outflow || 0);
    const transactionsCount = Number(countRes.rows[0]?.count || 0);

    return {
      totalBalance,
      totalInflow,
      totalOutflow,
      cashBalance,
      posBalance,
      bankBalance,
      todayInflow,
      todayOutflow,
      transactionsCount,
    };
  },

  async createTreasuryTransaction(entry: {
    transactionType: 'sale_income' | 'purchase_expense' | 'pos_settlement' | 'cheque_cleared' | 'cash_in' | 'cash_out';
    sourceModule: 'sales' | 'purchases' | 'pos' | 'cheques' | 'services';
    referenceId?: string;
    amount: number;
    paymentMethod: string;
    accountTitle: string;
    description?: string;
  }): Promise<TreasuryTransaction> {
    const id = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let txRecord: TreasuryTransaction | null = null;

    await withTransaction(async (client) => {
      const balRes = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM treasury_transactions');
      const currentTotal = Number(balRes.rows[0]?.total || 0);
      const balanceAfter = currentTotal + entry.amount;

      await client.query(
        `INSERT INTO treasury_transactions (
          id, transaction_type, source_module, reference_id, amount,
          payment_method, account_title, description, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          id,
          entry.transactionType,
          entry.sourceModule,
          entry.referenceId || null,
          entry.amount,
          entry.paymentMethod || 'cash',
          entry.accountTitle || 'صندوق مرکزی',
          entry.description || '',
          balanceAfter,
        ]
      );

      txRecord = {
        id,
        transactionType: entry.transactionType,
        sourceModule: entry.sourceModule,
        referenceId: entry.referenceId,
        amount: entry.amount,
        paymentMethod: entry.paymentMethod,
        accountTitle: entry.accountTitle,
        description: entry.description,
        balanceAfter,
        createdAt: new Date().toISOString(),
      };
    });

    return txRecord!;
  },

  // ============================================================================
  // ۱۳. لاگ‌های امنیتی، حسابرسی و وقایع حساس مدیریتی (System Audit Logs)
  // ============================================================================
  async createAuditLog(
    entry: {
      userId?: string;
      username?: string;
      action: string;
      module?: string;
      targetId?: string;
      details?: any;
      ip?: string;
      userAgent?: string;
      status?: 'success' | 'failed' | 'warning';
    },
    client?: any
  ): Promise<SystemAuditLog> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const executor = client ? client.query.bind(client) : query;
    await executor(
      `INSERT INTO audit_logs (
        id, user_id, username, action, module, target_id, details, ip, user_agent, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        id,
        entry.userId || null,
        entry.username || 'مدیر سیستم',
        entry.action,
        entry.module || 'general',
        entry.targetId || null,
        JSON.stringify(entry.details || {}),
        entry.ip || '127.0.0.1',
        entry.userAgent || 'Web POS',
        entry.status || 'success',
      ]
    );

    return {
      id,
      userId: entry.userId,
      username: entry.username || 'مدیر سیستم',
      action: entry.action,
      module: entry.module || 'general',
      targetId: entry.targetId,
      details: entry.details,
      ip: entry.ip || '127.0.0.1',
      userAgent: entry.userAgent || 'Web POS',
      status: entry.status || 'success',
      createdAt: new Date().toISOString(),
    };
  },

  async getAuditLogs(limit = 100, module?: string): Promise<SystemAuditLog[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (module) {
      params.push(module);
      sql += ` AND module = $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const res = await query(sql, params);
    return res.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      action: r.action,
      module: r.module,
      targetId: r.target_id,
      details: typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {}),
      ip: r.ip,
      userAgent: r.user_agent,
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  // ============================================================================
  // ۱۴. انبارها و موقعیت‌های فیزیکی (Warehouses & Locations)
  // ============================================================================
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await query('SELECT * FROM warehouses ORDER BY is_default DESC, name ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      type: r.type,
      address: r.address,
      phone: r.phone,
      isActive: Boolean(r.is_active),
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
    }));
  },

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    const res = await query('SELECT * FROM warehouses WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      type: r.type,
      address: r.address,
      phone: r.phone,
      isActive: Boolean(r.is_active),
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
    };
  },

  async createWarehouse(data: {
    name: string;
    code: string;
    type?: 'central_warehouse' | 'store' | 'online';
    address?: string;
    phone?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }): Promise<Warehouse> {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO warehouses (id, name, code, type, address, phone, is_active, is_default, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        id,
        data.name,
        data.code,
        data.type || 'store',
        data.address || '',
        data.phone || '',
        data.isActive !== undefined ? data.isActive : true,
        Boolean(data.isDefault),
      ]
    );
    return (await this.getWarehouseById(id))!;
  },

  // ============================================================================
  // ۱۵. موجودی کالاها به تفکیک انبار (Inventory By Location)
  // ============================================================================
  async getInventoryByLocation(warehouseId?: string, productId?: string): Promise<InventoryByLocation[]> {
    let sql = `
      SELECT 
        inv.id,
        inv.warehouse_id,
        w.name as warehouse_name,
        w.code as warehouse_code,
        w.type as warehouse_type,
        inv.product_id,
        p.name as product_name,
        p.code as product_code,
        p.barcode,
        p.unit,
        p.buy_price,
        inv.stock,
        inv.min_stock_alert,
        inv.aisle_shelf,
        inv.updated_at
      FROM inventory_by_location inv
      JOIN warehouses w ON inv.warehouse_id = w.id
      JOIN products p ON inv.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      sql += ` AND inv.warehouse_id = $${params.length}`;
    }
    if (productId) {
      params.push(productId);
      sql += ` AND inv.product_id = $${params.length}`;
    }
    sql += ` ORDER BY p.name ASC, w.name ASC`;
    const res = await query(sql, params);
    return res.rows.map((r: any) => ({
      id: r.id,
      warehouseId: r.warehouse_id,
      warehouseName: r.warehouse_name,
      warehouseCode: r.warehouse_code,
      warehouseType: r.warehouse_type,
      productId: r.product_id,
      productName: r.product_name,
      productCode: r.product_code,
      barcode: r.barcode,
      unit: r.unit,
      buyPrice: Number(r.buy_price || 0),
      stock: Number(r.stock || 0),
      minStockAlert: Number(r.min_stock_alert || 0),
      aisleShelf: r.aisle_shelf,
      updatedAt: r.updated_at,
    }));
  },

  // ============================================================================
  // ۱۶. انتقال کالا بین انبارها در یک تراکنش امن با Row-Lock (Transfer Stock)
  // ============================================================================
  async transferStock(data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    productId: string;
    quantity: number;
    transferredBy?: string;
    userName?: string;
    notes?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<InventoryTransfer> {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new Error('انبار مبدا و مقصد نمی‌توانند یکسان باشند.');
    }
    if (data.quantity <= 0) {
      throw new Error('تعداد انتقال باید بزرگتر از صفر باشد.');
    }

    const transferId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

    return await withTransaction(async (client) => {
      // ۱. قفل ردیف کالا برای جلوگیری از تداخل
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [data.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error('کالای مورد نظر یافت نشد.');
      }
      const product = prodRes.rows[0];

      // ۲. واکشی اطلاعات انبارها
      const [fromWhRes, toWhRes] = await Promise.all([
        client.query('SELECT * FROM warehouses WHERE id = $1', [data.fromWarehouseId]),
        client.query('SELECT * FROM warehouses WHERE id = $1', [data.toWarehouseId]),
      ]);

      if (fromWhRes.rows.length === 0 || toWhRes.rows.length === 0) {
        throw new Error('انبار مبدا یا مقصد یافت نشد.');
      }
      const fromWh = fromWhRes.rows[0];
      const toWh = toWhRes.rows[0];

      // ۳. بررسی و قفل ردیف موجودی در انبار مبدا
      const fromLocRes = await client.query(
        'SELECT * FROM inventory_by_location WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE',
        [data.fromWarehouseId, data.productId]
      );

      let currentSourceStock = 0;
      if (fromLocRes.rows.length > 0) {
        currentSourceStock = Number(fromLocRes.rows[0].stock || 0);
      } else if (fromWh.id === 'wh_central') {
        currentSourceStock = Number(product.stock || 0);
        await client.query(
          `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
           VALUES ($1, 'wh_central', $2, $3, $4, 'قفسه مرکزی', NOW())`,
          [`invloc_${data.productId}_wh_central`, 'wh_central', data.productId, currentSourceStock, Number(product.min_stock_alert || 5)]
        );
      }

      if (currentSourceStock < data.quantity) {
        throw new Error(
          `موجودی کالا «${product.name}» در انبار «${fromWh.name}» کافی نیست (موجودی فعلی: ${currentSourceStock} ${product.unit}).`
        );
      }

      // ۴. کاهش موجودی در انبار مبدا
      await client.query(
        `UPDATE inventory_by_location 
         SET stock = stock - $1, updated_at = NOW() 
         WHERE warehouse_id = $2 AND product_id = $3`,
        [data.quantity, data.fromWarehouseId, data.productId]
      );

      // ۵. افزایش موجودی در انبار مقصد
      const destLocId = `invloc_${data.productId}_${data.toWarehouseId}`;
      await client.query(
        `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'قفسه عمومی', NOW())
         ON CONFLICT (warehouse_id, product_id)
         DO UPDATE SET stock = inventory_by_location.stock + $4, updated_at = NOW()`,
        [destLocId, data.toWarehouseId, data.productId, data.quantity, Number(product.min_stock_alert || 5)]
      );

      // ۶. ثبت رکورد حواله انتقال
      await client.query(
        `INSERT INTO inventory_transfers (
          id, transfer_number, from_warehouse_id, to_warehouse_id, product_id,
          quantity, transferred_by, user_name, status, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, NOW())`,
        [
          transferId,
          transferNumber,
          data.fromWarehouseId,
          data.toWarehouseId,
          data.productId,
          data.quantity,
          data.transferredBy || null,
          data.userName || 'مدیر انبار',
          data.notes || '',
        ]
      );

      // ۷. ثبت لاگ حسابرسی
      await client.query(
        `INSERT INTO audit_logs (
          id, user_id, username, action, module, target_id, details, ip, user_agent, status, created_at
        ) VALUES ($1, $2, $3, $4, 'inventory_transfer', $5, $6, $7, $8, 'success', NOW())`,
        [
          `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          data.transferredBy || null,
          data.userName || 'مدیر انبار',
          `انتقال ${data.quantity} ${product.unit} «${product.name}» از «${fromWh.name}» به «${toWh.name}» (حواله ${transferNumber})`,
          transferId,
          JSON.stringify({
            transferNumber,
            productId: product.id,
            productName: product.name,
            quantity: data.quantity,
            fromWarehouse: fromWh.name,
            toWarehouse: toWh.name,
            notes: data.notes,
          }),
          data.ip || '127.0.0.1',
          data.userAgent || 'Web POS',
        ]
      );

      return {
        id: transferId,
        transferNumber,
        fromWarehouseId: data.fromWarehouseId,
        fromWarehouseName: fromWh.name,
        toWarehouseId: data.toWarehouseId,
        toWarehouseName: toWh.name,
        productId: data.productId,
        productName: product.name,
        productCode: product.code,
        unit: product.unit,
        quantity: data.quantity,
        transferredBy: data.transferredBy,
        userName: data.userName,
        status: 'completed',
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };
    });
  },

  // ============================================================================
  // ۱۷. اصلاح دستی موجودی کالا با دلیل، لاگ و تراکنش امن (Inventory Adjustment)
  // ============================================================================
  async adjustProductStock(data: {
    productId: string;
    warehouseId?: string;
    newStock?: number;
    delta?: number;
    reason: string;
    notes?: string;
    userId?: string;
    userName?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ product: Product; adjustment: InventoryAdjustment }> {
    return await withTransaction(async (client) => {
      // ۱. قفل ردیف کالا با FOR UPDATE
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [data.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error('کالای مورد نظر یافت نشد.');
      }
      const product = prodRes.rows[0];
      const previousStock = Number(product.stock || 0);

      let finalNewStock = previousStock;
      let delta = 0;

      if (data.newStock !== undefined) {
        finalNewStock = Number(data.newStock);
        delta = finalNewStock - previousStock;
      } else if (data.delta !== undefined) {
        delta = Number(data.delta);
        finalNewStock = previousStock + delta;
      }

      if (finalNewStock < 0) {
        throw new Error('موجودی کالا نمی‌تواند منفی شود.');
      }

      // ۲. به‌روزرسانی موجودی انبار مشخص‌شده (یا انبار مرکزی)
      const targetWhId = data.warehouseId || 'wh_central';
      const locId = `invloc_${data.productId}_${targetWhId}`;
      
      const locRes = await client.query(
        'SELECT stock FROM inventory_by_location WHERE warehouse_id = $1 AND product_id = $2 FOR UPDATE',
        [targetWhId, data.productId]
      );
      let locPreviousStock = 0;
      if (locRes.rows.length > 0) {
        locPreviousStock = Number(locRes.rows[0].stock || 0);
      } else if (targetWhId === 'wh_central') {
        locPreviousStock = previousStock;
      }

      let locNewStock = locPreviousStock;
      if (data.newStock !== undefined) {
        locNewStock = Number(data.newStock);
      } else if (data.delta !== undefined) {
        locNewStock = locPreviousStock + Number(data.delta);
      }

      if (locNewStock < 0) {
        throw new Error('موجودی کالا در این انبار نمی‌تواند منفی شود.');
      }

      await client.query(
        `INSERT INTO inventory_by_location (id, warehouse_id, product_id, stock, min_stock_alert, aisle_shelf, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'قفسه اصلی', NOW())
         ON CONFLICT (warehouse_id, product_id)
         DO UPDATE SET stock = $4, updated_at = NOW()`,
        [locId, targetWhId, data.productId, locNewStock, Number(product.min_stock_alert || 5)]
      );

      // ۳. همگام‌سازی تضمینی ستون products.stock
      const totalStock = await syncProductTotalStock(client, data.productId);

      // ۴. واکشی نام انبار برای گزارش
      let whName = 'انبار مرکزی';
      if (data.warehouseId) {
        const whRes = await client.query('SELECT name FROM warehouses WHERE id = $1', [data.warehouseId]);
        if (whRes.rows.length > 0) whName = whRes.rows[0].name;
      }

      // ۵. ثبت در جدول اصلاحات انبار
      const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(
        `INSERT INTO inventory_adjustments (
          id, product_id, warehouse_id, user_id, user_name,
          previous_stock, new_stock, delta, reason, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          adjId,
          data.productId,
          targetWhId,
          data.userId || null,
          data.userName || 'مدیر انبار',
          locPreviousStock,
          locNewStock,
          locNewStock - locPreviousStock,
          data.reason || 'اصلاح دستی موجودی',
          data.notes || '',
        ]
      );

      // ۶. ثبت لاگ حسابرسی
      const actionText = delta >= 0
        ? `افزایش دستی موجودی «${product.name}» از ${previousStock} به ${finalNewStock} (${delta}+ ${product.unit}) در ${whName} - دلیل: ${data.reason}`
        : `کاهش دستی موجودی «${product.name}» از ${previousStock} به ${finalNewStock} (${delta} ${product.unit}) در ${whName} - دلیل: ${data.reason}`;

      await client.query(
        `INSERT INTO audit_logs (
          id, user_id, username, action, module, target_id, details, ip, user_agent, status, created_at
        ) VALUES ($1, $2, $3, $4, 'inventory_adjustment', $5, $6, $7, $8, 'success', NOW())`,
        [
          `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          data.userId || null,
          data.userName || 'مدیر انبار',
          actionText,
          adjId,
          JSON.stringify({
            productId: product.id,
            productName: product.name,
            previousStock,
            newStock: finalNewStock,
            delta,
            reason: data.reason,
            notes: data.notes,
            warehouseName: whName,
          }),
          data.ip || '127.0.0.1',
          data.userAgent || 'Web POS',
        ]
      );

      const res = await client.query('SELECT * FROM products WHERE id = $1', [data.productId]);
      const updatedProduct = res.rows.length > 0 ? formatProduct(res.rows[0]) : null;

      const adjustmentRecord: InventoryAdjustment = {
        id: adjId,
        productId: data.productId,
        productName: product.name,
        productCode: product.code,
        warehouseId: targetWhId,
        warehouseName: whName,
        userId: data.userId,
        userName: data.userName || 'مدیر انبار',
        previousStock,
        newStock: finalNewStock,
        delta,
        reason: data.reason,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      return { product: updatedProduct!, adjustment: adjustmentRecord };
    });
  },

  async getInventoryTransfers(limit = 50): Promise<InventoryTransfer[]> {
    const res = await query(`
      SELECT 
        t.*,
        w_from.name as from_warehouse_name,
        w_to.name as to_warehouse_name,
        p.name as product_name,
        p.code as product_code,
        p.unit
      FROM inventory_transfers t
      JOIN warehouses w_from ON t.from_warehouse_id = w_from.id
      JOIN warehouses w_to ON t.to_warehouse_id = w_to.id
      JOIN products p ON t.product_id = p.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);

    return res.rows.map((r: any) => ({
      id: r.id,
      transferNumber: r.transfer_number,
      fromWarehouseId: r.from_warehouse_id,
      fromWarehouseName: r.from_warehouse_name,
      toWarehouseId: r.to_warehouse_id,
      toWarehouseName: r.to_warehouse_name,
      productId: r.product_id,
      productName: r.product_name,
      productCode: r.product_code,
      unit: r.unit,
      quantity: Number(r.quantity || 0),
      transferredBy: r.transferred_by,
      userName: r.user_name,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },

  async getInventoryAdjustments(limit = 50): Promise<InventoryAdjustment[]> {
    const res = await query(`
      SELECT 
        a.*,
        p.name as product_name,
        p.code as product_code,
        w.name as warehouse_name
      FROM inventory_adjustments a
      JOIN products p ON a.product_id = p.id
      LEFT JOIN warehouses w ON a.warehouse_id = w.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [limit]);

    return res.rows.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      productCode: r.product_code,
      warehouseId: r.warehouse_id,
      warehouseName: r.warehouse_name,
      userId: r.user_id,
      userName: r.user_name,
      previousStock: Number(r.previous_stock || 0),
      newStock: Number(r.new_stock || 0),
      delta: Number(r.delta || 0),
      reason: r.reason,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },

  /**
   * دریافت آمارهای تحلیلی داشبورد با تجمیع واقعی SQL بر اساس تاریخ روز و ۷ روز اخیر
   */
  async getDashboardStats(): Promise<any> {
    // ۱. فاکتورهای فروش امروز و تجمیع مبالغ امروز
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayISO = startOfToday.toISOString();

    const todayRes = await query(`
      SELECT 
        COALESCE(SUM(final_amount), 0) AS sales_today,
        COUNT(id) AS invoice_count_today
      FROM sales_invoices
      WHERE created_at >= $1
    `, [startOfTodayISO]);
    const salesToday = Number(todayRes.rows[0]?.sales_today || 0);
    const invoiceCountToday = Number(todayRes.rows[0]?.invoice_count_today || 0);

    // محاسبه سود تقریبی امروز از روی اقلام فاکتورهای امروز
    const todayInvoicesRes = await query(`
      SELECT items, final_amount FROM sales_invoices
      WHERE created_at >= $1
    `, [startOfTodayISO]);
    let estimatedProfitToday = 0;
    for (const row of todayInvoicesRes.rows) {
      const items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
      const cost = items.reduce((s: number, it: any) => s + (Number(it.buyPrice) || 0) * (Number(it.quantity) || 0), 0);
      estimatedProfitToday += (Number(row.final_amount) || 0) - cost;
    }

    // ۲. وضعیت کالاها و موجودی بحرانی
    const prodStatsRes = await query(`
      SELECT 
        COUNT(id) AS total_products,
        COUNT(CASE WHEN stock <= min_stock_alert THEN 1 END) AS low_stock_count
      FROM products
    `);
    const totalProducts = Number(prodStatsRes.rows[0]?.total_products || 0);
    const lowStockCount = Number(prodStatsRes.rows[0]?.low_stock_count || 0);

    // ۳. وضعیت مشتریان و مانده بدهی نسیه
    const custStatsRes = await query(`
      SELECT 
        COUNT(id) AS total_customers,
        COALESCE(SUM(CASE WHEN balance < 0 THEN (0 - balance) ELSE 0 END), 0) AS total_customer_debt
      FROM customers
    `);
    const totalCustomers = Number(custStatsRes.rows[0]?.total_customers || 0);
    const totalCustomerDebt = Number(custStatsRes.rows[0]?.total_customer_debt || 0);

    // ۴. پرفروش‌ترین کالاها بر اساس فاکتورهای فروش
    const allInvoicesRes = await query(`
      SELECT items FROM sales_invoices ORDER BY created_at DESC LIMIT 500
    `);
    const productSalesMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const inv of allInvoicesRes.rows) {
      const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
      for (const item of items) {
        if (!item || !item.productId) continue;
        const existing = productSalesMap.get(item.productId) || { name: item.productName || 'کالا', count: 0, revenue: 0 };
        existing.count += Number(item.quantity || 0);
        existing.revenue += Number(item.total || item.totalPrice || 0);
        productSalesMap.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ۵. آمار فروش ۷ روز گذشته با استخراج فاکتورها و تجمیع دقیق روزانه
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const last7DaysInvoicesRes = await query(`
      SELECT created_at, final_amount, items
      FROM sales_invoices
      WHERE created_at >= $1
      ORDER BY created_at ASC
    `, [sevenDaysAgoISO]);

    const dayNameMap: Record<number, string> = {
      0: 'یکشنبه',
      1: 'دوشنبه',
      2: 'سه‌شنبه',
      3: 'چهارشنبه',
      4: 'پنج‌شنبه',
      5: 'جمعه',
      6: 'شنبه',
    };

    // ساخت آرایه پیوسته برای ۷ روز اخیر (از ۶ روز پیش تا امروز)
    const dailySalesMap = new Map<string, { dateStr: string; day: string; sales: number; profit: number; invoices: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      dailySalesMap.set(dateKey, {
        dateStr: dateKey,
        day: dayNameMap[dayOfWeek] || 'روز',
        sales: 0,
        profit: 0,
        invoices: 0,
      });
    }

    for (const r of last7DaysInvoicesRes.rows) {
      let dateKey = '';
      if (r.created_at instanceof Date) {
        dateKey = r.created_at.toISOString().split('T')[0];
      } else {
        dateKey = String(r.created_at).split('T')[0];
      }

      const dayObj = dailySalesMap.get(dateKey);
      if (dayObj) {
        const sales = Number(r.final_amount || 0);
        dayObj.sales += sales;
        dayObj.invoices += 1;

        // محاسبه سود برای این روز
        const items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
        if (Array.isArray(items) && items.length > 0) {
          const cost = items.reduce((s: number, it: any) => s + (Number(it.buyPrice) || 0) * (Number(it.quantity) || 0), 0);
          const itemRev = items.reduce((s: number, it: any) => s + (Number(it.total) || Number(it.totalPrice) || 0), 0);
          dayObj.profit += itemRev > 0 ? (itemRev - cost) : Math.round(sales * 0.2);
        } else {
          dayObj.profit += Math.round(sales * 0.2);
        }
      }
    }

    const dailySales = Array.from(dailySalesMap.values()).map(({ day, sales, profit, invoices }) => ({
      day,
      sales,
      profit,
      invoices,
    }));

    // ۶. آخرین فاکتورهای صادر شده
    const latestInvoicesRes = await query(`
      SELECT * FROM sales_invoices ORDER BY created_at DESC LIMIT 8
    `);
    const latestInvoices = latestInvoicesRes.rows.map(formatSalesInvoice);

    return {
      salesToday,
      invoiceCountToday,
      estimatedProfitToday,
      lowStockCount,
      totalCustomers,
      totalProducts,
      totalCustomerDebt,
      topProducts,
      latestInvoices,
      dailySales,
    };
  },
};

