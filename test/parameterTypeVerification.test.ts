import 'dotenv/config';
import { db } from '../server/db';
import { eitaaService } from '../server/eitaaService';
import { sendDirectEitaaMessage } from '../server/publication/eitaaDirectMessenger';
import { ensureDbInitialized, query } from '../server/dbClient';

async function runVerificationTests() {
  console.log('🧪 [Test Suite] شروع اجرای تست‌های صحت پارامترهای SQL و تایپ‌های PostgreSQL...\n');
  
  await ensureDbInitialized();

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. تست getCustomerOrderById با مقادیر مختلف و عدم رخداد خطای 42P08
  await testCase('db.getCustomerOrderById: فراخوانی با شناسه نامعتبر یا خالی', async () => {
    const res = await db.getCustomerOrderById('');
    if (res !== null) throw new Error('باید null برگرداند');
  });

  await testCase('db.getCustomerOrderById: فراخوانی با شناسه عددی/رشته‌ای غیرموجود', async () => {
    const res = await db.getCustomerOrderById('ORD-NON-EXISTENT');
    if (res !== null) throw new Error('باید null برگرداند');
  });

  await testCase('db.getCustomerOrderById: فراخوانی همراه با customerId و mobile', async () => {
    const res = await db.getCustomerOrderById('ORD-1234', 'cust_1', '09120000000');
    if (res !== null) throw new Error('باید null برگرداند');
  });

  // درج یک سفارش آزمایشی و تست بازیابی هم با id و هم با order_number
  await testCase('db.getCustomerOrderById: بازیابی موفق با id و سپس با order_number', async () => {
    const testId = `test_ord_${Date.now()}`;
    const testOrderNum = `ON-${Date.now()}`;
    await query(
      `INSERT INTO online_orders (
        id, order_number, customer_name, customer_mobile, customer_address,
        items, subtotal, shipping_method, final_amount, payment_gateway,
        payment_status, order_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testId,
        testOrderNum,
        'تست خریدار',
        '09121112233',
        'تهران - خیابان انقلاب',
        JSON.stringify([{ productId: 'p1', name: 'کالا', quantity: 1, unitPrice: 150000 }]),
        150000,
        'peyk',
        150000,
        'zarinpal',
        'pending',
        'processing',
      ]
    );

    const byId = await db.getCustomerOrderById(testId);
    if (!byId || byId.id !== testId) throw new Error(`یافت نشد با id: ${testId}`);

    const byNumber = await db.getCustomerOrderById(testOrderNum);
    if (!byNumber || byNumber.orderNumber !== testOrderNum) throw new Error(`یافت نشد با order_number: ${testOrderNum}`);

    const withCust = await db.getCustomerOrderById(testId, 'cust_none', '09121112233');
    if (!withCust || withCust.id !== testId) throw new Error('یافت نشد با فیلتر موبایل');
  });

  // 2. تست eitaaService.getContactProfile با chat_id و id
  await testCase('eitaaService.getContactProfile: فراخوانی با مقدار خالی یا ناموجود', async () => {
    const res = await eitaaService.getContactProfile('');
    if (res !== null) throw new Error('باید null برگرداند');

    const notFound = await eitaaService.getContactProfile('chat_unknown_999');
    if (notFound !== null) throw new Error('باید null برگرداند');
  });

  await testCase('eitaaService.getContactProfile: بازیابی هویت ایتا بر اساس chat_id و id', async () => {
    const uniqueChatId = `test_chat_${Date.now()}`;
    const saved = await eitaaService.upsertIdentity({
      chatId: uniqueChatId,
      firstName: 'کاربر تستی ایتا',
      mobile: '09123456789',
      source: 'test',
    });

    const profileByChatId = await eitaaService.getContactProfile(uniqueChatId);
    if (!profileByChatId || profileByChatId.identity.chatId !== uniqueChatId) {
      throw new Error('پروفایل با chat_id یافت نشد');
    }

    const profileById = await eitaaService.getContactProfile(saved.id);
    if (!profileById || profileById.identity.id !== saved.id) {
      throw new Error('پروفایل با id هویت یافت نشد');
    }
  });

  // 3. تست eitaaService.getContacts با فیلتر query و receipt_codes
  await testCase('eitaaService.getContacts: جستجو با عبارت متنی و آرایه کدهای رسید', async () => {
    const results = await eitaaService.getContacts({
      query: 'کاربر تستی',
    });
    if (!Array.isArray(results)) throw new Error('خروجی باید آرایه باشد');

    // تست با کاراکترهای خاص
    const specialSearch = await eitaaService.getContacts({
      query: "test' OR '1'='1",
    });
    if (!Array.isArray(specialSearch)) throw new Error('خروجی باید آرایه باشد');
  });

  // 4. تست getPublicBindingTracking با تفکیک پارامترها
  await testCase('db.getPublicBindingTracking: رهگیری با کدهای رسید مختلف', async () => {
    const res = await db.getPublicBindingTracking('BND-1001');
    if (!Array.isArray(res)) throw new Error('باید آرایه برگرداند');

    const resEmpty = await db.getPublicBindingTracking('');
    if (resEmpty.length !== 0) throw new Error('برای رشته خالی باید آرایه تهی برگرداند');
  });

  // 5. تست sendDirectEitaaMessage و استعلام از binding_orders
  await testCase('eitaaDirectMessenger.sendDirectEitaaMessage: استعلام refCode در صورت عدم وجود chat_id', async () => {
    const res = await sendDirectEitaaMessage({
      receiptCode: 'REC-NON-EXISTENT',
      text: 'پیام آزمایشی',
    });
    // چون chat_id پیدا نمی‌شود باید با status: no_chat_id بازگردد، نه با خطای 42P08 یا کرش سرور
    if (res.status !== 'no_chat_id') {
      throw new Error(`وضعیت غیرمنتظره: ${res.status}`);
    }
  });

  console.log(`\n📊 [نتایج تست]: ${passed} موفق، ${failed} ناموفق`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests().catch((e) => {
  console.error('Fatal error during test run:', e);
  process.exit(1);
});
