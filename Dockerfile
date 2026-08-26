# ==============================================================================
# Multi-Stage Dockerfile for Khatinoo (فروشگاه و سامانه حسابداری خطی‌نو)
# Node.js 20 Alpine - Production Ready & Lightweight
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Phase
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# نصب ابزارهای پایه بیلد در صورت نیاز
RUN apk add --no-cache libc6-compat

# کپی فایل‌های پکیج جهت بهره‌گیری از کش لایه‌های داکر
COPY package*.json ./

# نصب کلیه وابستگی‌های توسعه و بیلد
RUN npm install

# کپی کامل کدهای پروژه
COPY . .

# بیلد نهایی پروژه (Vite Frontend + Bundled Backend CJS Server)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# نصب ابزار curl جهت Healthcheck و پکیج tzdata جهت تنظیم دقیق منطقه زمانی ایران
RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Tehran /etc/localtime \
    && echo "Asia/Tehran" > /etc/timezone

ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Tehran

# کپی فایلهای وابستگی و نصب اختصاصی پکیجهای Production
COPY package*.json ./
RUN npm install --only=production --ignore-scripts && npm cache clean --force

# کپی خروجی بیلد از مرحله قبل
COPY --from=builder /app/dist ./dist

# کپی اسکریپت‌ها، مایگریشن‌ها و شمای دیتابیس
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/server ./server

# ایجاد پوشه آپلودها
RUN mkdir -p /app/uploads

# پورت داخلی کانتینر
EXPOSE 3000

# چک سلامت خودکار کانتینر توسط داکر انجین
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# دستور اجرای برنامه در پروداکشن
CMD ["node", "dist/server.cjs"]
