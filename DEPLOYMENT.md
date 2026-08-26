# راهنمای جامع و عملیاتی استقرار سامانه «خطینو» (Khatinoo) روی سرور Ubuntu

این مستند راهنمای مرحله‌به‌مرحله راه‌اندازی، اتصال دامنه **khatynoo.ir**، ایمن‌سازی دیتابیس PostgreSQL، فایروال، سیستم بک‌آپ خودکار، اجرای مایگریشن‌ها و انتشار امن نسخه‌های جدید است.

---

## 🔒 الزامات امنیتی حساس (Security Hardening & Secret Rotation)

> [!CAUTION]
> **قبل از اجرای سامانه در حالت Production، تولید کلید‌های تصادفی اختصاصی الزامی است:**
> ۱. سرور در محیط `NODE_ENV=production` در صورتی که `JWT_SECRET` خالی یا مقدار پیش‌فرض نمونه باشد، به دلایل امنیتی از اجرا جلوگیری خواهد کرد (`SECURITY FATAL`).
> ۲. برای پایگاه داده و JWT حتماً از ابزار `openssl` کلیدهای تصادفی قوی تولید کنید:

```bash
# تولید رمز عبور بسیار قوی برای پایگاه داده PostgreSQL:
openssl rand -base64 24

# تولید کلید امضای اختصاصی و امن JWT:
openssl rand -hex 32
```

---

## ۱. آماده‌سازی سرور اوبونتو (Ubuntu Server 22.04 / 24.04 LTS)

### ۱.۱. به‌روزرسانی بسته‌ها و ابزارهای ضروری
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw certbot python3-certbot-nginx nginx
```

---

## ۲. نصب و راه‌اندازی Node.js و PostgreSQL

### ۲.۱. نصب Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # خروجی باید نسخه 20 یا بالاتر باشد
```

### ۲.۲. نصب و پیکربندی امن PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ورود به کنسول psql
sudo -u postgres psql
```

درون کنسول `psql` دستورات زیر را اجرا کنید (رمز عبور تصادفی تولیدشده با openssl را جایگزین کنید):
```sql
CREATE DATABASE khatinoo_db;
CREATE USER khatinoo_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_RANDOM_POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE khatinoo_db TO khatinoo_user;
\c khatinoo_db
GRANT ALL ON SCHEMA public TO khatinoo_user;
\q
```

### ۲.۳. مقاومت در برابر قطعی برق ناگهانی سرور (WAL & fsync)
فایل `/etc/postgresql/16/main/postgresql.conf` (یا نسخه فعال) را باز کنید:
```ini
fsync = on
synchronous_commit = on
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
max_wal_size = 2GB
min_wal_size = 512MB
checkpoint_completion_target = 0.9
```
پوشه آرشیو را بسازید و دیتابیس را ریستارت کنید:
```bash
sudo mkdir -p /var/lib/postgresql/wal_archive
sudo chown -R postgres:postgres /var/lib/postgresql/wal_archive
sudo systemctl restart postgresql
```

---

## ۳. کلون پروژه، فایل `.env` و راه‌اندازی ساختار دیتابیس

### ۳.۱. کلون در مسیر استاندارد `/var/www/khatinoo`
```bash
sudo mkdir -p /var/www/khatinoo
sudo chown -R $USER:$USER /var/www/khatinoo
cd /var/www/khatinoo

# کلون یا کپی سورس‌کد پروژه
git clone <YOUR_GIT_REPO_URL> .
```

### ۳.۲. ایجاد فایل `.env` واقعی سرور
```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=khatinoo_db
POSTGRES_USER=khatinoo_user
POSTGRES_PASSWORD=YOUR_STRONG_RANDOM_POSTGRES_PASSWORD
DATABASE_URL=postgresql://khatinoo_user:YOUR_STRONG_RANDOM_POSTGRES_PASSWORD@localhost:5432/khatinoo_db
JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET_32_CHARS
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
POS_PASARGAD_IP=192.168.1.150
POS_PASARGAD_PORT=7000
POS_PASARGAD_TERMINAL_ID=87654321
POS_PASARGAD_MERCHANT_ID=12345678
EOF

chmod 600 .env
```

### ۳.۳. نصب پکیج‌ها، اعمال اسکیما و مایگریشن‌ها
```bash
npm install --production=false

# ۱. اجرای ساختار پایه جداول
PGPASSWORD='YOUR_STRONG_RANDOM_POSTGRES_PASSWORD' psql -h localhost -U khatinoo_user -d khatinoo_db -f schema.sql

# ۲. اجرای مایگریشن‌های تکمیلی (نظیر جدول تراکنش‌های تامین‌کنندگان)
for f in migrations/*.sql; do
  echo "Applying migration: $f"
  PGPASSWORD='YOUR_STRONG_RANDOM_POSTGRES_PASSWORD' psql -h localhost -U khatinoo_user -d khatinoo_db -f "$f"
done

# ۳. بیلد پروژه
npm run build
```

---

## ۴. تنظیم سرویس خودکار سیستم‌عامل (systemd Service)

فایل `/etc/systemd/system/khatinoo.service` را بسازید:
```ini
[Unit]
Description=Khatinoo Integrated Stationery & POS Platform
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/khatinoo
ExecStart=/usr/bin/node /var/www/khatinoo/dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/var/www/khatinoo/.env

LimitNOFILE=65535
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=khatinoo-app

[Install]
WantedBy=multi-user.target
```

فعال‌سازی سرویس:
```bash
sudo systemctl daemon-reload
sudo systemctl enable khatinoo
sudo systemctl start khatinoo
sudo systemctl status khatinoo
```

---

## ۵. تنظیم Nginx Reverse Proxy و SSL با Let's Encrypt

فایل `/etc/nginx/sites-available/khatynoo.ir` را ایجاد کنید:
```nginx
server {
    listen 80;
    server_name khatynoo.ir www.khatynoo.ir;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
    }
}
```

اتصال و دریافت SSL رایگان خودکار:
```bash
sudo ln -s /etc/nginx/sites-available/khatynoo.ir /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# دریافت گواهینامه امنیتی SSL خودکار
sudo certbot --nginx -d khatynoo.ir -d www.khatynoo.ir --non-interactive --agree-tos -m admin@khatynoo.ir
```

---

## ۶. تنظیم فایروال سخت‌گیرانه (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Access'
sudo ufw allow 80/tcp comment 'HTTP Web'
sudo ufw allow 443/tcp comment 'HTTPS Web'
sudo ufw enable
sudo ufw status verbose
```

---

## ۷. استقرار نسخه‌های جدید با `deploy.sh` (Safe Continuous Deployment)

برای اعمال خودکار هر آپدیت جدید از گیت‌هاب:
```bash
chmod +x /var/www/khatinoo/deploy.sh
/var/www/khatinoo/deploy.sh
```

این اسکریپت به صورت خودکار:
۱. بک‌آپ کامل و فشرده دیتابیس را در `/var/backups/khatinoo` ذخیره و اعتبارسنجی می‌کند.
۲. آخرین کامیت‌ها را دریافت می‌کند.
۳. پکیج‌ها را نصب و مایگریشن‌های جدید SQL را اعمال می‌کند.
۴. سرور را بیلد کرده و بدون اختلال با `systemctl` ریستارت می‌کند.
۵. سنجش سلامت (`/api/health`) را برای اطمینان از عملکرد صحیح انجام می‌دهد.

---

## ۸. سیستم بک‌آپ شبانه و بازیابی اضطراری (Backup & Recovery)

### ۸.۱. تنظیم اسکریپت بک‌آپ شبانه در `/usr/local/bin/backup_khatinoo.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/khatinoo"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="$BACKUP_DIR/khatinoo_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -f /var/www/khatinoo/.env ]; then
  set -a
  source /var/www/khatinoo/.env
  set +a
  PGPASSWORD="${POSTGRES_PASSWORD:-$DB_PASSWORD}" pg_dump -h localhost -U "${POSTGRES_USER:-khatinoo_user}" "${POSTGRES_DB:-khatinoo_db}" | gzip > "$FILENAME"
fi

# نگهداری بک‌آپ‌های ۳۰ روز اخیر و حذف قدیمی‌ترها
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
```

```bash
sudo chmod +x /usr/local/bin/backup_khatinoo.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup_khatinoo.sh >> /var/log/khatinoo_backup.log 2>&1") | crontab -
```

### ۸.۲. نحوه بازیابی اضطراری از فایل بک‌آپ (Emergency Restore):
```bash
gunzip -c /var/backups/khatinoo/pre_deploy_backup_XXXXXX.sql.gz | PGPASSWORD='YOUR_POSTGRES_PASSWORD' psql -h localhost -U khatinoo_user -d khatinoo_db
```

---

## ۹. تست نهایی سلامت سیستم (Health Check)

```bash
curl -i https://khatynoo.ir/api/health
```

خروجی معتبر:
```json
{
  "status": "ok",
  "database": "healthy",
  "store": "Khatinoo (خطینو)",
  "version": "1.0.0"
}
```
