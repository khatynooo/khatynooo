# راهنمای جامع داکرایز کردن و استقرار پروژه «خطی‌نو» (Khatinoo Docker Guide)

این راهنما برای اجرای پایدار، امن و بدون قطعی سامانه فروشگاه آنلاین و حسابداری **خطی‌نو (khatynoo.ir)** با داکر در کنار سرویس **Nextcloud** موجود روی سرور اوبونتو تهیه شده است.

---

## 🏗️ معماری داکر و ایزولاسیون سرویس‌ها

پروژه به صورت دو کانتینر مستقل در یک شبکه ایزوله داکر (`khatinoo_network`) اجرا می‌شود:

1. **سرویس `app` (Node 20 Alpine Multi-Stage):**
   - اجرای فرانت‌اند و بک‌اند کامپایل‌شده خطی‌نو با فریم‌ورک Express و Vite.
   - پورت برنامه **تنها** روی `127.0.0.1:3000` هاست متصل (Bind) شده است تا با پورت‌های ۸۰ و ۴۴۳ نکست‌کلود یا دیگر پورت‌های سرور تداخل نکند.
   - دارای **Healthcheck** دوره‌ای به آدرس `/api/health`.

2. **سرویس `db` (PostgreSQL 16 Alpine):**
   - دیتابیس مستقل با والیوم پایدار نام‌گذاری شده `khatinoo_pgdata`.
   - ایزوله درون شبکه داخلی داکر (بدون باز کردن پورت خارجی).

3. **والیوم‌های ماندگار (Persistent Named Volumes):**
   - `khatinoo_pgdata`: ذخیره‌سازی داده‌های دیتابیس پستگرس روی مسیر `/var/lib/postgresql/data`.
   - `khatinoo_uploads`: ذخیره‌سازی تصاویر، فایل‌ها و بنرهای آپلودی فروشگاه روی مسیر `/app/uploads`.

---

## 🚀 ۱. راه‌اندازی اولیه روی سرور (First Run)

### گام اول: کپی کردن پروژه و تنظیم متغیرهای محیطی
در مسیر دلخواه روی سرور (مثلاً `/var/www/khatinoo`):

```bash
# ایجاد فایل تنظیمات از روی نمونه
cp .env.example .env

# ویرایش متغیرها و قرار دادن رمز عبور امن دیتابیس و کلیدها
nano .env
```

نمونه مقادیر پیشنهادی در `.env`:
```env
PORT=3000
NODE_ENV=production
APP_URL=https://khatynoo.ir
JWT_SECRET=your_super_strong_random_jwt_secret_key_2026
POSTGRES_DB=khatinoo_db
POSTGRES_USER=khatinoo_user
POSTGRES_PASSWORD=your_strong_password_here
DATABASE_URL=postgresql://khatinoo_user:your_strong_password_here@db:5432/khatinoo_db
```

### گام دوم: ساخت و بالا آوردن کانتینرها
مجوز اجرای اسکریپت‌ها را تنظیم کرده و کانتینرها را اجرا کنید:

```bash
chmod +x deploy-docker.sh backup.sh restore.sh
docker compose up -d --build
```

پس از چند ثانیه، وضعیت سرویس‌ها را با دستور زیر بررسی کنید:
```bash
docker compose ps
curl http://127.0.0.1:3000/api/health
```

---

## 🌐 ۲. تنظیم Nginx هاست برای دامنه `khatynoo.ir`

روی سرور اوبونتو (خارج از کانتینرها)، یک فایل کانفیگ Nginx برای دامنه خطی‌نو ایجاد کنید:

```bash
sudo nano /etc/nginx/sites-available/khatynoo.ir
```

محتوای زیر را داخل فایل قرار دهید:

```nginx
server {
    listen 80;
    server_name khatynoo.ir www.khatynoo.ir;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

فعال‌سازی کانفیگ و دریافت گواهی SSL رایگان Let's Encrypt:

```bash
sudo ln -s /etc/nginx/sites-available/khatynoo.ir /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# دریافت گواهی امنیتی SSL (Certbot)
sudo certbot --nginx -d khatynoo.ir -d www.khatynoo.ir
```

> **نکته:** این تنظیم هیچ تداخلی با تنظیمات ساب‌دامین یا دامنه‌ی Nextcloud شما ندارد.

---

## 🔄 ۳. بروزرسانی و استقرار بدون از دست رفتن داده (Zero Downtime Update)

برای دریافت آخرین تغییرات کد و انتشار نسخه جدید، فقط کافیست اسکریپت زیر را اجرا کنید:

```bash
./deploy-docker.sh
```

### مراحل کارکرد `deploy-docker.sh`:
1. **تهیه بک‌آپ اضطراری خودکار** از دیتابیس قبل از هرگونه تغییر و ذخیره در پوشه `./backups`.
2. اجرای `git pull origin main` جهت دریافت آخرین تغییرات.
3. بیلد مجدد **فقط کانتینر `app`** (کانتینر دیتابیس `db` و والیوم آن دست‌نخورده باقی می‌مانند).
4. اجرای مایگریشن‌های جدید دیتابیس به صورت امن و Idempotent.
5. تست سلامت (Health Check) کانتینر در آدرس `/api/health`.

---

## 💾 ۴. پشتیبان‌گیری و بازیابی پایگاه داده (Backup & Restore)

### پشتیبان‌گیری دستی:
```bash
./backup.sh
```
خروجی در مسیر `./backups/khatinoo_db_YYYY-MM-DD_HH-MM-SS.sql.gz` روی هارد هاست ذخیره می‌شود.

### بازیابی دیتابیس (Restore):
```bash
# بازیابی با انتخاب از میان لیست بک‌آپ‌های موجود:
./restore.sh

# یا بازیابی مستقیم یک فایل مشخص:
./restore.sh backups/khatinoo_db_2026-08-21_12-00-00.sql.gz
```
*قبل از اجرا، اسکریپت تاییدیه صریح دریافت می‌کند تا از بازنویسی اشتباه جلوگیری شود.*

---

## 🗄️ ۵. راهنمای اضافه کردن مایگریشن‌های جدید دیتابیس

برای تغییر ساختار دیتابیس در آپدیت‌های آینده:
1. یک فایل جدید و شماره‌دار در پوشه `migrations/` ایجاد کنید (مثلاً `migrations/003_add_new_feature.sql`).
2. دستورات SQL را به صورت امن و با شرط `IF NOT EXISTS` بنویسید:
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months INT DEFAULT 0;
   ```
3. در زمان استقرار با `./deploy-docker.sh` یا اجرای `npm run db:migrate`، سیستم جدول `schema_migrations` را بررسی کرده و **فقط فایل‌های جدید** را روی دیتابیس اعمال می‌کند و داده‌های قبلی حفظ می‌مانند.

---

## ⚠️ ۶. هشدارهای بسیار مهم و حیاتی

1. **ممنوعیت استفاده از دستور `docker compose down -v` یا `down --volumes`:**
   این فلگ باعث حذف والیوم `khatinoo_pgdata` و پاک شدن کل دیتابیس می‌شود. برای خاموش یا روشن کردن، صرفاً از `docker compose down` یا `docker compose stop` استفاده کنید.
2. **پوشه `backups/`:** به صورت منظم از پوشه `./backups` یک نسخه در فضایی خارج از سرور ذخیره نمایید.
