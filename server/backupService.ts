// ==============================================================================
// سرویس جامع پشتیبان‌گیری و بازیابی پایگاه داده و رسانه‌های خطی‌نو
// Khatinoo Unified SQL & Media Backup & Restore Engine
// ==============================================================================

import { query, rawQuery } from './dbClient';
import { splitSqlStatements } from './sqlSplitter';
import { cmsEngine } from './cmsEngine';

/**
 * لیست تمام جداول هسته نرم‌افزار به ترتیب وابستگی کلید خارجی (Foreign Keys)
 */
export const CORE_TABLES = [
  'schema_migrations',
  'users',
  'unit_definitions',
  'categories',
  'sub_categories',
  'warehouses',
  'products',
  'inventory_by_location',
  'inventory_transfers',
  'inventory_adjustments',
  'customers',
  'customer_otp_codes',
  'suppliers',
  'customer_transactions',
  'supplier_transactions',
  'sales_invoices',
  'purchase_invoices',
  'return_invoices',
  'cheques',
  'online_orders',
  'pos_configs',
  'pos_transaction_logs',
  'service_presets',
  'service_records',
  'production_formulas',
  'production_runs',
  'website_settings',
  'store_settings',
  'treasury_transactions',
  'market_price_snapshots',
  'audit_logs',
];

/**
 * تبدیل مقادیر جاوااسکریپت به فرمت امن و استاندارد SQL Literal
 */
function sqlEscapeValue(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

/**
 * دریافت آمار کلی و تفکیکی داده‌ها برای نمایش در پنل تنظیمات
 */
export async function getBackupStats() {
  const tableCounts: Record<string, number> = {};
  let totalRows = 0;

  for (const table of CORE_TABLES) {
    try {
      const res = await query(`SELECT COUNT(*) as count FROM ${table}`);
      const cnt = Number(res.rows[0]?.count || 0);
      tableCounts[table] = cnt;
      totalRows += cnt;
    } catch (e) {
      tableCounts[table] = 0;
    }
  }

  const cmsData = cmsEngine.getAllCmsData();
  const mediaCount = cmsData.mediaItems?.length || 0;
  const couponCount = cmsData.coupons?.length || 0;
  const reviewCount = cmsData.productReviews?.length || 0;

  return {
    totalRows,
    tableCounts,
    mediaCount,
    couponCount,
    reviewCount,
    generatedAt: new Date().toISOString(),
    jalaliDate: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * تولید خروجی کامل SQL Dump شامل تمام جداول، داده‌های حسابداری، کالاها، تنظیمات و تصاویر
 */
export async function generateSqlDump(): Promise<string> {
  const timestamp = new Date().toISOString();
  const jalali = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  let sql = `-- ==============================================================================\n`;
  sql += `-- KHATINOO COMPLETE DATABASE & MEDIA BACKUP (DUMP)\n`;
  sql += `-- تاریخ تولید: ${jalali} (${timestamp})\n`;
  sql += `-- سامانه یکپارچه فروشگاه آنلاین، صندوق فروشگاهی و حسابداری خطی‌نو\n`;
  sql += `-- دامنه: khatynoo.ir\n`;
  sql += `-- ==============================================================================\n\n`;
  sql += `BEGIN;\n\n`;

  for (const table of CORE_TABLES) {
    try {
      const res = await query(`SELECT * FROM ${table}`);
      const rows = res.rows || [];

      sql += `-- -------------------------------------------------------------\n`;
      sql += `-- Table: ${table} (${rows.length} records)\n`;
      sql += `-- -------------------------------------------------------------\n`;

      if (rows.length === 0) {
        sql += `-- [جدول ${table} بدون ردیف است]\n\n`;
        continue;
      }

      for (const row of rows) {
        const columns = Object.keys(row);
        const colList = columns.map((c) => `"${c}"`).join(', ');
        const valList = columns.map((c) => sqlEscapeValue(row[c])).join(', ');

        // اگر جدول کلید اصلی id دارد، از ON CONFLICT DO UPDATE استفاده می‌کنیم
        if (columns.includes('id')) {
          const updateAssignments = columns
            .filter((c) => c !== 'id')
            .map((c) => `"${c}" = EXCLUDED."${c}"`)
            .join(', ');

          if (updateAssignments.length > 0) {
            sql += `INSERT INTO ${table} (${colList}) VALUES (${valList}) ON CONFLICT ("id") DO UPDATE SET ${updateAssignments};\n`;
          } else {
            sql += `INSERT INTO ${table} (${colList}) VALUES (${valList}) ON CONFLICT ("id") DO NOTHING;\n`;
          }
        } else if (table === 'inventory_by_location') {
          sql += `INSERT INTO ${table} (${colList}) VALUES (${valList}) ON CONFLICT ("warehouse_id", "product_id") DO UPDATE SET "stock" = EXCLUDED."stock", "updated_at" = NOW();\n`;
        } else if (table === 'schema_migrations') {
          sql += `INSERT INTO ${table} (${colList}) VALUES (${valList}) ON CONFLICT ("name") DO NOTHING;\n`;
        } else {
          sql += `INSERT INTO ${table} (${colList}) VALUES (${valList});\n`;
        }
      }
      sql += `\n`;
    } catch (err: any) {
      sql += `-- Error reading table ${table}: ${err.message}\n\n`;
    }
  }

  // ذخیره فراداده‌های CMS و رسانه‌ها در قالب توضیحات یا متادیتا
  const cmsData = cmsEngine.getAllCmsData();
  sql += `-- -------------------------------------------------------------\n`;
  sql += `-- CMS Media Library, Modules & Settings Metadata (JSON Block)\n`;
  sql += `-- -------------------------------------------------------------\n`;
  sql += `/* KHATINOO_CMS_METADATA_START\n`;
  sql += JSON.stringify(cmsData, null, 2);
  sql += `\nKHATINOO_CMS_METADATA_END */\n\n`;

  sql += `COMMIT;\n`;
  return sql;
}

/**
 * تولید فایل پشتیبان با ساختار جامع JSON
 */
export async function generateJsonBackup(): Promise<any> {
  const dbData: Record<string, any[]> = {};
  const stats = await getBackupStats();

  for (const table of CORE_TABLES) {
    try {
      const res = await query(`SELECT * FROM ${table}`);
      dbData[table] = res.rows || [];
    } catch (e) {
      dbData[table] = [];
    }
  }

  const cmsData = cmsEngine.getAllCmsData();

  return {
    format: 'khatinoo_backup_bundle',
    version: '2.5.0',
    exportedAt: new Date().toISOString(),
    jalaliDate: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    stats,
    database: dbData,
    cms: cmsData,
  };
}

/**
 * بازیابی کامل اطلاعات از فایل پشتیبان JSON
 */
export async function restoreFromJson(backupData: any): Promise<{
  success: boolean;
  message: string;
  restoredTables: Record<string, number>;
  restoredMedia: number;
}> {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('ساختار فایل پشتیبان نامعتبر است.');
  }

  const database = backupData.database || backupData;
  const restoredTables: Record<string, number> = {};

  for (const table of CORE_TABLES) {
    const rows = database[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      restoredTables[table] = 0;
      continue;
    }

    let count = 0;
    for (const row of rows) {
      try {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;

        const colList = columns.map((c) => `"${c}"`).join(', ');
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = columns.map((c) => row[c]);

        if (columns.includes('id')) {
          const updateAssignments = columns
            .filter((c) => c !== 'id')
            .map((c) => `"${c}" = EXCLUDED."${c}"`)
            .join(', ');

          let sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`;
          if (updateAssignments.length > 0) {
            sql += ` ON CONFLICT ("id") DO UPDATE SET ${updateAssignments}`;
          } else {
            sql += ` ON CONFLICT ("id") DO NOTHING`;
          }
          await rawQuery(sql, values);
        } else if (table === 'inventory_by_location') {
          const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT ("warehouse_id", "product_id") DO UPDATE SET "stock" = EXCLUDED."stock", "updated_at" = NOW()`;
          await rawQuery(sql, values);
        } else if (table === 'schema_migrations') {
          const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT ("name") DO NOTHING`;
          await rawQuery(sql, values);
        } else {
          const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`;
          await rawQuery(sql, values);
        }
        count++;
      } catch (err: any) {
        console.warn(`⚠️ [Restore Table Warning] خطا در بازیابی ردیف جدول ${table}:`, err.message);
      }
    }
    restoredTables[table] = count;
  }

  // بازیابی داده‌های رسانه و CMS
  let restoredMedia = 0;
  if (backupData.cms) {
    const res = cmsEngine.restoreCmsData(backupData.cms);
    restoredMedia = res.restoredCmsItems;
  }

  return {
    success: true,
    message: 'اطلاعات پایگاه داده و تنظیمات با موفقیت بازیابی شدند.',
    restoredTables,
    restoredMedia,
  };
}

/**
 * بازیابی پایگاه داده از اسکریپت SQL
 */
export async function restoreFromSql(sqlScript: string): Promise<{
  success: boolean;
  message: string;
  statementsExecuted: number;
  cmsRestored: boolean;
}> {
  if (!sqlScript || typeof sqlScript !== 'string' || sqlScript.trim().length === 0) {
    throw new Error('متن اسکریپت SQL خالی یا نامعتبر است.');
  }

  // استخراج متادیتای CMS در صورت وجود
  let cmsRestored = false;
  const cmsMatch = sqlScript.match(/\/\* KHATINOO_CMS_METADATA_START([\s\S]*?)KHATINOO_CMS_METADATA_END \*\//);
  if (cmsMatch && cmsMatch[1]) {
    try {
      const cmsJson = JSON.parse(cmsMatch[1].trim());
      cmsEngine.restoreCmsData(cmsJson);
      cmsRestored = true;
    } catch (e) {
      console.warn('⚠️ [Restore SQL] خطا در خواندن متادیتای CMS از فایل SQL:', e);
    }
  }

  const statements = splitSqlStatements(sqlScript);
  let executedCount = 0;

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed === 'BEGIN;' || trimmed === 'COMMIT;' || trimmed.startsWith('/*')) {
      continue;
    }
    try {
      await rawQuery(trimmed);
      executedCount++;
    } catch (err: any) {
      const msg = err.message || '';
      if (!msg.includes('already exists') && !msg.includes('duplicate key')) {
        console.warn('⚠️ [Restore SQL Statement Notice]:', msg, 'in:', trimmed.slice(0, 60));
      }
    }
  }

  return {
    success: true,
    message: `اسکریپت SQL با اجرای ${executedCount} دستور با موفقیت اعمال گردید.`,
    statementsExecuted: executedCount,
    cmsRestored,
  };
}
