#!/bin/bash
set -e

# ==============================================================================
# اسکریپت بازیابی پایگاه داده خطی‌نو (Khatinoo Database Restore)
# این اسکریپت دیتابیس را از فایل پشتیبان فشرده (.sql.gz) بازیابی می‌کند.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"

# بارگذاری متغیرهای محیطی از فایل .env در صورت وجود
if [ -f "${PROJECT_DIR}/.env" ]; then
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-khatinoo_user}"
DB_NAME="${POSTGRES_DB:-khatinoo_db}"

BACKUP_FILE="$1"

# اگر فایلی به عنوان ورودی داده نشده باشد، آخرین فایل‌های موجود را نمایش داده و می‌پرسد
if [ -z "$BACKUP_FILE" ]; then
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null)" ]; then
    echo "❌ هیچ فایل بک‌آپی در پوشه backups یافت نشد."
    echo "💡 راهنما: ./restore.sh backups/khatinoo_db_YYYY-MM-DD_HH-MM-SS.sql.gz"
    exit 1
  fi

  echo "📋 لیست فایل‌های پشتیبان موجود:"
  echo "---------------------------------------------------------"
  ls -lh "$BACKUP_DIR"/*.sql.gz | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
  echo "---------------------------------------------------------"
  
  # پیدا کردن آخرین بک‌آپ
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz | head -n 1)
  echo "💡 آخرین بک‌آپ موجود: ${LATEST_BACKUP}"
  read -r -p "👉 مسیر فایل بک‌آپ را وارد کنید [پیش‌فرض: آخرین فایل]: " INPUT_FILE
  
  if [ -z "$INPUT_FILE" ]; then
    BACKUP_FILE="$LATEST_BACKUP"
  else
    BACKUP_FILE="$INPUT_FILE"
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ خطا: فایل بک‌آپ مورد نظر یافت نشد: $BACKUP_FILE"
  exit 1
fi

echo ""
echo "⚠️  هشدار بسیار مهم:"
echo "----------------------------------------------------------------------"
echo "عملیات بازیابی، کلیه اطلاعات فعلی دیتابیس '${DB_NAME}' را با محتوای فایل زیر جایگزین می‌کند:"
echo "📁 فایل: ${BACKUP_FILE}"
echo "----------------------------------------------------------------------"
read -r -p "آیا کاملاً مطمئن هستید که می‌خواهید دیتابیس را بازیابی کنید؟ (برای تایید عبارت 'yes' را تایپ کنید): " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
  echo "❌ عملیات بازیابی لغو شد."
  exit 0
fi

echo "🔄 [Khatinoo Restore] در حال آماده‌سازی و بازیابی پایگاه داده..."

# اطمینان از روشن بودن کانتینر دیتابیس
if ! docker compose ps db --status running | grep -q "db"; then
  echo "⏳ در حال روشن کردن کانتینر db..."
  docker compose up -d db
  sleep 4
fi

# بازیابی مستقیم فایل فشرده به PostgreSQL
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}"

echo "🎉 بازیابی پایگاه داده با موفقیت کامل انجام شد."
echo "💡 در صورت نیاز برای اعمال تغییرات در اپلیکیشن: docker compose restart app"
