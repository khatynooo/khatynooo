import 'dotenv/config';
import { testDbConnection, initializeSchema, seedInitialData, pool } from './dbClient';

async function main() {
  console.log('🚀 [Khatinoo Database Init] در حال آماده‌سازی و راه‌اندازی دیتابیس PostgreSQL...');
  
  const connected = await testDbConnection();
  if (!connected) {
    console.error('❌ خطا: اتصال به دیتابیس PostgreSQL برقرار نشد. لطفاً متغیر DATABASE_URL را بررسی کنید.');
    process.exit(1);
  }

  await initializeSchema();
  await seedInitialData();

  console.log('🎉 پایگاه داده و کاربر مدیر با موفقیت آماده و مقداردهی اولیه شدند.');
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ خطای پیش‌بینی نشده در اجرای اسکریپت:', err);
  process.exit(1);
});
