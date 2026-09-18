import 'dotenv/config';
import { testDbConnection, pool } from '../server/dbClient';
import { analyzePackagingUnitMigration, executePackagingUnitMigration } from '../server/unitMigration';

async function main() {
  console.log('📦 [خطی‌نو] اسکریپت تحلیل و مایگریشن واحد پایه به «عدد»...');
  const connected = await testDbConnection();
  if (!connected) {
    console.error('❌ اتصال به پایگاه‌داده برقرار نشد.');
    process.exit(1);
  }

  const isExecute = process.argv.includes('--execute') || process.argv.includes('-y');

  console.log('🔍 در حال اسکن کاتالوگ و شناسایی کالاهای با واحد بسته‌بندی مرجع...');
  const analysis = await analyzePackagingUnitMigration();

  console.log(`\n📊 نتایج اسکن اولیه (Dry-Run):`);
  console.log(`- تعداد کل کالاهای بررسی‌شده: ${analysis.totalProductsScanned}`);
  console.log(`- تعداد کالاهای نیازمند تبدیل: ${analysis.affectedCount}`);

  if (analysis.affectedCount === 0) {
    console.log('✨ تمام کالاهای سیستم هم‌اکنون با واحد پایه «عدد» یا واحدهای وزنی/طولی استاندارد تنظیم شده‌اند. نیازی به مایگریشن نیست.');
    if (pool && typeof pool.end === 'function') await pool.end();
    process.exit(0);
  }

  console.log('\n📋 لیست کالاهای مشمول تغییر:');
  console.log('--------------------------------------------------------------------------------');
  for (const it of analysis.items) {
    console.log(`• [${it.code}] ${it.name}`);
    console.log(`  واحد فعلی: ${it.currentUnit} -> واحد جدید: ${it.proposedUnit} | بسته‌بندی مرجع: ${it.packagingUnit} (${it.packagingFactor} عددی)`);
    console.log(`  موجودی: ${it.currentStock} -> ${it.proposedStock}`);
    console.log(`  قیمت خرید: ${it.prices.buyPrice.current.toLocaleString()} -> ${it.prices.buyPrice.proposed.toLocaleString()} تومان`);
    console.log(`  قیمت فروش ۱: ${it.prices.priceShop1.current.toLocaleString()} -> ${it.prices.priceShop1.proposed.toLocaleString()} تومان`);
    console.log('--------------------------------------------------------------------------------');
  }

  if (!isExecute) {
    console.log('\n⚠️ حالت Dry-Run (آزمایشی): هیچ تغییری در پایگاه‌داده ذخیره نشد.');
    console.log('💡 برای اعمال واقعی تغییرات، دستور زیر را اجرا کنید:');
    console.log('   npx tsx scripts/migratePackagingUnits.ts --execute\n');
  } else {
    console.log('\n🚀 در حال اعمال تغییرات واقعی در پایگاه‌داده و ثبت لاگ ممیزی...');
    const result = await executePackagingUnitMigration(true, {
      userId: 'cli_admin',
      username: 'مدیر CLI خطی‌نو',
    });
    console.log(`✅ مایگریشن با موفقیت انجام شد! ${result.totalUpdated} کالا به‌روزرسانی شدند.`);
  }

  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ خطای غیرمنتظره در مایگریشن:', err);
  process.exit(1);
});
