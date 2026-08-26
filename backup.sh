#!/bin/bash
set -e

# ==============================================================================
# اسکریپت پشتیبان‌گیری خودکار پایگاه داده خطی‌نو (Khatinoo Database Backup)
# این اسکریپت دیتابیس را به صورت فشرده (.sql.gz) در پوشه ./backups ذخیره می‌کند.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/khatinoo_db_${TIMESTAMP}.sql.gz"

# بارگذاری متغیرهای محیطی از فایل .env در صورت وجود
if [ -f "${PROJECT_DIR}/.env" ]; then
  # export variables safely
  set -a
  source "${PROJECT_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-khatinoo_user}"
DB_NAME="${POSTGRES_DB:-khatinoo_db}"

echo "🔄 [Khatinoo Backup] در حال تهیه نسخه پشتیبان از دیتابیس '${DB_NAME}'..."

# ایجاد پوشه backups روی هاست در صورت عدم وجود
mkdir -p "${BACKUP_DIR}"

# بررسی فعال بودن کانتینر دیتابیس
if ! docker compose ps db --status running | grep -q "db"; then
  echo "⚠️ کانتینر دیتابیس (db) روشن نیست. در حال روشن کردن موقت سرویس db..."
  docker compose up -d db
  echo "⏳ در حال انتظار برای آماده شدن دیتابیس..."
  sleep 4
fi

# اجرای pg_dump داخل کانتینر و پایپ کردن به gzip روی هاست
docker compose exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "✅ نسخه پشتیبان با موفقیت ایجاد شد:"
  echo "   📁 مسیر: ${BACKUP_FILE}"
  echo "   📊 حجم: ${FILE_SIZE}"
else
  echo "❌ خطا: فایل پشتیبان خالی است یا ایجاد نشد!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi
