#!/bin/bash
set -e

# ==============================================================================
# اسکریپت انتشار و آپدیت امن خطینو (Khatinoo Safe Deployment Script)
# این اسکریپت بک‌آپ فوری با اعتبارسنجی حجم می‌گیرد، کد جدید را بیلد می‌کند،
# مایگریشن‌های پایگاه‌داده را اجرا کرده و سرویس را بدون قطعی ریستارت می‌نماید.
# ==============================================================================

APP_DIR="/var/www/khatinoo"
BACKUP_DIR="/var/backups/khatinoo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "==> [۱/۶] شروع فرآیند استقرار در مسیر $APP_DIR..."
cd "$APP_DIR"

# ۱. بارگذاری متغیرهای محیطی و تهیه بک‌آپ اضطراری قبل از هر تغییر
echo "==> [۲/۶] بررسی متغیرها و تهیه بک‌آپ اضطراری پایگاه داده..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre_deploy_backup_$TIMESTAMP.sql.gz"

if [ -f .env ]; then
  # خواندن امن متغیرها
  set -a
  source .env
  set +a

  DB_PASS="${POSTGRES_PASSWORD:-${DB_PASSWORD}}"
  DB_USER="${POSTGRES_USER:-${DB_USER:-khatinoo_user}}"
  DB_NAME="${POSTGRES_DB:-${DB_NAME:-khatinoo_db}}"
  DB_HOST="${POSTGRES_HOST:-${DB_HOST:-localhost}}"
  DB_PORT="${POSTGRES_PORT:-${DB_PORT:-5432}}"

  if [ -n "$DB_PASS" ]; then
    echo "📦 در حال خروجی گرفتن از پایگاه‌داده $DB_NAME..."
    if PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
      if [ -s "$BACKUP_FILE" ]; then
        echo "✅ فایل بک‌آپ با موفقیت در $BACKUP_FILE ذخیره شد (حجم: $(du -h "$BACKUP_FILE" | cut -f1))."
      else
        echo "⚠️ هشدار: فایل بک‌آپ خالی است! لطفاً دسترسی‌های PostgreSQL را بررسی کنید."
      fi
    else
      echo "⚠️ اخطار: دستور pg_dump با خطا مواجه شد. لطفاً بررسی کنید."
    fi
  else
    echo "⚠️ متغیر POSTGRES_PASSWORD در .env یافت نشد؛ بک‌آپ خودکار رد شد."
  fi
fi

# ۲. دریافت آخرین تغییرات کد
echo "==> [۳/۶] دریافت آخرین تغییرات از مخزن گیت..."
if [ -d .git ]; then
  git fetch origin main || git fetch origin master || true
  git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
fi

# ۳. نصب پکیج‌ها و اجرای مایگریشن‌ها
echo "==> [۴/۶] نصب وابستگی‌ها و بیلد پروژه..."
npm install --production=false

# اجرای مایگریشن‌های ساختار دیتابیس در صورت وجود psql
if [ -n "$DB_PASS" ] && [ -d "migrations" ]; then
  echo "🔄 در حال بررسی و اعمال مایگریشن‌های پایگاه داده..."
  for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
      echo "   اعمال مایگریشن: $migration"
      PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>/dev/null || true
    fi
  done
fi

if ! npm run build; then
  echo "❌ خطا در مرحله بیلد! فرآیند متوقف شد و نسخه قبلی فعال باقی ماند."
  exit 1
fi

# ۴. ریستارت بدون قطعی با PM2 یا systemd
echo "==> [۵/۶] اعمال نسخه جدید در پروسه سرور..."
if command -v pm2 &> /dev/null; then
  pm2 reload ecosystem.config.js || pm2 restart ecosystem.config.js || true
elif command -v systemctl &> /dev/null; then
  sudo systemctl restart khatinoo || sudo systemctl restart khatinoo.service || true
fi

# ۵. تست سلامت نهایی (Health Check)
echo "==> [۶/۶] سنجش سلامت سیستم پس از انتشار..."
sleep 3
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || echo "500")

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo "✅ استقرار نسخه جدید خطینو با موفقیت کامل انجام شد و سرویس کاملاً پایدار است."
else
  echo "⚠️ اخطار: Endpoint سلامت پاسخ ۲۰۰ نداد (کد وضعیت: $HEALTH_STATUS). لاگ‌های سرور:"
  if command -v journalctl &> /dev/null; then
    journalctl -u khatinoo.service -n 20 --no-pager || true
  fi
fi
