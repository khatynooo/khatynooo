import 'dotenv/config';
import { Pool, PoolClient } from 'pg';
import { newDb, IMemoryDb, DataType } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { splitSqlStatements } from './sqlSplitter';
import bcrypt from 'bcryptjs';

// ==============================================================================
// ماژول اتصال و اجرای کوئری‌های SQL بر روی PostgreSQL (PostgreSQL Database Client)
// ==============================================================================

let pool: any = null;
let memDb: IMemoryDb | null = null;
let isRealPostgres = false;
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * راه‌اندازی و اتصال به پایگاه داده
 */
export async function testDbConnection(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (connectionString && connectionString.trim().length > 0) {
    let testPool: any = null;
    try {
      console.log('🔄 [PostgreSQL] در حال برقراری اتصال به سرور PostgreSQL:', connectionString.replace(/:[^:@]+@/, ':****@'));
      testPool = new Pool({
        connectionString: connectionString.trim(),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });

      testPool.on('error', (err: any) => {
        console.warn('⚠️ [PostgreSQL Pool Background Warning]:', err.message);
      });

      const client = await testPool.connect();
      const res = await client.query('SELECT NOW() as current_time');
      client.release();

      pool = testPool;
      isRealPostgres = true;
      console.log('✅ [PostgreSQL] اتصال به دیتابیس واقعی PostgreSQL با موفقیت برقرار شد:', res.rows[0].current_time);
      return true;
    } catch (err: any) {
      console.error('❌ [PostgreSQL Error] خطا در اتصال به سرور دیتابیس PostgreSQL:', err.message);
      if (testPool) {
        try {
          await testPool.end();
        } catch (_) {}
      }
      if (isProduction) {
        console.error('🛑 [FATAL] اجرای سرور در حالت Production به دلیل عدم دسترسی به دیتابیس PostgreSQL متوقف می‌شود.');
        console.error('💡 راهنما: لطفاً وضعیت سرویس PostgreSQL و درستی اطلاعات کاربری در DATABASE_URL را بررسی فرمایید.');
        process.exit(1);
      }
    }
  } else {
    if (isProduction) {
      console.error('❌ [FATAL DATABASE ERROR] متغیر محیطی DATABASE_URL تنظیم نشده است؛ سرور در حالت Production بدون اتصال به PostgreSQL واقعی اجرا نمی‌شود!');
      console.error('💡 راهنما: لطفاً فایل .env را در مسیر پروژه بررسی کرده و مقدار DATABASE_URL=postgresql://user:pass@localhost:5432/dbname را تنظیم نمایید.');
      process.exit(1);
    }
    console.warn('⚠️ [PostgreSQL Development Warning] متغیر محیطی DATABASE_URL تنظیم نشده است.');
  }

  // اگر دیتابیس واقعی فعال نبود، فقط در محیط توسعه (Development) موتور موقت pg-mem راه‌اندازی می‌شود
  try {
    console.warn('⚠️⚠️⚠️ [DEV NOTICE] در حال راه‌اندازی دیتابیس موقت و درون‌حافظه‌ای (pg-mem). توجه: اطلاعات با ریستارت سرور ماندگار نخواهند بود! ⚠️⚠️⚠️');
    console.log('🚀 [PostgreSQL Engine (DEV)] در حال راه‌اندازی موتور آزمایشی SQL سازگار با PostgreSQL...');
    memDb = newDb({
      autoCreateForeignKeyIndices: true,
    });

    // ثبت توابع کمکی UUID
    memDb.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.text,
      implementation: () => `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    });

    // ثبت تابع abs برای مقادیر عددی در pg-mem
    try {
      memDb.public.registerFunction({
        name: 'abs',
        args: [DataType.integer],
        returns: DataType.integer,
        implementation: (x: any) => (x == null ? null : Math.abs(Number(x))),
      });
      memDb.public.registerFunction({
        name: 'abs',
        args: [DataType.float],
        returns: DataType.float,
        implementation: (x: any) => (x == null ? null : Math.abs(Number(x))),
      });
    } catch (e) {
      console.warn('⚠️ [DEV PG-MEM] ثبت تابع abs با هشدار همراه بود:', e);
    }

    // ثبت تابع date برای تبدیل تاریخ‌ها در محیط pg-mem
    memDb.public.registerFunction({
      name: 'date',
      args: [DataType.timestamp],
      returns: DataType.text,
      implementation: (val: any) => {
        if (!val) return null;
        const d = val instanceof Date ? val : new Date(val);
        return d.toISOString().split('T')[0];
      },
    });

    memDb.public.registerFunction({
      name: 'date',
      args: [DataType.text],
      returns: DataType.text,
      implementation: (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
      },
    });

    const pgAdapter = memDb.adapters.createPg();
    pool = new pgAdapter.Pool();
    isRealPostgres = false;
    console.log('✅ [PostgreSQL Engine (DEV)] موتور موقت درون‌حافظه‌ای با موفقیت فعال شد.');
    return true;
  } catch (err: any) {
    console.error('❌ [PostgreSQL Engine Error] خطای غیرمنتظره در راه‌اندازی دیتابیس آزمایشی:', err);
    return false;
  }
}

/**
 * اجرای سطح پایین کوئری
 */
async function rawQuery(text: string, params: any[] = []): Promise<any> {
  if (!pool) {
    throw new Error('Database pool is not ready.');
  }
  return pool.query(text, params);
}

/**
 * اطمینان از مقداردهی اولیه کامل ساختار دیتابیس
 */
export async function ensureDbInitialized(): Promise<boolean> {
  if (isInitialized) return true;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const connected = await testDbConnection();
        if (connected) {
          await initializeSchema();
          await seedInitialData();
          isInitialized = true;
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('❌ [Database Init Error]:', err.message);
        initPromise = null;
        return false;
      }
    })();
  }
  return initPromise;
}

/**
 * اجرای مستقیم کوئری SQL پارامتری شده روی پایگاه داده
 */
export async function query(text: string, params: any[] = []): Promise<any> {
  if (!isInitialized) {
    await ensureDbInitialized();
  }
  if (!pool) {
    throw new Error('Database connection is not available.');
  }

  try {
    const res = await rawQuery(text, params);
    return res;
  } catch (err: any) {
    console.error('❌ [SQL Execution Error]:', err.message, '\nQuery:', text, '\nParams:', params);
    throw err;
  }
}

/**
 * اجرای مجموعه‌ای از عملیات در قالب یک تراکنش امن ACID با BEGIN / COMMIT / ROLLBACK
 */
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (!isInitialized) {
    await ensureDbInitialized();
  }
  if (!pool) {
    throw new Error('Database pool is not configured.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // ignore rollback error if connection lost
    }
    console.error('❌ [SQL Transaction Error] تراکنش با خطا مواجه و Rollback شد:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * ساخت تمامی جداول و اجرای امن مایگریشن‌ها با رهگیری در جدول schema_migrations
 */
export async function initializeSchema(): Promise<void> {
  try {
    // ۱. اطمینان از وجود جدول رهگیری مایگریشن‌ها
    try {
      await rawQuery(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e: any) {
      // ignore
    }

    // ۲. بررسی وجود پوشه migrations و اجرای فایل‌های migration جدید
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (fs.existsSync(migrationsDir)) {
      let appliedMigrations = new Set<string>();
      try {
        const res = await rawQuery('SELECT name FROM schema_migrations');
        if (res && res.rows) {
          appliedMigrations = new Set(res.rows.map((r: any) => r.name));
        }
      } catch (e) {
        // In-memory or initial
      }

      const files = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        if (appliedMigrations.has(file)) continue;

        console.log(`⏳ [Migration] اعمال مایگریشن: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const rawSql = fs.readFileSync(filePath, 'utf8');

        const statements = splitSqlStatements(rawSql);
        let fileFailed = false;

        for (const sql of statements) {
          if (sql.toUpperCase().includes('CREATE EXTENSION')) continue;
          try {
            await rawQuery(sql);
          } catch (stmtErr: any) {
            const msg = stmtErr.message || '';
            const isIgnorable =
              msg.includes('already exists') ||
              msg.includes('duplicate key') ||
              msg.includes('multiple primary keys') ||
              msg.includes('already a partition') ||
              (msg.includes('column') && msg.includes('does not exist') && sql.toUpperCase().includes('DROP'));

            if (isIgnorable) {
              console.warn(`ℹ️ [Migration Notice in ${file}]:`, msg);
            } else {
              console.error(`❌ [Migration Error in ${file}]:`, msg);
              fileFailed = true;
              break;
            }
          }
        }

        if (!fileFailed) {
          try {
            await rawQuery('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
            console.log(`✅ [Migration] مایگریشن ${file} با موفقیت اعمال و ثبت شد.`);
          } catch (e) {
            // ignore
          }
        } else {
          console.error(`🛑 [Migration Aborted] فایل ${file} به دلیل خطا اعمال نشد و در schema_migrations ثبت نگردید.`);
        }
      }
    } else {
      // حالت پشتیبان (Fallback به schema.sql)
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const rawSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = splitSqlStatements(rawSql);

        for (const sql of statements) {
          if (sql.toUpperCase().includes('CREATE EXTENSION')) continue;
          try {
            await rawQuery(sql);
          } catch (stmtErr: any) {
            if (!stmtErr.message?.includes('already exists')) {
              console.warn('⚠️ [Schema Execution]:', stmtErr.message, 'in:', sql.slice(0, 60));
            }
          }
        }
      }
    }

    // اطمینان از وجود ستون‌های مهم و همگام‌سازی چند-انباره و تنظیمات آدرس و وب‌سایت
    const ensureColumns = [
      "ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64) DEFAULT 'wh_central'",
      "ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64) DEFAULT 'wh_central'",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64) DEFAULT 'wh_online'",
      "ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64) DEFAULT 'wh_central'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS province VARCHAR(100)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS map_latitude NUMERIC(10, 6)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS map_longitude NUMERIC(10, 6)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS google_maps_url TEXT",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS neshan_url TEXT",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS balad_url TEXT",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS show_location_map BOOLEAN DEFAULT TRUE",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS location_title VARCHAR(200)",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS products_per_row INT DEFAULT 4",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS container_width VARCHAR(30) DEFAULT 'wide'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS header_layout_style VARCHAR(30) DEFAULT 'default'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS footer_layout_style VARCHAR(30) DEFAULT 'default'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS button_color_theme VARCHAR(30) DEFAULT 'gold'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS primary_color_hex VARCHAR(30) DEFAULT '#C9A227'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS button_border_radius VARCHAR(30) DEFAULT 'rounded-xl'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS catalog_layout_mode VARCHAR(30) DEFAULT 'grid'",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS show_product_badges BOOLEAN DEFAULT TRUE",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS custom_badges JSONB",
      "ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS custom_symbols JSONB",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS province VARCHAR(100)",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30)",
    ];
    for (const colSql of ensureColumns) {
      try {
        await rawQuery(colSql);
      } catch (e) {
        // ستون از قبل وجود دارد
      }
    }

    // در صورت وجود مقدار پیش‌فرض قدیمی، شماره تماس و ساعات کاری به‌روزرسانی شود
    try {
      await rawQuery(`
        UPDATE website_settings 
        SET support_phone = '۰۳۱۵۲۴۰۸۳۹۰' 
        WHERE support_phone = '021-88990011' OR support_phone IS NULL OR support_phone = ''
      `);
      await rawQuery(`
        UPDATE store_settings 
        SET phone = '۰۳۱۵۲۴۰۸۳۹۰' 
        WHERE phone = '021-88990011' OR phone IS NULL OR phone = ''
      `);
    } catch (e) {
      // ignore
    }

    console.log('✅ [PostgreSQL Schema] ساختار کامل تمام جداول و مایگریشن‌ها با موفقیت آماده‌سازی شد.');
  } catch (err: any) {
    console.error('❌ [PostgreSQL Schema Error]:', err.message);
  }
}

/**
 * درج داده‌های اولیه پیش‌فرض فروشگاه خطی‌نو در صورت خالی بودن دیتابیس
 */
export async function seedInitialData(): Promise<void> {
  try {
    // ۱. بررسی و ثبت کاربران پیش‌فرض
    const userCountRes = await rawQuery('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);

    if (userCount === 0) {
      console.log('🌱 [Seed] در حال ایجاد کاربران پیش‌فرض سیستم...');
      const adminPassHash = await bcrypt.hash('admin123456', 10);
      const sellerPassHash = await bcrypt.hash('seller123', 10);
      const accountantPassHash = await bcrypt.hash('acc123456', 10);
      const sitePassHash = await bcrypt.hash('site123456', 10);

      await rawQuery(
        `INSERT INTO users (id, full_name, username, password_hash, role, is_active)
         VALUES 
         ($1, $2, $3, $4, $5, $6),
         ($7, $8, $9, $10, $11, $12),
         ($13, $14, $15, $16, $17, $18),
         ($19, $20, $21, $22, $23, $24)`,
        [
          'usr_admin', 'مدیر کل خطی‌نو', 'admin', adminPassHash, 'admin', true,
          'usr_seller', 'صندوقدار فروشگاه', 'cashier', sellerPassHash, 'seller', true,
          'usr_acc', 'مدیر حسابداری و مالی', 'accountant', accountantPassHash, 'chief_accountant', true,
          'usr_site', 'مدیر فروشگاه اینترنتی', 'sitemanager', sitePassHash, 'site_manager', true,
        ]
      );
      console.log('✅ [Seed] کاربران پیش‌فرض ایجاد شدند.');
    }

    // ۲. واحدهای شمارش
    const unitCountRes = await rawQuery('SELECT COUNT(*) FROM unit_definitions');
    if (parseInt(unitCountRes.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO unit_definitions (id, name, sub_unit, conversion_factor, description)
         VALUES 
         ('unt_1', 'عدد', 'عدد', 1, 'واحد پایه برای اقلام تکی'),
         ('unt_2', 'بسته', 'عدد', 12, 'بسته استاندارد ۱۲ عددی'),
         ('unt_3', 'کارتن', 'بسته', 24, 'کارتن مادر شامل ۲۴ بسته'),
         ('unt_4', 'جلد', 'جلد', 1, 'واحد دفاتر و کتب'),
         ('unt_5', 'بند کاغذ', 'برگ', 500, 'بند کاغذ ۵۰۰ برگی')`
      );
    }

    // ۳. دسته‌بندی‌ها
    const catCountRes = await rawQuery('SELECT COUNT(*) FROM categories');
    if (parseInt(catCountRes.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO categories (id, name, icon, sort_order)
         VALUES 
         ('cat_writing', 'نوشت‌افزار و خودکار', 'PenTool', 1),
         ('cat_notebooks', 'دفاتر و کاغذ', 'BookOpen', 2),
         ('cat_office', 'لوازم اداری و بایگانی', 'Briefcase', 3),
         ('cat_art', 'هنری، معماری و مهندسی', 'Palette', 4),
         ('cat_services', 'خدمات چاپ، کپی و صحافی', 'Printer', 5)`
      );

      await rawQuery(
        `INSERT INTO sub_categories (id, category_id, name)
         VALUES 
         ('sub_1', 'cat_writing', 'خودکار و روان‌نویس'),
         ('sub_2', 'cat_writing', 'مداد، اتود و نوک'),
         ('sub_3', 'cat_writing', 'ماژیک و هایلایتر'),
         ('sub_4', 'cat_notebooks', 'دفتر سیمی و مشق'),
         ('sub_5', 'cat_notebooks', 'کاغذ A4 و A3'),
         ('sub_6', 'cat_office', 'زونکن و پوشه'),
         ('sub_7', 'cat_office', 'منگنه، پانچ و چسب'),
         ('sub_8', 'cat_art', 'مدادرنگی و آبرنگ')`
      );
    }

    // ۴. محصولات اولیه کاتالوگ با قیمت‌گذاری ۵ سطحی و بارکد
    const prodCountRes = await rawQuery('SELECT COUNT(*) FROM products');
    if (parseInt(prodCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 [Seed] در حال ایجاد محصولات اولیه کاتالوگ خطی‌نو...');
      const sampleProducts = [
        {
          id: 'prod_1',
          name: 'خودکار بیک کریستال آبی نوک ۱.۰ میلی‌متر',
          code: 'PEN-BIC-BL',
          barcode: '3086126600215',
          categoryId: 'cat_writing',
          subCategoryId: 'sub_1',
          unit: 'عدد',
          buyPrice: 6500,
          salePrice: 10000,
          priceShop1: 10000,
          priceShop2: 9500,
          priceShop3: 8500,
          wholesalePrice: 7800,
          minAllowedPrice: 7500,
          stock: 145,
          minStockAlert: 20,
          imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: false,
          isFeatured: true,
          description: 'خودکار اورجینال بیک فرانسه، بسیار روان و با دوام نگارش طولانی',
        },
        {
          id: 'prod_2',
          name: 'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو (تولید اختصاصی)',
          code: 'NB-KHAT-100',
          barcode: '6260123400018',
          categoryId: 'cat_notebooks',
          subCategoryId: 'sub_4',
          unit: 'جلد',
          buyPrice: 42000,
          salePrice: 65000,
          priceShop1: 65000,
          priceShop2: 59000,
          priceShop3: 52000,
          wholesalePrice: 49000,
          minAllowedPrice: 48000,
          stock: 82,
          minStockAlert: 15,
          imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: true,
          isFeatured: true,
          description: 'دفتر جلد سخت متالایز سیمی دوبل با کاغذ ۷۰ گرم اندونزی، خط‌کشی استاندارد تولید کارگاه خطی‌نو',
        },
        {
          id: 'prod_3',
          name: 'کاغذ A4 دابل ای (Double A) بسته ۵۰۰ عددی ۸۰ گرم',
          code: 'PAP-DBL-A4',
          barcode: '8851907001211',
          categoryId: 'cat_notebooks',
          subCategoryId: 'sub_5',
          unit: 'بسته',
          buyPrice: 215000,
          salePrice: 255000,
          priceShop1: 255000,
          priceShop2: 248000,
          priceShop3: 235000,
          wholesalePrice: 228000,
          minAllowedPrice: 225000,
          stock: 64,
          minStockAlert: 10,
          imageUrl: 'https://images.unsplash.com/photo-1589330694653-dad6ef0140be?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: true,
          isFeatured: true,
          description: 'کاغذ درجه یک دابل ای بدون گیر کردن در پرینتر، سفیدی ۹۸ درصد و گرماژ ۸۰ گرم واقعی',
        },
        {
          id: 'prod_4',
          name: 'اتود ۰.۵ میلی‌متر فابرکاستل مدل گریپ ۱۳۴۵',
          code: 'PNC-FC-05',
          barcode: '4005401345517',
          categoryId: 'cat_writing',
          subCategoryId: 'sub_2',
          unit: 'عدد',
          buyPrice: 110000,
          salePrice: 150000,
          priceShop1: 150000,
          priceShop2: 142000,
          priceShop3: 130000,
          wholesalePrice: 124000,
          minAllowedPrice: 120000,
          stock: 28,
          minStockAlert: 5,
          imageUrl: 'https://images.unsplash.com/photo-1594913785162-e678a0c23dd9?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: false,
          isFeatured: false,
          description: 'مداد نوکی ارگونومیک با گریپ ضد لغزش لاستیکی و مغزی مقاوم در برابر شکست',
        },
        {
          id: 'prod_5',
          name: 'ماژیک هایلایتر استابیلو ست ۴ رنگ نئونی Boss',
          code: 'HLT-STB-SET4',
          barcode: '4006381333634',
          categoryId: 'cat_writing',
          subCategoryId: 'sub_3',
          unit: 'بسته',
          buyPrice: 185000,
          salePrice: 240000,
          priceShop1: 240000,
          priceShop2: 228000,
          priceShop3: 210000,
          wholesalePrice: 200000,
          minAllowedPrice: 195000,
          stock: 19,
          minStockAlert: 5,
          imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: false,
          isFeatured: true,
          description: 'هایلایتر معروف استابیلو آلمان با جوهر ضدخشک‌شدن تا ۴ ساعت بدون درب',
        },
        {
          id: 'prod_6',
          name: 'زونکن ۷.۵ سانتی‌متر کتان متالیک پاپکو A4',
          code: 'OFF-PAPCO-75',
          barcode: '6260456100892',
          categoryId: 'cat_office',
          subCategoryId: 'sub_6',
          unit: 'عدد',
          buyPrice: 78000,
          salePrice: 110000,
          priceShop1: 110000,
          priceShop2: 104000,
          priceShop3: 95000,
          wholesalePrice: 89000,
          minAllowedPrice: 85000,
          stock: 45,
          minStockAlert: 10,
          imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: false,
          isFeatured: false,
          description: 'زونکن اداری بسیار مقاوم با روکش کتان قابل شستشو و قفل فلزی آبکاری‌شده',
        },
        {
          id: 'prod_7',
          name: 'مدادرنگی ۲۴ رنگ جعبه فلزی آریا',
          code: 'ART-ARYA-24M',
          barcode: '6261234500249',
          categoryId: 'cat_art',
          subCategoryId: 'sub_8',
          unit: 'بسته',
          buyPrice: 135000,
          salePrice: 185000,
          priceShop1: 185000,
          priceShop2: 175000,
          priceShop3: 160000,
          wholesalePrice: 150000,
          minAllowedPrice: 145000,
          stock: 33,
          minStockAlert: 8,
          imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: true,
          isFeatured: true,
          description: 'مدادرنگی پررنگ و با کیفیت بالا، نوک نرم بدون شکنندگی با رنگ‌های درخشان',
        },
        {
          id: 'prod_8',
          name: 'دفتر ۸۰ برگ مشق جلد مقوایی خطی‌نو',
          code: 'NB-KHAT-80',
          barcode: '6260123400087',
          categoryId: 'cat_notebooks',
          subCategoryId: 'sub_4',
          unit: 'جلد',
          buyPrice: 22000,
          salePrice: 35000,
          priceShop1: 35000,
          priceShop2: 32000,
          priceShop3: 28000,
          wholesalePrice: 26000,
          minAllowedPrice: 25000,
          stock: 120,
          minStockAlert: 25,
          imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&auto=format&fit=crop&q=60',
          isSpecialOffer: false,
          isFeatured: true,
          description: 'دفتر مشق منگنه‌ای با کاغذ ۷۰ گرم و جلد با سلفون مات ضد آب، تولید خطی‌نو',
        }
      ];

      for (const p of sampleProducts) {
        await rawQuery(
          `INSERT INTO products (
            id, name, code, barcode, category_id, sub_category_id, unit, 
            buy_price, sale_price, price_shop1, price_shop2, price_shop3, wholesale_price, min_allowed_price, 
            stock, min_stock_alert, image_url, is_special_offer, is_featured, description
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20
          )`,
          [
            p.id, p.name, p.code, p.barcode, p.categoryId, p.subCategoryId, p.unit,
            p.buyPrice, p.salePrice, p.priceShop1, p.priceShop2, p.priceShop3, p.wholesalePrice, p.minAllowedPrice,
            p.stock, p.minStockAlert, p.imageUrl, p.isSpecialOffer, p.isFeatured, p.description
          ]
        );
      }
      console.log('✅ [Seed] محصولات کاتالوگ با موفقیت در دیتابیس ثبت شدند.');
    }

    // ۵. مشتریان و تامین‌کنندگان اولیه
    const custCount = await rawQuery('SELECT COUNT(*) FROM customers');
    if (parseInt(custCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO customers (id, name, company_name, mobile, address, balance)
         VALUES 
         ('cst_walkin', 'مشتری نقدی حضوری', NULL, '09000000000', 'خرید حضوری فروشگاه', 0),
         ('cst_1', 'دبستان غیرانتفاعی مهر دانش', 'مدرسه مهر دانش', '09121112233', 'تهران، خیابان ولیعصر، کوچه بهار', -450000),
         ('cst_2', 'شرکت مهندسی فراساز', 'فراساز سازه', '09123334455', 'تهران، میدان ونک، برج نگار', 120000)`
      );
    }

    const supCount = await rawQuery('SELECT COUNT(*) FROM suppliers');
    if (parseInt(supCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO suppliers (id, name, mobile, address, debt_to_supplier)
         VALUES 
         ('sup_1', 'بازرگانی کاغذ اندونزی و تایلند پارس', '02188776655', 'تهران، بازار آهنگران، پلاک ۱۲', 14500000),
         ('sup_2', 'پخش نوشت‌افزار پایتخت (نمایندگی فابرکاستل و استابیلو)', '02155667788', 'تهران، بازار بین‌الحرمین', 8200000)`
      );
    }

    // ۶. تعرفه‌های خدمات پرینت و کپی
    const serviceCount = await rawQuery('SELECT COUNT(*) FROM service_presets');
    if (parseInt(serviceCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO service_presets (id, name, category, unit, price, description, show_in_pos)
         VALUES 
         ('srv_1', 'کپی / پرینت تک‌رو سیاه و سفید A4', 'copy_print', 'صفحه', 1500, 'کاغذ ۸۰ گرم استاندارد', true),
         ('srv_2', 'کپی / پرینت دورو سیاه و سفید A4', 'copy_print', 'برگ', 2500, 'کاغذ ۸۰ گرم استاندارد', true),
         ('srv_3', 'پرینت تمام‌رنگی A4 (عکس و پوستر)', 'copy_print', 'صفحه', 6000, 'کیفیت بالا فتوشاین', true),
         ('srv_4', 'صحافی و سیمی دوبل فلزی با طلق و پاپکو', 'binding', 'جلد', 35000, 'شامل طلق مات/براق و فنر دوبل استیل', true),
         ('srv_5', 'پرس و لمینت حرارتی A4 (۱۲۵ میکرون)', 'laminate', 'برگ', 18000, 'لمینت براق ضد آب و محکم', true)`
      );
    }

    // ۷. فرمولاسیون تولید کارگاهی
    const formulaCount = await rawQuery('SELECT COUNT(*) FROM production_formulas');
    if (parseInt(formulaCount.rows[0].count, 10) === 0) {
      const formula1Materials = JSON.stringify([
        { materialName: 'کاغذ ۷۰ گرم تحریر اندونزی', linkedProductId: null, quantity: 100, unit: 'برگ', unitCost: 320 },
        { materialName: 'جلد سخت مقوایی لمینت متالایز', linkedProductId: null, quantity: 1, unit: 'عدد', unitCost: 6500 },
        { materialName: 'فنر دوبل فلزی استیل', linkedProductId: null, quantity: 1, unit: 'عدد', unitCost: 2500 },
      ]);
      const formula1Overheads = JSON.stringify([
        { title: 'دستمزد برش، پانچ و مونتاژ کارگاهی', amount: 1500 },
        { title: 'استهلاک دستگاه و برق کارگاه', amount: 500 },
      ]);

      await rawQuery(
        `INSERT INTO production_formulas (
          id, name, output_product_id, output_product_name, output_category, output_unit, 
          base_output_quantity, materials, overheads, suggested_sale_price, description
        ) VALUES (
          'frm_1', 'تولید دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو', 'prod_2', 'دفتر ۱۰۰ برگ سیمی جلد سخت خطی‌نو (تولید اختصاصی)',
          'cat_notebooks', 'جلد', 1, $1, $2, 65000, 'فرمولاسیون استاندارد تولید دفتر سیمی جلد سخت در کارگاه خطی‌نو'
        )`,
        [formula1Materials, formula1Overheads]
      );
    }

    // ۸. تنظیمات فروشگاه، وب‌سایت و کارتخوان POS
    const storeCount = await rawQuery('SELECT COUNT(*) FROM store_settings');
    if (parseInt(storeCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO store_settings (
          id, store_name, phone, address, tax_rate, barcode_prefix, 
          auto_print_receipt, default_receipt_format, sound_effects_enabled, currency_symbol,
          price_tier1_name, price_tier2_name, price_tier3_name
        ) VALUES (
          'default', 'فروشگاه و کارگاه تولیدی خطی‌نو (Khatinoo)', '021-88990011', 
          'تهران، خیابان انقلاب، روبروی دانشگاه، پلاک ۱۰۱', 10, 'KHAT',
          true, '80mm', true, 'تومان',
          'قیمت حضوری و نقدی', 'قیمت آنلاین و ترب', 'قیمت همکار و عمده'
        )`
      );
    }

    const webCount = await rawQuery('SELECT COUNT(*) FROM website_settings');
    if (parseInt(webCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO website_settings (
          id, site_title, site_subtitle, notice_text, show_notice, support_phone,
          whatsapp, telegram, working_hours, instagram, enamad_code, samandehi_code,
          default_price_tier, min_order_amount
        ) VALUES (
          'default', 'فروشگاه اینترنتی و کارگاه خطی‌نو (khatynoo.ir)',
          'مرجع تخصصی خرید آنلاین لوازم‌تحریر، دفاتر سیمی اختصاصی و خدمات آنلاین چاپ و کپی',
          '🎉 ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان در سراسر کشور با کد KHATINOO',
          true, '021-88990011', '09121234567', '@khatinoo_store', 'شنبه تا پنج‌شنبه ۹ الی ۲۱',
          '@khatinoo_stationery', 'ENM-987654321', 'SMD-123456', 'shop2', 100000
        )`
      );
    }

    const posCount = await rawQuery('SELECT COUNT(*) FROM pos_configs');
    if (parseInt(posCount.rows[0].count, 10) === 0) {
      await rawQuery(
        `INSERT INTO pos_configs (
          id, terminal_id, merchant_id, ip, port, timeout_ms, auto_send, is_enabled, is_simulation, protocol_type
        ) VALUES (
          'default', '88776655', '11223344', '192.168.1.150', 7000, 60000, true, true, true, 'pasargad_tcp'
        )`
      );
    }

    console.log('🎉 [PostgreSQL Seed] تمامی داده‌های اولیه دیتابیس با موفقیت آماده و مقداردهی شدند.');
  } catch (err: any) {
    console.error('❌ [Seed Data Error]:', err.message);
  }
}

/**
 * آماده‌سازی نهایی دیتابیس در زمان بوت سرور
 */
export async function initializeDatabase(): Promise<boolean> {
  return ensureDbInitialized();
}

export function isDbConnected(): boolean {
  return pool !== null;
}

export function isPostgresReal(): boolean {
  return isRealPostgres;
}

export { pool };
