# راهنمای جامع و عملیاتی استقرار سامانه «خطینو» (Khatinoo) روی سرور Ubuntu
### دامنه: `khtynoo.ir` و `www.khtynoo.ir` | پورت داخلی: `3000`

این مستند راهنمای گام‌به‌گام و عملیاتی برای راه‌اندازی پروژه روی سرور اوبونتو (Ubuntu 22.04 / 24.04 LTS)، اتصال دامنه **khtynoo.ir**، تنظیم وب‌سرور Nginx به عنوان Reverse Proxy روی پورت ۳۰۰۰، دریافت گواهی امنیتی SSL رایگان (Let's Encrypt)، پیکربندی PostgreSQL، مدیریت سرویس با systemd یا PM2 و ایمن‌سازی فایروال است.

---

## 🔒 الزامات امنیتی و متغیرهای کلیدی

قبل از استقرار، مقادیر تصادفی و امن برای کلیدهای محرمانه تولید کنید:

```bash
# تولید رمز عبور بسیار قوی برای پایگاه داده PostgreSQL:
openssl rand -base64 24

# تولید کلید امضای اختصاصی و امن JWT (حداقل ۳۲ کاراکتر):
openssl rand -hex 32
```

---

## ۱. آماده‌سازی سرور اوبونتو (Ubuntu Server)

### ۱.۱. به‌روزرسانی بسته‌ها و نصب ابزارهای ضروری
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw certbot python3-certbot-nginx nginx
```

---

## ۲. نصب Node.js و PostgreSQL

### ۲.۱. نصب Node.js (نسخه 20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # باید نسخه v20.x نمایش داده شود
```

### ۲.۲. نصب و راه‌اندازی پایگاه‌داده PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ورود به کنسول psql برای ساخت دیتابیس و کاربر
sudo -u postgres psql
```

درون کنسول `psql` دستورات زیر را وارد کنید (رمز عبور تصادفی تولید شده را جایگزین نمایید):
```sql
CREATE DATABASE khatinoo_db;
CREATE USER khatinoo_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_RANDOM_POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE khatinoo_db TO khatinoo_user;
\c khatinoo_db
GRANT ALL ON SCHEMA public TO khatinoo_user;
\q
```

---

## ۳. انتقال کد پروژه و پیکربندی `.env`

### ۳.۱. ایجاد مسیر پروژه در `/var/www/khatinoo`
```bash
sudo mkdir -p /var/www/khatinoo
sudo chown -R $USER:$USER /var/www/khatinoo
cd /var/www/khatinoo

# قرار دادن سورس پروژه (از طریق git clone یا scp/rsync)
# git clone <YOUR_REPO_URL> .
```

### ۳.۲. ایجاد فایل `.env` مخصوص سرور (Production)
```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=3000

# تنظیمات اتصال به PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=khatinoo_db
POSTGRES_USER=khatinoo_user
POSTGRES_PASSWORD=YOUR_STRONG_RANDOM_POSTGRES_PASSWORD
DATABASE_URL=postgresql://khatinoo_user:YOUR_STRONG_RANDOM_POSTGRES_PASSWORD@localhost:5432/khatinoo_db

# امنیت و توکن‌ها
JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET_32_CHARS
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_IF_EXISTS

# دامنه و پورت
APP_DOMAIN=khtynoo.ir
APP_URL=https://khtynoo.ir
EOF

chmod 600 .env
```

### ۳.۳. نصب وابستگی‌ها، اعمال اسکیما و بیلد
```bash
npm install

# ۱. اجرای ساختار اولیه جداول دیتابیس
PGPASSWORD='YOUR_STRONG_RANDOM_POSTGRES_PASSWORD' psql -h localhost -U khatinoo_user -d khatinoo_db -f schema.sql

# ۲. اجرای مایگریشن‌های تکمیلی
for f in migrations/*.sql; do
  if [ -f "$f" ]; then
    echo "اعمال مایگریشن: $f"
    PGPASSWORD='YOUR_STRONG_RANDOM_POSTGRES_PASSWORD' psql -h localhost -U khatinoo_user -d khatinoo_db -f "$f"
  fi
done

# ۳. بیلد کامل سرور و کلاینت
npm run build
```

---

## ۴. راه‌اندازی و مدیریت برنامه با PM2 (رویکرد پیشنهادی شما)

### ۴.۱. نصب سراسری PM2
```bash
sudo npm install -g pm2
```

### ۴.۲. راه‌اندازی پروژه با فایل کانفیگ PM2 (`ecosystem.config.js`)
پروژه شامل فایل اختصاصی `ecosystem.config.js` است که لاگ‌ها، پورت ۳۰۰۰ و ریستارت خودکار را مدیریت می‌کند:

```bash
cd /var/www/khatinoo
mkdir -p logs

# اجرای برنامه با PM2
pm2 start ecosystem.config.js

# ذخیره وضعیت پروسه‌ها و فعال‌سازی اجرای خودکار هنگام ریستارت سرور (Startup Hook)
pm2 save
pm2 startup systemd
# (دستوری که ترمینال در خروجی بالا به شما می‌دهد را کپی و اجرا کنید)
```

### ۴.۳. دستورات پرکاربرد PM2
```bash
# مشاهده وضعیت پروسه
pm2 status

# مشاهده لاگ‌های زنده
pm2 logs khatinoo-app

# مانیتورینگ منابع مصرفی (CPU و RAM)
pm2 monit

# ریستارت بدون قطعی بعد از آپدیت
pm2 reload khatinoo-app
```

---

## ۵. تنظیم Nginx Reverse Proxy برای دامنه `khtynoo.ir`

فایل پیکربندی Nginx را در مسیر `/etc/nginx/sites-available/khtynoo.ir` ایجاد کنید:

```bash
sudo tee /etc/nginx/sites-available/khtynoo.ir > /dev/null << 'EOF'
server {
    listen 80;
    server_name khtynoo.ir www.khtynoo.ir khatynoo.ir www.khatynoo.ir;

    client_max_body_size 50M;

    # سرویس‌دهی فایل‌های آپلود شده
    location /uploads/ {
        alias /var/www/khatinoo/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # هدایت تمامی درخواست‌ها به پورت 3000 برنامه
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
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF
```

فعال‌سازی کانفیگ در Nginx و تست درستی ساختار:
```bash
sudo ln -s /etc/nginx/sites-available/khtynoo.ir /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ۶. فعال‌سازی رایگان SSL (HTTPS) با Certbot

پس از تنظیم رکوردهای A دامنه `khtynoo.ir` و `www.khtynoo.ir` به سمت IP سرور:

```bash
sudo certbot --nginx -d khtynoo.ir -d www.khtynoo.ir --non-interactive --agree-tos -m admin@khtynoo.ir
```

تست تمدید خودکار گواهینامه SSL:
```bash
sudo certbot renew --dry-run
```

---

## ۷. پیکربندی فایروال سرور (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw enable
sudo ufw status verbose
```

---

## ۸. اسکریپت به‌روزرسانی آسان (`deploy.sh`)

برای آپدیت‌های بعدی، کافیست دستور زیر را روی سرور اجرا کنید:
```bash
chmod +x /var/www/khatinoo/deploy.sh
/var/www/khatinoo/deploy.sh
```

---

## ۹. بررسی سلامت و تست زنده

```bash
# تست محلی از سرور
curl -i http://127.0.0.1:3000/health

# تست دامنه از طریق HTTPS
curl -i https://khtynoo.ir/health
```

پاسخ مورد انتظار:
```json
{
  "status": "ok",
  "time": "2026-08-30T...",
  "port": 3000
}
```
