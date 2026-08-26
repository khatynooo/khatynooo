import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { testDbConnection, query, pool } from './dbClient';

export async function runMigrations(): Promise<{ executed: string[]; skipped: string[] }> {
  console.log('🔄 [Migrations] بررسی وضعیت و اجرای مایگریشن‌های پایگاه داده...');

  // ۱. ساخت جدول نگهداری تاریخچه مایگریشن‌ها در صورت عدم وجود
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ۲. استخراج لیست مایگریشن‌های قبلاً اجرا شده
  const res = await query('SELECT name FROM schema_migrations ORDER BY id ASC');
  const appliedMigrations = new Set<string>(res.rows.map((r: any) => r.name));

  const migrationsDir = path.join(process.cwd(), 'migrations');
  const executed: string[] = [];
  const skipped: string[] = [];

  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        skipped.push(file);
        continue;
      }

      console.log(`⏳ [Migration] در حال اعمال مایگریشن جدید: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // پاک‌سازی کامنت‌ها و تفکیک کوئری‌ها
      const cleanedSql = sqlContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '');

      const statements = cleanedSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement.toUpperCase().includes('CREATE EXTENSION')) continue;
        try {
          await query(statement);
        } catch (stmtErr: any) {
          if (!stmtErr.message?.includes('already exists')) {
            console.warn(`⚠️ [Migration Warning in ${file}]:`, stmtErr.message);
          }
        }
      }

      // ثبت مایگریشن در جدول رهگیری
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      executed.push(file);
      console.log(`✅ [Migration] مایگریشن ${file} با موفقیت اعمال و ثبت شد.`);
    }
  }

  if (executed.length > 0) {
    console.log(`🎉 [Migrations] تعداد ${executed.length} مایگریشن جدید با موفقیت اعمال گردید.`);
  } else {
    console.log('✨ [Migrations] پایگاه داده کاملاً بروز است (هیچ مایگریشن جدیدی یافت نشد).');
  }

  return { executed, skipped };
}

// اگر مستقیماً به عنوان اسکریپت CLI اجرا شد
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  (async () => {
    try {
      const connected = await testDbConnection();
      if (!connected) {
        console.error('❌ خطا: اتصال به پایگاه داده برقرار نشد.');
        process.exit(1);
      }
      await runMigrations();
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
      process.exit(0);
    } catch (err) {
      console.error('❌ خطا در اجرای مایگریشن‌ها:', err);
      process.exit(1);
    }
  })();
}
