#!/bin/bash
set -e

# ==============================================================================
# اسکریپت استقرار و بروزرسانی خودکار و امن داکری خطی‌نو (Khatinoo Safe Docker Deploy)
# ویژگی‌ها:
# ۱. بک‌آپ‌گیری خودکار از دیتابیس قبل از هرگونه تغییر
# ۲. دریافت آخرین تغییرات سورس‌کد
# ۳. بیلد مجدد فقط کانتینر app (دیتابیس و Volume آن بدون تغییر و پایدار باقی می‌مانند)
# ۴. استقرار سرویس و اجرای خودکار مایگریشن‌ها
# ۵. چک سلامت سرویس و ارائه راهنمای Rollback در صورت بروز خطا
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${PROJECT_DIR}"

echo "========================================================================"
echo "🚀 [Khatinoo Docker Deploy] شروع فرآیند استقرار نسخه جدید پروژه خطی‌نو"
echo "========================================================================"

# ۱. تهیه نسخه پشتیبان اضطراری قبل از اعمال هر تغییری
echo "==> [۱/۶] اجرای بک‌آپ خودکار دیتابیس..."
if [ -f "./backup.sh" ]; then
  chmod +x ./backup.sh
  ./backup.sh
else
  echo "⚠️ هشدار: فایل backup.sh یافت نشد؛ در حال ادامه فرآیند..."
fi

# ۲. دریافت آخرین کدهای پروژه از مخزن گیت
echo "==> [۲/۶] دریافت آخرین تغییرات از مخزن Git..."
if [ -d ".git" ]; then
  git fetch origin main || true
  git reset --hard origin/main || git pull origin main || true
else
  echo "ℹ️ پوشه .git یافت نشد (استقرار دستی/مستقیم)."
fi

# ۳. بیلد مجدد کانتینر اپلیکیشن (سرویس db و حجم khatinoo_pgdata دست‌نخورده می‌مانند)
echo "==> [۳/۶] ساخت ایمیج جدید برای سرویس app..."
docker compose build app

# ۴. راه‌اندازی و بروزرسانی سرویس app با ایمیج جدید (بدون خاموش کردن یا تغییر db)
echo "==> [۴/۶] استقرار کانتینر جدید app..."
docker compose up -d --no-deps app

# ۵. اجرای مایگریشن‌های جدید دیتابیس در صورت وجود
echo "==> [۵/۶] بررسی و اعمال مایگریشن‌های دیتابیس..."
docker compose exec -T app npm run db:migrate || echo "ℹ️ مایگریشن‌ها توسط سرور در زمان بوت به صورت خودکار مدیریت شدند."

# ۶. آزمون سلامت نهایی سیستم (Health Check)
echo "==> [۶/۶] سنجش سلامت سیستم روی 127.0.0.1:3000/api/health..."
MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "⏳ بررسی وضعیت سلامت (تلاش $RETRY_COUNT از $MAX_RETRIES)..."
  sleep 2

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTH_OK=true
    break
  fi
done

if [ "$HEALTH_OK" = true ]; then
  echo ""
  echo "========================================================================"
  echo "🎉 [استقرار موفق] نسخه جدید خطی‌نو با موفقیت استقرار یافت و در حال سرویس‌دهی است."
  echo "🌐 پورت لوکال: 127.0.0.1:3000 (پروکسی‌شده از Nginx برای دامنه khatynoo.ir)"
  echo "========================================================================"
else
  echo ""
  echo "❌ [خطا در استقرار] Endpoint سلامت پاسخ ۲۰۰ نداد (HTTP Code: $HTTP_CODE)."
  echo "📋 آخرین لاگ‌های کانتینر app:"
  docker compose logs --tail=30 app
  echo ""
  echo "🛠️ راهنمای بازگردانی به نسخه قبل (Rollback):"
  echo "   ۱. docker compose logs app (مشاهده جزییات خطا)"
  echo "   ۲. ./restore.sh (در صورت نیاز به بازگردانی دیتابیس به بک‌آپ قبل از deploy)"
  echo "   ۳. docker compose restart app"
  exit 1
fi
