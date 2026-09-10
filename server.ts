import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

// Process-level unhandled rejection filter for benign network aborts
process.on('unhandledRejection', (reason: any) => {
  if (
    !reason ||
    reason.name === 'AbortError' ||
    reason.message?.includes('aborted') ||
    reason.message?.includes('Timeout') ||
    (typeof reason === 'string' && reason.includes('AbortError'))
  ) {
    return;
  }
  console.warn('Unhandled server promise rejection:', reason?.message || reason);
});

import { db } from './server/db';
import { initializeDatabase, isDbConnected, isPostgresReal, query } from './server/dbClient';
import { sendToPasargadPos } from './server/posProtocol';
import { searchTorobMarket, searchMultiSourceMarket, getTorobStationeryCategoryList, auditAllInventoryAgainstMarket, inspectTorobDirectUrl, searchDigikalaCandidates, compareAcrossSources, SlidingWindowRateLimiter } from './server/torobService';
import { askGeminiAssistant, askGeminiAssistantStream, analyzeProductMarketAndPricing, groundedWebMarketSearch, getAiConfigStatus } from './server/geminiService';
import { cmsEngine } from './server/cmsEngine';
import { generateSqlDump, generateJsonBackup, restoreFromJson, restoreFromSql, getBackupStats } from './server/backupService';
import { PublicationService } from './server/publication/publicationService';
import { startPublicationWorker } from './server/publication/publicationWorker';
import { UserRole } from './src/types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    fullName: string;
  };
}

export function getClientIp(req: Request): string {
  if (!req) return '127.0.0.1';
  try {
    const forwarded = req.get ? req.get('x-forwarded-for') : req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0].trim();
      if (first) return first.replace(/^::ffff:/, '');
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      const first = forwarded[0]?.split(',')[0]?.trim();
      if (first) return first.replace(/^::ffff:/, '');
    }
  } catch {
    // Ignore header lookup error
  }
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return String(ip).replace(/^::ffff:/, '');
}

const marketRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 180); // 180 requests per minute

function torobRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const authUser = (req as AuthRequest)?.user;
  const clientIp = getClientIp(req);
  const clientKey = authUser?.id ? `usr_${authUser.id}` : `ip_${clientIp}`;
  const check = marketRateLimiter.check(clientKey);
  if (!check.allowed) {
    return res.status(429).json({
      error: 'تعداد درخواست‌های استعلام قیمت بیش از حد مجاز است. لطفاً چند لحظه دیگر مجدداً تلاش فرمایید.',
      retryAfterSeconds: Math.ceil(check.resetMs / 1000),
    });
  }
  next();
}

const aiRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 30); // 30 requests per minute

function aiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const authUser = (req as AuthRequest)?.user;
  const clientIp = getClientIp(req);
  const clientKey = authUser?.id ? `ai_usr_${authUser.id}` : `ai_ip_${clientIp}`;
  const check = aiRateLimiter.check(clientKey);
  if (!check.allowed) {
    return res.status(429).json({
      error: 'تعداد درخواست‌های ارسالی به هوش مصنوعی بیش از حد مجاز است (۳۰ درخواست در دقیقه). لطفاً چند لحظه صبر کنید.',
      code: 'AI_RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: Math.ceil(check.resetMs / 1000),
    });
  }
  next();
}

const DEFAULT_INSECURE_JWT = 'khatinoo_super_secret_jwt_key_2026_stationery_store';
const DEFAULT_INSECURE_DB_PASS = 'secure_khatinoo_db_password_2026';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (secret && secret.trim().length > 0) {
    if (secret.trim() === DEFAULT_INSECURE_JWT) {
      console.warn('⚠️ [Security Warning] از کلید JWT پیش‌فرض استفاده می‌شود. برای امنیت بیشتر در محیط عملیاتی یک کلید اختصاصی در .env تنظیم نمایید.');
    }
    return secret.trim();
  }

  const ephemeralSecret = crypto.randomBytes(32).toString('hex');
  if (isProd) {
    console.warn('⚠️ [Security Notice] متغیر JWT_SECRET در محیط عملیاتی یافت نشد. یک کلید تصادفی امن موقت ۳۲ بایتی در حافظه برای نشست جاری سرور ایجاد گردید.');
  } else {
    console.warn('⚠️ [Security Notice] متغیر JWT_SECRET یافت نشد. یک کلید تصادفی امن و موقت ۳۲ بایتی در حافظه برای نشست جاری سرور ایجاد گردید.');
  }
  return ephemeralSecret;
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception caught]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Rejection at]:', promise, 'reason:', reason);
});

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;
const JWT_SECRET = resolveJwtSecret();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تنظیمات امن و سازگار CORS
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
const allowedOriginsList = rawAllowedOrigins
  ? rawAllowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // اگر درخواست مبدا هدر ندارد (ابزارهای محلی، سرور یا درون کانتینر)
    if (!origin) return callback(null, true);

    // بررسی لیست دامنه‌های مجاز پیکربندی‌شده
    if (allowedOriginsList.length > 0) {
      if (allowedOriginsList.includes(origin) || allowedOriginsList.includes('*')) {
        return callback(null, true);
      }
    }

    // بررسی دامنه‌های پیش‌فرض محیط‌های محلی و پیش‌نمایش ابری
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isCloudPreview = /^https:\/\/[a-z0-9\-]+\.(run\.app|web\.app|firebaseapp\.com|github\.dev|gitpod\.io)$/.test(origin) ||
                           origin.includes('ai.studio') || origin.includes('googleusercontent.com');

    if (process.env.NODE_ENV !== 'production' || isLocalhost || isCloudPreview || allowedOriginsList.length === 0) {
      return callback(null, true);
    }

    return callback(new Error(`دامنه مبدا (${origin}) طبق سیاست امنیتی CORS مجاز نمی‌باشد.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint for container environments & reverse proxies
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), port: PORT });
});

// Kavenegar WebPush Service Worker Route
app.get('/kvn-push-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.send('importScripts("https://cdn.kavenegar.com/sdk/sw.js");');
});

// -------------------------------------------------------------
// AUTH MIDDLEWARE
// -------------------------------------------------------------
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.get ? req.get('authorization') : req.headers?.['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'توکن دسترسی یافت نشد. لطفاً وارد سیستم شوید.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // جلوگیری قاطع از ورود توکن مشتری (Customer JWT) به روت‌های پرسنلی و مدیریتی
    if (decoded.type === 'customer' || !decoded.role || !decoded.username) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز: این بخش نیازمند حساب کاربری پرسنلی یا مدیریتی است.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'توکن دسترسی منقضی شده یا نامعتبر است.' });
  }
}

function optionalAuthenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.get ? req.get('authorization') : req.headers?.['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role && decoded.type !== 'customer') {
        req.user = decoded;
      }
    } catch (err) {
      // Ignore token decode error for optional auth fallback
    }
  }
  next();
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای این بخش را ندارید.' });
    }
    next();
  };
}

// -------------------------------------------------------------
// CUSTOMER AUTH MIDDLEWARE (کاملاً مستقل از سیستم ورود ادمین)
// -------------------------------------------------------------
interface CustomerAuthRequest extends Request {
  customer?: {
    id: string;
    mobile: string;
  };
}

async function authenticateCustomerToken(req: CustomerAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.get ? req.get('authorization') : req.headers?.['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.customerId || decoded.type !== 'customer') {
      return res.status(403).json({ error: 'توکن نامعتبر است.' });
    }
    req.customer = {
      id: decoded.customerId,
      mobile: decoded.mobile,
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'نشست کاربری شما منقضی شده است. لطفاً مجدداً با شماره موبایل خود وارد شوید.' });
  }
}

// -------------------------------------------------------------
// 1. HEALTH & SYSTEM STATUS
// -------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const products = await db.getProducts();
    const users = await db.getUsers();
    res.json({
      status: 'ok',
      database: isPostgresReal() ? 'postgresql_live' : 'postgresql_engine_active',
      postgres: isDbConnected(),
      isRealPostgresServer: isPostgresReal(),
      timestamp: new Date().toISOString(),
      store: 'Khatinoo (فروشگاه و کارگاه تولیدی خطی‌نو)',
      version: '2.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      productsCount: products.length,
      usersCount: users.length,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & USERS (SQL-Backed)
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
  }

  try {
    const userAuth = await db.getUserByUsername(username);
    if (!userAuth || !userAuth.user.isActive) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است یا حساب غیرفعال شده است.' });
    }

    const isMatch = await bcrypt.compare(password, userAuth.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }

    const user = userAuth.user;
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user,
      message: `خوش آمدید، ${user.fullName}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: `خطا در ورود به سیستم: ${err.message}` });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { fullName, username, password, role, phone } = req.body;
  if (!fullName || !username || !password || !role) {
    return res.status(400).json({ error: 'تمامی فیلدها (نام، نام کاربری، رمز عبور و نقش) الزامی هستند.' });
  }

  try {
    const existing = await db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      fullName,
      username,
      passwordHash,
      role,
      phone: phone || '',
    });

    res.json({ user, message: 'کاربر جدید با موفقیت ایجاد شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const user = await db.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد.' });
    res.json({ user, message: 'اطلاعات و دسترسی‌های کاربر با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const success = await db.deleteUser(req.params.id);
    if (!success) return res.status(404).json({ error: 'کاربر یافت نشد.' });
    res.json({ message: 'کاربر با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PRODUCTS, CATEGORIES & UNITS (SQL-Backed)
// -------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { category, query: searchQuery, inStockOnly, featuredOnly, specialOnly } = req.query;
    let products = await db.getProducts({
      categoryId: category ? String(category) : undefined,
      search: searchQuery ? String(searchQuery) : undefined,
    });

    if (inStockOnly === 'true') {
      products = products.filter((p) => p.stock > 0);
    }
    if (featuredOnly === 'true') {
      products = products.filter((p) => p.featured || (p as any).isFeatured);
    }
    if (specialOnly === 'true') {
      products = products.filter((p) => p.isSpecialOffer);
    }

    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'کالا یافت نشد.' });
    res.json({ product });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  const data = req.body;
  if (!data.name) {
    return res.status(400).json({ error: 'نام کالا الزامی است.' });
  }

  try {
    const product = await db.createProduct(data);
    res.json({ product, message: 'کالا با موفقیت در دیتابیس ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant']), async (req: AuthRequest, res) => {
  try {
    const product = await db.updateProduct(req.params.id, req.body, {
      userId: req.user?.id,
      username: req.user?.username,
      reason: req.body.reason || 'ویرایش کالا از پنل انبار',
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    if (!product) return res.status(404).json({ error: 'کالا یافت نشد.' });
    res.json({ product, message: 'کالا با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req: AuthRequest, res) => {
  try {
    const existing = await db.getProductById(req.params.id);
    const success = await db.deleteProduct(req.params.id);
    if (!success) return res.status(404).json({ error: 'کالا یافت نشد.' });

    await db.createAuditLog({
      userId: req.user?.id,
      username: req.user?.username || 'مدیر سیستم',
      action: `حذف کالا «${existing?.name || req.params.id}» از پایگاه‌داده`,
      module: 'products',
      targetId: req.params.id,
      details: { product: existing },
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'warning',
    });

    res.json({ message: 'کالا با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3.1 MULTI-WAREHOUSE & INVENTORY MANAGEMENT (مدیریت چند انباره)
// -------------------------------------------------------------
app.get('/api/warehouses', optionalAuthenticateToken, async (req, res) => {
  try {
    const warehouses = await db.getWarehouses();
    res.json({ warehouses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouses', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req: AuthRequest, res) => {
  try {
    const { name, code, type, address, phone, isActive, isDefault } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'نام و کد انبار الزامی است.' });
    }
    const warehouse = await db.createWarehouse({ name, code, type, address, phone, isActive, isDefault });
    
    await db.createAuditLog({
      userId: req.user?.id,
      username: req.user?.username || 'مدیر سیستم',
      action: `تعریف انبار جدید «${warehouse.name}» با کد «${warehouse.code}»`,
      module: 'warehouses',
      targetId: warehouse.id,
      details: warehouse,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({ warehouse, message: 'انبار جدید با موفقیت اضافه شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/by-location', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, productId } = req.query;
    const inventory = await db.getInventoryByLocation(
      warehouseId ? String(warehouseId) : undefined,
      productId ? String(productId) : undefined
    );
    res.json({ inventory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/transfer', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant']), async (req: AuthRequest, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = req.body;
    if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
      return res.status(400).json({ error: 'اطلاعات انبار مبدا، مقصد، کالا و تعداد الزامی است.' });
    }

    const transfer = await db.transferStock({
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity: Number(quantity),
      transferredBy: req.user?.id,
      userName: req.user?.username || 'کاربر سیستم',
      notes,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      transfer,
      message: `حواله انتقال ${transfer.transferNumber} با موفقیت صادر و موجودی انبارها به‌روزرسانی شد.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/inventory/transfers', authenticateToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const transfers = await db.getInventoryTransfers(limit);
    res.json({ transfers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant']), async (req: AuthRequest, res) => {
  try {
    const { productId, warehouseId, newStock, delta, reason, notes } = req.body;
    if (!productId || (newStock === undefined && delta === undefined)) {
      return res.status(400).json({ error: 'شناسه کالا و میزان موجودی الزامی است.' });
    }

    const result = await db.adjustProductStock({
      productId,
      warehouseId,
      newStock: newStock !== undefined ? Number(newStock) : undefined,
      delta: delta !== undefined ? Number(delta) : undefined,
      reason: reason || 'اصلاح دستی موجودی انبار',
      notes,
      userId: req.user?.id,
      userName: req.user?.username || 'کاربر سیستم',
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      product: result.product,
      adjustment: result.adjustment,
      message: `موجودی کالا با موفقیت اصلاح و در سوابق انبارگردانی ثبت گردید.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/inventory/adjustments', authenticateToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const adjustments = await db.getInventoryAdjustments(limit);
    res.json({ adjustments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3.2 SYSTEM AUDIT LOGS (ثبت وقایع و حسابرسی جامع سیستم)
// -------------------------------------------------------------
app.get('/api/audit-logs', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const module = req.query.module ? String(req.query.module) : undefined;
    const logs = await db.getAuditLogs(limit, module);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { action, module, targetId, details, status } = req.body;
    if (!action) return res.status(400).json({ error: 'شرح عملیات الزامی است.' });

    const log = await db.createAuditLog({
      userId: req.user?.id,
      username: req.user?.username || 'کاربر سیستم',
      action,
      module: module || 'manual_log',
      targetId,
      details,
      status: status || 'success',
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({ log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Categories & Units
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  const { name, icon, image, sortOrder, subcategories } = req.body;
  if (!name) return res.status(400).json({ error: 'نام دسته الزامی است.' });

  try {
    const category = await db.createCategory({ name, icon, image, sortOrder, subcategories });
    res.json({ category, message: 'دسته‌بندی جدید ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  const { name, icon, image, sortOrder } = req.body;
  try {
    await db.updateCategory(req.params.id, { name, icon, image, sortOrder });
    res.json({ message: 'دسته‌بندی با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    await db.deleteCategory(req.params.id);
    res.json({ message: 'دسته‌بندی با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories/:categoryId/subcategories', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'نام زیردسته الزامی است.' });
  try {
    const subcategory = await db.createSubCategory({ categoryId: req.params.categoryId, name, description });
    res.json({ subcategory, message: 'زیردسته جدید اضافه شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subcategories/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  const { name, description } = req.body;
  try {
    await db.updateSubCategory(req.params.id, { name, description });
    res.json({ message: 'زیردسته با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subcategories/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    await db.deleteSubCategory(req.params.id);
    res.json({ message: 'زیردسته با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const units = await db.getUnits();
    res.json({ units });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/units', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  const { name, subUnit, conversionFactor, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'نام واحد الزامی است.' });
  }

  try {
    const unit = await db.createUnit({ name, subUnit, conversionFactor, description });
    res.json({ unit, message: 'واحد جدید با ضریب تبدیل تعریف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/units/:id', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  const { name, subUnit, conversionFactor, description } = req.body;
  try {
    await db.updateUnit(req.params.id, { name, subUnit, conversionFactor, description });
    res.json({ message: 'واحد با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/units/:id', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    await db.deleteUnit(req.params.id);
    res.json({ message: 'واحد با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. POS CHECKOUT & PASARGAD TERMINAL
// -------------------------------------------------------------
app.get('/api/pos/config', authenticateToken, async (req, res) => {
  try {
    const config = await db.getPosConfig();
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pos/config', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  try {
    const config = await db.updatePosConfig(req.body);
    res.json({ config, message: 'تنظیمات کارتخوان با موفقیت ذخیره شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pos/send-transaction', optionalAuthenticateToken, async (req, res) => {
  const { amountRials, invoiceNumber } = req.body;
  if (!amountRials || amountRials <= 0) {
    return res.status(400).json({ error: 'مبلغ تراکنش نامعتبر است.' });
  }

  try {
    const posConfig = await db.getPosConfig();
    const posResponse = await sendToPasargadPos(posConfig, {
      amountRials: Number(amountRials),
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    });
    res.json(posResponse);
  } catch (error: any) {
    res.status(500).json({ error: `خطای ارتباط با کارتخوان: ${error?.message}` });
  }
});

app.post('/api/pos/checkout', optionalAuthenticateToken, async (req: AuthRequest, res) => {
  const customerId = req.body.customerId || req.body.customer_id;
  const customerName = req.body.customerName || req.body.customer_name;
  const customerMobile = req.body.customerMobile || req.body.customer_mobile;
  const items = req.body.items;
  const discount = req.body.discount ?? req.body.discount_amount ?? 0;
  const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'pos_pasargad';
  const paidAmount = req.body.paidAmount ?? req.body.paid_amount ?? 0;
  const cashAmount = req.body.cashAmount ?? req.body.cash_amount;
  const chequeAmount = req.body.chequeAmount ?? req.body.cheque_amount;
  const chequeInfo = req.body.chequeInfo || req.body.cheque_info;
  const posResult = req.body.posResult || req.body.pos_result;
  const notes = req.body.notes;
  const warehouseId = req.body.warehouseId || req.body.warehouse_id;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'اقلام فاکتور خالی است.' });
  }

  try {
    const storeSettings = await db.getStoreSettings();
    const finalTaxRate = req.body.taxRate !== undefined ? Number(req.body.taxRate) : storeSettings.taxRate;
    const result = await db.executePosCheckout({
      customerId,
      customerName: customerName || 'مشتری نقدی حضوری',
      customerMobile,
      items,
      discount: Number(discount),
      taxRate: finalTaxRate,
      paymentMethod,
      paidAmount: Number(paidAmount),
      cashAmount: Number(cashAmount) || 0,
      chequeAmount: Number(chequeAmount) || 0,
      chequeInfo,
      posResult,
      userId: req.user?.id || 'usr_seller',
      userName: req.user?.fullName || 'صندوقدار',
      notes,
      warehouseId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/pos/logs', authenticateToken, async (req, res) => {
  try {
    const resLogs = await query('SELECT * FROM pos_transaction_logs ORDER BY timestamp DESC LIMIT 50');
    res.json({ logs: resLogs.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SALES & PURCHASE INVOICES (SQL-Backed)
// -------------------------------------------------------------
app.get('/api/invoices/sales', authenticateToken, async (req, res) => {
  try {
    const invoices = await db.getSalesInvoices();
    res.json({ invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/sales/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await db.getSalesInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'فاکتور یافت نشد.' });
    res.json({ invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/sales/:id', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    if (user && user.role && user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز: تنها مدیران سیستم امکان ویرایش فاکتور فروش دارند.' });
    }

    const updated = await db.updateSalesInvoice(req.params.id, {
      ...req.body,
      userId: user?.id,
      userName: user?.fullName || user?.username || 'مدیر سیستم',
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web App',
    });

    res.json({ success: true, invoice: updated, message: 'فاکتور فروش با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطا در ویرایش فاکتور فروش' });
  }
});

app.delete('/api/invoices/sales/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const result = await db.deleteSalesInvoice(id, {
      userId: req.user?.id,
      userName: req.user?.fullName || req.user?.username || 'کاربر سیستم',
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web POS',
    });
    res.json(result);
  } catch (err: any) {
    console.error('❌ [Delete Sales Invoice Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/purchase', authenticateToken, async (req, res) => {
  try {
    const invoices = await db.getPurchaseInvoices();
    res.json({ invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices/purchase', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const supplierId = req.body.supplierId || req.body.supplier_id;
  const items = req.body.items;
  const paidAmount = req.body.paidAmount ?? req.body.paid_amount ?? 0;
  const cashAmount = req.body.cashAmount ?? req.body.cash_amount ?? 0;
  const chequeAmount = req.body.chequeAmount ?? req.body.cheque_amount ?? 0;
  const cheques = req.body.cheques || [];
  const receiptImageUrls = req.body.receiptImageUrls || req.body.receipt_image_urls || [];
  const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'cash';
  const notes = req.body.notes;
  const warehouseId = req.body.warehouseId || req.body.warehouse_id;
  const invoiceNumber = req.body.invoiceNumber || req.body.invoice_number;
  const invoiceDate = req.body.invoiceDate || req.body.invoice_date;
  const discount = req.body.discount ?? 0;
  const receiptImageUrl = req.body.receiptImageUrl || req.body.receipt_image_url;

  if (!supplierId || !items || !items.length) {
    return res.status(400).json({ error: 'انتخاب تامین‌کننده و ثبت اقلام فاکتور خرید الزامی است.' });
  }

  try {
    const suppliers = await db.getSuppliers();
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return res.status(400).json({ error: 'تامین‌کننده یافت نشد.' });

    const totalAmount = items.reduce((acc: number, curr: any) => acc + (curr.total || curr.quantity * curr.buyPrice), 0);

    const invoice = await db.createPurchaseInvoice({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items,
      totalAmount,
      paidAmount: Number(paidAmount),
      cashAmount: Number(cashAmount || 0),
      chequeAmount: Number(chequeAmount || 0),
      cheques: Array.isArray(cheques) ? cheques : [],
      receiptImageUrls: Array.isArray(receiptImageUrls) ? receiptImageUrls : [],
      paymentMethod,
      notes,
      warehouseId,
      invoiceNumber,
      invoiceDate,
      discount: Number(discount || 0),
      receiptImageUrl,
    });

    res.json({ invoice, message: 'فاکتور خرید ثبت و موجودی انبار به صورت آنی افزایش یافت.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/purchase/:id', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const {
    supplierId,
    supplierName,
    items,
    totalAmount,
    paidAmount,
    cashAmount,
    chequeAmount,
    cheques,
    receiptImageUrls,
    paymentMethod,
    notes,
    warehouseId,
    invoiceNumber,
    invoiceDate,
    discount,
    receiptImageUrl,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'حداقل یک قلم کالا باید در فاکتور خرید وجود داشته باشد.' });
  }

  try {
    const updatedInvoice = await db.updatePurchaseInvoice(id, {
      supplierId,
      supplierName,
      items,
      totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
      paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
      cashAmount: cashAmount !== undefined ? Number(cashAmount) : undefined,
      chequeAmount: chequeAmount !== undefined ? Number(chequeAmount) : undefined,
      cheques: Array.isArray(cheques) ? cheques : undefined,
      receiptImageUrls: Array.isArray(receiptImageUrls) ? receiptImageUrls : undefined,
      paymentMethod,
      notes,
      warehouseId,
      invoiceNumber,
      invoiceDate,
      discount: discount !== undefined ? Number(discount) : undefined,
      receiptImageUrl,
      userId: req.user?.id,
      userName: req.user?.fullName || req.user?.username || 'کاربر سیستم',
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web POS',
    });

    res.json({
      success: true,
      invoice: updatedInvoice,
      message: 'فاکتور خرید با موفقیت ویرایش شد و تغییرات انبار و مانده‌حساب اعمال گردید.',
    });
  } catch (err: any) {
    console.error('❌ [Update Purchase Invoice Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/purchase/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const result = await db.deletePurchaseInvoice(id, {
      userId: req.user?.id,
      userName: req.user?.fullName || req.user?.username || 'کاربر سیستم',
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web POS',
    });
    res.json(result);
  } catch (err: any) {
    console.error('❌ [Delete Purchase Invoice Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5.1. RETURN INVOICES (مرجوعی کالا - خرابی یا انصراف)
// -------------------------------------------------------------
app.get('/api/invoices/returns', authenticateToken, async (req, res) => {
  try {
    const returnInvoices = await db.getReturnInvoices();
    res.json({ returnInvoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices/returns', authenticateToken, async (req: AuthRequest, res) => {
  const originalInvoiceId = req.body.originalInvoiceId || req.body.original_invoice_id;
  const originalInvoiceNumber = req.body.originalInvoiceNumber || req.body.original_invoice_number;
  const customerId = req.body.customerId || req.body.customer_id;
  const customerName = req.body.customerName || req.body.customer_name;
  const customerMobile = req.body.customerMobile || req.body.customer_mobile;
  const type = req.body.type || 'sales_return';
  const reasonCategory = req.body.reasonCategory || req.body.reason_category;
  const reasonNote = req.body.reasonNote || req.body.reason_note;
  const items = req.body.items;
  const totalRefundAmount = req.body.totalRefundAmount ?? req.body.total_refund_amount ?? 0;
  const refundMethod = req.body.refundMethod || req.body.refund_method || 'cash';
  const warehouseId = req.body.warehouseId || req.body.warehouse_id;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'حداقل یک قلم کالا برای مرجوعی باید مشخص شود.' });
  }
  if (!customerName) {
    return res.status(400).json({ error: 'نام مشتری برای ثبت سند مرجوعی الزامی است.' });
  }
  if (!reasonCategory || !['defective', 'unwanted'].includes(reasonCategory)) {
    return res.status(400).json({ error: 'علت مرجوعی (خرابی/معیوب یا انصراف/نخواستن) باید مشخص شود.' });
  }

  try {
    const result = await db.createReturnInvoice({
      originalInvoiceId,
      originalInvoiceNumber,
      customerId,
      customerName,
      customerMobile,
      type,
      reasonCategory,
      reasonNote,
      items,
      totalRefundAmount: Number(totalRefundAmount) || 0,
      refundMethod,
      warehouseId,
      userId: req.user?.id,
      userName: req.user?.fullName || req.user?.username || 'کاربر سیستم',
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/returns/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const result = await db.deleteReturnInvoice(id, {
      userId: req.user?.id,
      userName: req.user?.fullName || req.user?.username || 'کاربر سیستم',
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web POS',
    });
    res.json(result);
  } catch (err: any) {
    console.error('❌ [Delete Return Invoice Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// پیش‌نویس فاکتورهای خرید و فاکتورهای فروش معلق (Invoice Drafts)
// ============================================================================
// فاکتور خرید (تکی)
app.get('/api/invoice-drafts/purchase', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const draft = await db.getPurchaseDraft(req.user!.id);
    res.json({ draft });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/invoice-drafts/purchase', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.savePurchaseDraft(req.user!.id, req.body.payload ?? {});
    res.json({ message: 'پیش‌نویس فاکتور خرید ذخیره شد.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoice-drafts/purchase', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deletePurchaseDraft(req.user!.id);
    res.json({ message: 'پیش‌نویس فاکتور خرید حذف شد.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// فاکتورهای فروش معلق (چندتایی)
app.get('/api/invoice-drafts/sales', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const drafts = await db.listSalesDrafts(req.user!.id);
    res.json({ drafts });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoice-drafts/sales', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = await db.createSalesDraft(req.user!.id, req.body.label ?? null, req.body.payload ?? {});
    res.json({ id, message: 'فاکتور معلق ذخیره شد.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/invoice-drafts/sales/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.updateSalesDraft(req.params.id, req.user!.id, req.body.payload ?? {});
    res.json({ message: 'فاکتور معلق به‌روزرسانی شد.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoice-drafts/sales/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.deleteSalesDraft(req.params.id, req.user!.id);
    res.json({ message: 'فاکتور معلق حذف شد.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// -------------------------------------------------------------
// 6. CUSTOMERS & SUPPLIERS (SQL-Backed)
// -------------------------------------------------------------
app.get('/api/customers', optionalAuthenticateToken, async (req, res) => {
  try {
    const customers = await db.getCustomers();
    res.json({ customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  const { name, companyName, mobile, phone, nationalCode, address, postalCode, province, city, fullAddress, email, creditLimit, notes } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'نام و شماره تماس مشتری الزامی است.' });

  try {
    const customer = await db.createCustomer({
      name,
      companyName,
      mobile,
      phone,
      nationalCode,
      address,
      postalCode,
      province,
      city,
      fullAddress,
      email,
      creditLimit,
      notes,
    });
    res.json({ customer, message: 'مشتری جدید با موفقیت ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateCustomer(id, req.body);
    if (!updated) return res.status(404).json({ error: 'مشتری مورد نظر یافت نشد.' });
    res.json({ customer: updated, message: 'اطلاعات مشتری با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  const { id } = req.params;
  try {
    const success = await db.deleteCustomer(id);
    if (!success) return res.status(404).json({ error: 'مشتری یافت نشد یا امکان حذف وجود ندارد.' });
    res.json({ success: true, message: 'مشتری با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id/ledger', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.getCustomerLedger(req.params.id);
    const allInvoices = await db.getSalesInvoices();
    const invoices = allInvoices.filter((i) => i.customerId === req.params.id);
    res.json({ transactions, invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/record-payment', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const { id } = req.params;
  const amount = req.body.amount;
  const paymentMethod = req.body.paymentMethod || req.body.payment_method;
  const description = req.body.description;
  const invoiceId = req.body.invoiceId || req.body.invoice_id;

  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ پرداختی باید عددی بزرگتر از صفر باشد.' });
  }

  try {
    const customer = await db.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'مشتری مورد نظر یافت نشد.' });
    }

    await db.addCustomerTransaction({
      customerId: id,
      type: 'payment_received',
      amount: parsedAmount,
      paymentMethod: paymentMethod || 'cash',
      description: description || 'دریافت وجه نسیه / تسویه حساب مشتری',
      invoiceId: invoiceId || undefined,
    });

    const updatedCustomer = await db.getCustomerById(id);
    res.json({
      success: true,
      message: `پرداخت به مبلغ ${parsedAmount.toLocaleString('fa-IR')} تومان با موفقیت ثبت و مانده حساب به‌روزرسانی شد.`,
      customer: updatedCustomer,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await db.getSuppliers();
    res.json({ suppliers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers/:id/ledger', authenticateToken, async (req, res) => {
  try {
    const [transactions, allPurchases] = await Promise.all([
      db.getSupplierLedger(req.params.id),
      db.getPurchaseInvoices(),
    ]);
    const invoices = allPurchases.filter((p) => p.supplierId === req.params.id);
    res.json({ transactions, invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers/:id/record-payment', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const { id } = req.params;
  const amount = req.body.amount;
  const paymentMethod = req.body.paymentMethod || req.body.payment_method;
  const description = req.body.description;
  const invoiceId = req.body.invoiceId || req.body.invoice_id;

  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'مبلغ پرداختی باید عددی بزرگتر از صفر باشد.' });
  }

  try {
    const supplier = await db.getSupplierById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'تامین‌کننده مورد نظر یافت نشد.' });
    }

    await db.addSupplierTransaction({
      supplierId: id,
      type: 'payment_made',
      amount: parsedAmount,
      paymentMethod: paymentMethod || 'bank_transfer',
      description: description || `تسویه حساب تامین‌کننده «${supplier.name}»`,
      invoiceId: invoiceId || undefined,
    });

    const updatedSupplier = await db.getSupplierById(id);
    res.json({
      success: true,
      message: `پرداخت به مبلغ ${parsedAmount.toLocaleString('fa-IR')} تومان به تامین‌کننده با موفقیت ثبت و بدهی کسر گردید.`,
      supplier: updatedSupplier,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const { name, contactPerson, mobile, phone, address, bankAccount, shaba, debtToSupplier } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'نام و تلفن تامین‌کننده الزامی است.' });

  try {
    const supplier = await db.createSupplier({ name, contactPerson, mobile, phone, address, bankAccount, shaba, debtToSupplier });
    res.json({ supplier, message: 'تامین‌کننده جدید با موفقیت ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateSupplier(id, req.body);
    if (!updated) return res.status(404).json({ error: 'تامین‌کننده مورد نظر یافت نشد.' });
    res.json({ supplier: updated, message: 'اطلاعات تامین‌کننده با موفقیت ویرایش شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  const { id } = req.params;
  try {
    const success = await db.deleteSupplier(id);
    if (!success) return res.status(404).json({ error: 'تامین‌کننده یافت نشد یا امکان حذف وجود ندارد.' });
    res.json({ success: true, message: 'تامین‌کننده با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. CHEQUES (Sayad System)
// -------------------------------------------------------------
app.get('/api/cheques', authenticateToken, async (req, res) => {
  try {
    const cheques = await db.getCheques();
    res.json({ cheques });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cheques', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  const data = req.body;
  if (!data.chequeNumber || !data.amount || !data.dueDate) {
    return res.status(400).json({ error: 'شماره چک، مبلغ و تاریخ سررسید الزامی هستند.' });
  }

  try {
    const cheque = await db.createCheque(data);
    res.json({ cheque, message: 'چک صیادی جدید با موفقیت ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cheques/:id/status', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.updateChequeStatus(req.params.id, status, notes);
    res.json({ message: 'وضعیت چک به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. COPY & PRINT SERVICES
// -------------------------------------------------------------
app.get('/api/services/presets', async (req, res) => {
  try {
    const presets = await db.getServicePresets();
    res.json({ presets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/presets', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const preset = await db.createServicePreset(req.body);
    res.json({ preset, message: 'تعرفه خدمت جدید با موفقیت ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/presets/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const preset = await db.updateServicePreset(req.params.id, req.body);
    if (!preset) return res.status(404).json({ error: 'تعرفه خدمت یافت نشد.' });
    res.json({ preset, message: 'تعرفه خدمت با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/presets/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const success = await db.deleteServicePreset(req.params.id);
    if (!success) return res.status(404).json({ error: 'تعرفه خدمت یافت نشد.' });
    res.json({ success: true, message: 'تعرفه خدمت با موفقیت حذف گردید.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/calculate', async (req, res) => {
  try {
    const {
      paperSize = 'A4',
      colorType = 'bw',
      printSide = 'single',
      paperWeight = '80g',
      pageCount = 10,
      copyCount = 1,
      bindingType = 'none',
    } = req.body;

    const totalPages = Math.max(1, Number(pageCount)) * Math.max(1, Number(copyCount));

    // دریافت تعرفه‌های فعال از دیتابیس
    const presets = await db.getServicePresets();
    const websitePresets = presets.filter((p) => p.showOnWebsite || p.visibility === 'only_website' || p.visibility === 'both');

    // جستجوی تعرفه منطبق با سیاه و سفید / رنگی
    let matchedPreset = websitePresets.find((p) => {
      const name = (p.name || p.title || '').toLowerCase();
      if (colorType === 'color') {
        return name.includes('رنگی') || name.includes('color');
      } else {
        return name.includes('سیاه') || name.includes('bw') || name.includes('تک‌رو') || name.includes('کپی');
      }
    }) || websitePresets[0] || presets[0];

    let unitPagePrice = 2000;
    let bindingPrice = 0;

    if (matchedPreset) {
      const single1 = Number(matchedPreset.priceSingle1 || matchedPreset.basePriceSingle || matchedPreset.price || 2000);
      const single2 = Number(matchedPreset.priceSingle2 || Math.round(single1 * 0.85));
      const double1 = Number(matchedPreset.priceDouble1 || matchedPreset.basePriceDouble || Math.round(single1 * 1.6));
      const double2 = Number(matchedPreset.priceDouble2 || Math.round(single1 * 1.35));
      const threshold = Number(matchedPreset.volumeDiscountThreshold || 50);

      const isTier2 = totalPages >= threshold;

      if (printSide === 'double') {
        unitPagePrice = isTier2 ? double2 : double1;
      } else {
        unitPagePrice = isTier2 ? single2 : single1;
      }

      // تنظیم سایز کاغذ
      if (paperSize === 'A3') unitPagePrice = Math.round(unitPagePrice * 1.9);
      if (paperSize === 'A5') unitPagePrice = Math.round(unitPagePrice * 0.65);

      // گرماژ کاغذ
      if (paperWeight === '100g') unitPagePrice += 500;
      if (paperWeight === 'glossy') unitPagePrice += 3000;
      if (paperWeight === 'card') unitPagePrice += 4500;

      // صحافی
      if (bindingType === 'spiral') bindingPrice = Number(matchedPreset.bindingSpiralPrice || 35000);
      if (bindingType === 'hardcover') bindingPrice = Number(matchedPreset.bindingHardcoverPrice || 85000);
      if (bindingType === 'cellophane') bindingPrice = Number(matchedPreset.bindingCellophanePrice || 15000);
      if (bindingType === 'staple') bindingPrice = 5000;
    } else {
      let baseRate = colorType === 'color' ? 5500 : 1800;
      if (paperSize === 'A3') baseRate *= 1.9;
      if (paperSize === 'A5') baseRate *= 0.65;
      if (printSide === 'double') baseRate *= 1.6;
      if (paperWeight === '100g') baseRate += 500;
      if (paperWeight === 'glossy') baseRate += 3000;
      if (paperWeight === 'card') baseRate += 4500;
      unitPagePrice = Math.round(baseRate);

      if (bindingType === 'spiral') bindingPrice = 35000;
      if (bindingType === 'hardcover') bindingPrice = 85000;
      if (bindingType === 'cellophane') bindingPrice = 15000;
      if (bindingType === 'staple') bindingPrice = 5000;
    }

    const printTotal = totalPages * unitPagePrice;
    const finalAmount = printTotal + bindingPrice * Number(copyCount);

    res.json({
      calculation: {
        paperSize,
        colorType,
        printSide,
        paperWeight,
        pageCount: Number(pageCount),
        copyCount: Number(copyCount),
        bindingType,
        unitPagePrice,
        bindingPrice,
        totalPages,
        finalAmount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/services/records', authenticateToken, async (req, res) => {
  try {
    const records = await db.getServiceRecords();
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/records', authenticateToken, async (req, res) => {
  try {
    const record = await db.createServiceRecord(req.body);
    res.json({ record, message: 'سرویس با موفقیت در دیتابیس ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. PRODUCTION & FORMULATION (Atomic Transaction Runs)
// -------------------------------------------------------------
app.get('/api/production/formulas', authenticateToken, async (req, res) => {
  try {
    const formulas = await db.getProductionFormulas();
    res.json({ formulas });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production/formulas', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  const data = req.body;
  const name = data.name || data.title;
  if (!name || !data.materials || !data.materials.length) {
    return res.status(400).json({ error: 'نام فرمول و لیست مواد اولیه الزامی است.' });
  }

  try {
    const formula = await db.createProductionFormula(data);
    res.json({ formula, message: 'فرمولاسیون کارگاهی جدید با موفقیت ذخیره شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/production/formulas/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  try {
    const formula = await db.updateProductionFormula(req.params.id, req.body);
    if (!formula) return res.status(404).json({ error: 'فرمولاسیون مورد نظر یافت نشد.' });
    res.json({ formula, message: 'فرمولاسیون با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/production/formulas/:id', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  try {
    const success = await db.deleteProductionFormula(req.params.id);
    if (!success) return res.status(404).json({ error: 'فرمولاسیون مورد نظر یافت نشد.' });
    res.json({ message: 'فرمولاسیون با موفقیت حذف گردید.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/production/runs', authenticateToken, async (req, res) => {
  try {
    const runs = await db.getProductionRuns();
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production/runs', authenticateToken, requireRole(['admin', 'chief_accountant', 'accountant']), async (req: AuthRequest, res) => {
  const { formulaId, producedQuantity, notes, warehouseId, outputWarehouseId } = req.body;
  if (!formulaId || !producedQuantity || producedQuantity <= 0) {
    return res.status(400).json({ error: 'فرمول و تعداد تولید معتبر الزامی است.' });
  }

  try {
    const result = await db.executeProductionRun({
      formulaId,
      producedQuantity: Number(producedQuantity),
      userId: req.user?.id || 'usr_admin',
      userName: req.user?.fullName || 'مسئول تولید',
      notes,
      warehouseId,
      outputWarehouseId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10. TOROB & MULTI-SOURCE MARKET INTELLIGENCE & GEMINI AI
// -------------------------------------------------------------
app.get('/api/torob/search', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { query: q } = req.query;
    const results = await searchTorobMarket(q as string);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/torob/intel', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { query: q, context } = req.body;
    const result = await searchMultiSourceMarket(q, context);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/torob/multi-market', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { query: q, buyPrice, salePrice } = req.query;
    const result = await searchMultiSourceMarket(q as string, {
      buyPrice: Number(buyPrice) || undefined,
      currentSalePrice: Number(salePrice) || undefined,
    });
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/torob/digikala-candidates', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { query: q } = req.query;
    const candidates = await searchDigikalaCandidates(q as string, 8);
    res.json({ candidates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// مقایسه چندمنبعی قیمت و مشخصات کالا (ترب، دیجی‌کالا، ایمالز، تایم‌تحریر)
app.get('/api/torob/compare-sources', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { query: q, limit, refresh } = req.query;
    if (!q || !String(q).trim()) {
      return res.status(400).json({ error: 'پارامتر جستجو (query) الزامی است.' });
    }
    const bypassCache = refresh === 'true' || refresh === '1';
    const result = await compareAcrossSources(String(q).trim(), Number(limit) || 6, bypassCache);
    res.json(result);
  } catch (err: any) {
    console.error('❌ [Compare Sources Error]:', err);
    res.status(500).json({ error: err.message || 'خطا در مقایسه چندمنبعی' });
  }
});

// لیست قیمت جامع دسته‌بندی لوازم تحریر ترب (کد ۱۱۰) با کراس‌مچ انبار و چند قیمتی
app.get('/api/torob/category-110', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  try {
    const { subCategory, sort, query: q } = req.query;
    const invProducts = await db.getProducts();
    const result = await getTorobStationeryCategoryList({
      subCategory: subCategory as string,
      sort: sort as string,
      query: q as string,
      inventoryProducts: invProducts,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// افزودن یا افزایش موجودی کالا از لیست قیمت ترب به انبار خطی‌نو با ثبت سند خرید در خزانه و لاگ حسابرسی
app.post('/api/torob/import-to-inventory', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      category,
      brand,
      unit,
      image,
      gallery,
      extraImages,
      buyPrice = 0,
      priceShop1 = 0,
      priceShop2 = 0,
      priceShop3 = 0,
      stock = 20,
      minStock = 5,
      barcode,
      showOnWebsite,
      onlyAccounting,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'نام کالا الزامی است.' });
    }

    const trimmedName = name.trim();
    const cleanBuyPrice = Number(buyPrice) || 0;
    const cleanStock = Number(stock) || 0;
    const cleanSalePrice = Number(priceShop2 || priceShop1 || 0);
    const allImages = Array.isArray(extraImages) && extraImages.length > 0
      ? extraImages
      : (Array.isArray(gallery) && gallery.length > 0 ? gallery : (image ? [image] : []));

    // ۱. بررسی وجود کالای هم‌نام یا دارای بارکد مشابه
    const allProducts = await db.getProducts();
    const existingProduct = allProducts.find(
      (p) =>
        (barcode && p.barcode && p.barcode === barcode) ||
        p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingProduct) {
      // اگر کالا از قبل وجود دارد، موجودی را افزایش می‌دهیم و قیمت‌ها را به‌روزرسانی می‌کنیم
      const prevStock = Number(existingProduct.stock || 0);
      const newStock = prevStock + cleanStock;
      const mergedGallery = Array.from(new Set([...(existingProduct.gallery || []), ...allImages]));

      const updated = await db.updateProduct(
        existingProduct.id,
        {
          stock: newStock,
          buyPrice: cleanBuyPrice > 0 ? cleanBuyPrice : existingProduct.buyPrice,
          salePrice: cleanSalePrice > 0 ? cleanSalePrice : existingProduct.salePrice,
          priceShop1: Number(priceShop1) || existingProduct.priceShop1,
          priceShop2: Number(priceShop2) || existingProduct.priceShop2,
          priceShop3: Number(priceShop3) || existingProduct.priceShop3,
          wholesalePrice: Number(priceShop3) || existingProduct.wholesalePrice,
          image: image || existingProduct.image,
          gallery: mergedGallery,
          extraImages: mergedGallery,
          showOnWebsite: showOnWebsite !== undefined ? Boolean(showOnWebsite) : existingProduct.showOnWebsite,
          onlyAccounting: onlyAccounting !== undefined ? Boolean(onlyAccounting) : existingProduct.onlyAccounting,
        },
        {
          userId: req.user?.id,
          username: req.user?.username,
          reason: `افزایش موجودی از لیست قیمت ترب (+${cleanStock} ${existingProduct.unit})`,
          ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      // ثبت تراکنش در دفتر معین خزانه بابت هزینه خرید اضافه شده
      const totalPurchaseCost = cleanBuyPrice * cleanStock;
      if (totalPurchaseCost > 0) {
        await db.createTreasuryTransaction({
          transactionType: 'purchase_expense',
          sourceModule: 'purchases',
          referenceId: existingProduct.id,
          amount: -totalPurchaseCost,
          paymentMethod: 'cash',
          accountTitle: 'صندوق مرکزی',
          description: `خرید و افزایش موجودی ${cleanStock} ${existingProduct.unit} «${existingProduct.name}» از لیست قیمت ترب`,
        });
      }

      return res.json({
        product: updated,
        isExisting: true,
        message: `کالای «${existingProduct.name}» از قبل در سیستم موجود بود. موجودی آن از ${prevStock} به ${newStock} افزایش یافت و تصاویر و قیمت‌ها همگام شدند.`,
      });
    }

    // ۲. کالا وجود ندارد -> ثبت به عنوان کالای جدید (پیش‌فرض: فقط حسابداری مگر اینکه صریحاً ارسال به سایت انتخاب شود)
    const code = `INV-${Date.now().toString().slice(-6)}`;
    const shouldPublishToWebsite = Boolean(showOnWebsite);
    const isOnlyAccounting = onlyAccounting !== undefined ? Boolean(onlyAccounting) : !shouldPublishToWebsite;

    const newProduct = await db.createProduct({
      name: trimmedName,
      code,
      barcode: barcode || code,
      categoryId: 'cat_stationery',
      categoryName: category || 'نوشت‌افزار',
      unit: unit || 'عدد',
      image: image || allImages[0] || '',
      gallery: allImages,
      extraImages: allImages,
      showOnWebsite: shouldPublishToWebsite,
      onlyAccounting: isOnlyAccounting,
      stock: cleanStock,
      minStockAlert: Number(minStock) || 5,
      minAllowedPrice: cleanBuyPrice,
      buyPrice: cleanBuyPrice,
      salePrice: cleanSalePrice,
      priceShop1: Number(priceShop1) || Number(priceShop2 || 0),
      priceShop2: Number(priceShop2) || 0,
      priceShop3: Number(priceShop3) || 0,
      wholesalePrice: Number(priceShop3) || 0,
    });

    // ثبت سند خزانه بابت هزینه خرید اولیه کالا
    const totalPurchaseCost = cleanBuyPrice * cleanStock;
    if (totalPurchaseCost > 0) {
      await db.createTreasuryTransaction({
        transactionType: 'purchase_expense',
        sourceModule: 'purchases',
        referenceId: newProduct.id,
        amount: -totalPurchaseCost,
        paymentMethod: 'cash',
        accountTitle: 'صندوق مرکزی',
        description: `خرید و ثبت اولیه ${cleanStock} ${newProduct.unit} «${newProduct.name}» از لیست قیمت ترب`,
      });
    }

    // ثبت لاگ حسابرسی
    await db.createAuditLog({
      userId: req.user?.id,
      username: req.user?.username || 'مدیر سیستم',
      action: `ثبت کالای جدید «${newProduct.name}» از لیست قیمت ترب (موجودی اولیه: ${cleanStock} ${newProduct.unit})`,
      module: 'torob_import',
      targetId: newProduct.id,
      details: {
        productName: newProduct.name,
        stock: cleanStock,
        buyPrice: cleanBuyPrice,
        salePrice: cleanSalePrice,
        totalPurchaseCost,
      },
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      product: newProduct,
      isExisting: false,
      message: `کالای جدید «${newProduct.name}» با موفقیت در انبار ثبت گردید و سند خرید در خزانه صادر شد.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10.1 TREASURY & CENTRAL CASH LEDGER (دفتر معین متمرکز خزانه)
// -------------------------------------------------------------
app.get('/api/treasury/transactions', authenticateToken, async (req, res) => {
  try {
    const { sourceModule, transactionType } = req.query;
    const transactions = await db.getTreasuryTransactions({
      sourceModule: sourceModule as string,
      transactionType: transactionType as string,
    });
    res.json({ transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/treasury/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await db.getTreasurySummary();
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/treasury/transactions', authenticateToken, requireRole(['admin', 'chief_accountant']), async (req, res) => {
  try {
    const entry = req.body;
    if (!entry.transactionType || !entry.amount || !entry.sourceModule) {
      return res.status(400).json({ error: 'نوع تراکنش، مبلغ و ماژول مرجع الزامی است.' });
    }
    const created = await db.createTreasuryTransaction(entry);
    res.json({ transaction: created, message: 'تراکنش خزانه با موفقیت در دفتر معین ثبت گردید.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/torob/sync-price', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  const { productId, buyPrice, priceShop1, priceShop2, priceShop3, wholesalePrice } = req.body;
  try {
    const updated = await db.updateProduct(productId, {
      buyPrice,
      priceShop1,
      priceShop2,
      priceShop3,
      wholesalePrice,
    });
    if (!updated) return res.status(404).json({ error: 'کالا یافت نشد.' });
    res.json({ product: updated, message: `قیمت‌های هوشمند ۵ سطحی برای «${updated.name}» در پایگاه داده اعمال گردید.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// دیده‌بان و اسکن هوشمند انبار و تطبیق با بازار ترب
app.get('/api/torob/audit-inventory', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    const invProducts = await db.getProducts();
    const auditResult = await auditAllInventoryAgainstMarket(invProducts);
    res.json(auditResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// اصلاح دسته‌ای و هماهنگ‌سازی قیمت‌های چند کالای انبار در یک کلیک
app.post('/api/torob/batch-reprice', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || !updates.length) {
    return res.status(400).json({ error: 'لیست اصلاحات خالی است.' });
  }

  try {
    let successCount = 0;
    for (const item of updates) {
      if (item.productId && Number(item.priceShop2) > 0) {
        await db.updateProduct(item.productId, {
          priceShop1: Number(item.priceShop1) || Number(item.priceShop2),
          priceShop2: Number(item.priceShop2),
          priceShop3: Number(item.priceShop3) || Number(item.priceShop2),
          wholesalePrice: Number(item.wholesalePrice || item.priceShop3 || item.priceShop2),
          salePrice: Number(item.priceShop2 || item.priceShop1),
        });
        successCount++;
      }
    }
    res.json({
      success: true,
      updatedCount: successCount,
      message: `قیمت‌های هوشمند برای ${successCount} کالای انبار با موفقیت به‌روزرسانی شد.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// تحلیل مستقیم لینک کالا در ترب
app.post('/api/torob/direct-url', optionalAuthenticateToken, torobRateLimitMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'آدرس لینک ترب الزامی است.' });
  }
  try {
    const result = await inspectTorobDirectUrl(url);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10. AI ASSISTANT & GOOGLE GEMINI INTELLIGENCE (Backend-Only)
// -------------------------------------------------------------
const AI_ALLOWED_ROLES: UserRole[] = ['admin', 'site_manager', 'chief_accountant', 'accountant'];

// استعلام وضعیت اتصال و در دسترس بودن Gemini AI
app.get('/api/ai/status', authenticateToken, requireRole(AI_ALLOWED_ROLES), (req, res) => {
  try {
    const status = getAiConfigStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// دستیار هوشمند گفتگو و تحلیل حسابداری/انبار/فروش با Function Calling و Search Grounding
app.post('/api/ai/assistant', authenticateToken, requireRole(AI_ALLOWED_ROLES), aiRateLimitMiddleware, async (req, res) => {
  const { messages, storeContext, enableSearchGrounding } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'آرایه پیام‌های گفتگو خالی یا نامعتبر است.', code: 'INVALID_MESSAGES' });
  }

  if (messages.length > 50) {
    return res.status(400).json({ error: 'تعداد پیام‌های تاریخچه بیش از حد مجاز (حداکثر ۵۰ پیام) است.', code: 'TOO_MANY_MESSAGES' });
  }

  // بررسی سلامت ساختار پیام‌ها و اعتبارسنجی
  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.text !== 'string' || !m.text.trim()) {
      return res.status(400).json({ error: 'فرمت پیام ارسالی نامعتبر است. متن پیام نمی‌تواند خالی باشد.', code: 'INVALID_MESSAGE_PAYLOAD' });
    }
    if (m.text.length > 10000) {
      return res.status(400).json({ error: 'طول متن پیام بیش از سقف مجاز (۱۰,۰۰۰ کاراکتر) است.', code: 'PAYLOAD_TOO_LARGE' });
    }
  }

  try {
    const authUser = (req as AuthRequest).user;
    const result = await askGeminiAssistant(
      messages,
      typeof storeContext === 'string' ? storeContext.slice(0, 2000) : undefined,
      enableSearchGrounding !== false, // پیش‌فرض فعال
      authUser ? {
        id: authUser.id,
        username: authUser.username,
        role: authUser.role,
        fullName: authUser.fullName,
      } : undefined
    );
    res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'خطا در ارتباط با هوش مصنوعی Gemini',
      code: err.code || 'GEMINI_ERROR',
    });
  }
});

// دستیار هوشمند جریانی (Server-Sent Events Streaming) برای پاسخ‌دهی لحظه‌ای و زنده
app.post('/api/ai/assistant/stream', authenticateToken, requireRole(AI_ALLOWED_ROLES), aiRateLimitMiddleware, async (req, res) => {
  const { messages, storeContext, enableSearchGrounding } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'آرایه پیام‌های گفتگو خالی یا نامعتبر است.', code: 'INVALID_MESSAGES' });
  }

  if (messages.length > 50) {
    return res.status(400).json({ error: 'تعداد پیام‌های تاریخچه بیش از حد مجاز (حداکثر ۵۰ پیام) است.', code: 'TOO_MANY_MESSAGES' });
  }

  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.text !== 'string' || !m.text.trim()) {
      return res.status(400).json({ error: 'فرمت پیام ارسالی نامعتبر است. متن پیام نمی‌تواند خالی باشد.', code: 'INVALID_MESSAGE_PAYLOAD' });
    }
    if (m.text.length > 10000) {
      return res.status(400).json({ error: 'طول متن پیام بیش از سقف مجاز است.', code: 'PAYLOAD_TOO_LARGE' });
    }
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as any).flushHeaders?.();

  try {
    const authUser = (req as AuthRequest).user;
    const finalResult = await askGeminiAssistantStream(
      messages,
      typeof storeContext === 'string' ? storeContext.slice(0, 2000) : undefined,
      enableSearchGrounding !== false,
      authUser ? {
        id: authUser.id,
        username: authUser.username,
        role: authUser.role,
        fullName: authUser.fullName,
      } : undefined,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ type: 'done', final: finalResult })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'خطا در پردازش هوش مصنوعی', code: err.code || 'GEMINI_ERROR' })}\n\n`);
    res.end();
  }
});

// جستجوی زنده در وب با Google Search Grounding برای رصد کالاها و اخبار بازار
app.post('/api/ai/grounded-search', authenticateToken, requireRole(AI_ALLOWED_ROLES), aiRateLimitMiddleware, async (req, res) => {
  const { query: searchQuery } = req.body;
  if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
    return res.status(400).json({ error: 'متن جستجو برای هوش بازار الزامی است.', code: 'MISSING_QUERY' });
  }

  if (searchQuery.length > 500) {
    return res.status(400).json({ error: 'طول متن جستجو بیش از سقف مجاز است.', code: 'QUERY_TOO_LONG' });
  }

  try {
    const result = await groundedWebMarketSearch(searchQuery.trim());
    res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'خطا در جستجوی متصل به وب با Google Grounding',
      code: err.code || 'GROUNDED_SEARCH_ERROR',
    });
  }
});

// تحلیل و مشاوره استراتژی قیمت‌گذاری ۵ سطحی برای کالا
app.post('/api/ai/pricing-advice', authenticateToken, requireRole(AI_ALLOWED_ROLES), aiRateLimitMiddleware, async (req, res) => {
  const { productName, buyPrice, category, torobMinPrice, torobAvgPrice } = req.body;
  
  if (!productName || typeof productName !== 'string') {
    return res.status(400).json({ error: 'نام محصول برای تحلیل قیمت الزامی است.', code: 'MISSING_PRODUCT_NAME' });
  }

  try {
    const advice = await analyzeProductMarketAndPricing(
      productName.trim().slice(0, 200),
      Math.max(Number(buyPrice) || 0, 0),
      typeof category === 'string' ? category.trim().slice(0, 100) : 'عمومی',
      torobMinPrice ? Number(torobMinPrice) : undefined,
      torobAvgPrice ? Number(torobAvgPrice) : undefined
    );
    res.json({ advice });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'خطا در تحلیل قیمت‌گذاری هوشمند',
      code: err.code || 'PRICING_ADVICE_ERROR',
    });
  }
});

// -------------------------------------------------------------
// 11. WEBSITE MANAGEMENT & STORE SETTINGS (SQL-Backed)
// -------------------------------------------------------------
app.get('/api/website/settings', async (req, res) => {
  try {
    const [websiteSettings, storeSettings] = await Promise.all([
      db.getWebsiteSettings(),
      db.getStoreSettings(),
    ]);
    res.json({ websiteSettings, storeSettings, settings: websiteSettings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/website/settings', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const webSettings = req.body.websiteSettings || (req.body.siteTitle !== undefined || req.body.noticeText !== undefined ? req.body : undefined);
    const storeSettings = req.body.storeSettings || (req.body.storeName !== undefined || req.body.phone !== undefined ? req.body : undefined);

    let updatedWeb = null;
    let updatedStore = null;

    if (webSettings) {
      updatedWeb = await db.updateWebsiteSettings(webSettings);
    }
    if (storeSettings) {
      updatedStore = await db.updateStoreSettings(storeSettings);
    }

    res.json({
      message: 'تنظیمات با موفقیت در پایگاه داده ذخیره شد و روی فروشگاه اعمال گردید.',
      websiteSettings: updatedWeb,
      storeSettings: updatedStore,
      settings: updatedWeb,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/website/banners', async (req, res) => {
  try {
    const banners = await db.getBanners();
    res.json({ banners });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 11.4 UNIFIED DATABASE & MEDIA BACKUP & RESTORE
// -------------------------------------------------------------
app.get('/api/backup/stats', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const stats = await getBackupStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/export', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const format = (req.query.format as string) || 'sql';
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      const jsonData = await generateJsonBackup();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="khatinoo_backup_${dateStr}.json"`);
      return res.send(JSON.stringify(jsonData, null, 2));
    } else {
      const sqlData = await generateSqlDump();
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="khatinoo_database_${dateStr}.sql"`);
      return res.send(sqlData);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const { format, content, data } = req.body;
    const backupContent = data !== undefined ? data : content;

    if (!backupContent) {
      return res.status(400).json({ error: 'محتوا یا فایل پشتیبان جهت بازگردانی ارسال نشده است.' });
    }

    if (format === 'json' || typeof backupContent === 'object') {
      const result = await restoreFromJson(backupContent);
      return res.json(result);
    } else {
      const result = await restoreFromSql(String(backupContent));
      return res.json(result);
    }
  } catch (err: any) {
    console.error('❌ [Restore Error]:', err);
    res.status(500).json({ error: err.message || 'خطای غیرمنتظره در بازیابی اطلاعات' });
  }
});

// -------------------------------------------------------------
// 11.5 CUSTOMER AUTH, PROFILE & OTP (مستقل از ادمین)
// -------------------------------------------------------------
// نقشه موقت برای محدودیت نرخ درخواست پیامک (Rate Limiting)
const otpRateLimitMap = new Map<string, { count: number; lastReset: number }>();

app.post('/api/customer/auth/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || typeof mobile !== 'string') {
      return res.status(400).json({ error: 'شماره موبایل الزامی است.' });
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (!/^09[0-9]{9}$/.test(cleanMobile)) {
      return res.status(400).json({ error: 'شماره موبایل نامعتبر است. شماره باید ۱۱ رقم و با ۰۹ شروع شود.' });
    }

    // بررسی Rate Limit (حداکثر ۵ درخواست در ۱۰ دقیقه برای جلوگیری از اسپم)
    const now = Date.now();
    const rateData = otpRateLimitMap.get(cleanMobile) || { count: 0, lastReset: now };
    if (now - rateData.lastReset > 10 * 60 * 1000) {
      rateData.count = 0;
      rateData.lastReset = now;
    }

    if (rateData.count >= 5) {
      return res.status(429).json({ error: 'تعداد درخواست‌های کد تایید بیش از حد مجاز است. لطفاً ۱۰ دقیقه بعد مجدداً تلاش کنید.' });
    }

    rateData.count++;
    otpRateLimitMap.set(cleanMobile, rateData);

    // تولید کد تصادفی ۵ رقمی امن بر پایه ماژول استاندارد crypto
    const otpCode = crypto.randomInt(10000, 100000).toString();

    // ذخیره در دیتابیس با زمان انقضای ۲ دقیقه
    await db.saveOtpCode(cleanMobile, otpCode, 2);

    // ارسال واقعی پیامک بر اساس تنظیمات درگاه کاوه‌نگار در دیتابیس
    const smsResult = await cmsEngine.sendRealSms({
      mobile: cleanMobile,
      otpToken: otpCode,
      messageText: `کد تایید ورود به خطی‌نو: ${otpCode}\n(اعتبار ۲ دقیقه)\nkhatynoo.ir`,
    });

    console.log(`📱 [Customer OTP] پیامک ورود به شماره ${cleanMobile} ارسال گردید.`);

    res.json({
      success: true,
      message: smsResult.message || 'کد تایید پیامکی با موفقیت ارسال گردید.',
      expiresInSeconds: 120,
    });
  } catch (err: any) {
    console.error('❌ [Send OTP Error]:', err.message || err);
    res.status(400).json({ error: err.message || 'خطا در ارسال کد تایید پیامکی.' });
  }
});

app.post('/api/customer/auth/verify-otp', async (req, res) => {
  try {
    const { mobile, code } = req.body;

    if (!mobile || !code) {
      return res.status(400).json({ error: 'شماره موبایل و کد تایید الزامی است.' });
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const cleanCode = String(code).trim();

    const verification = await db.verifyOtpCode(cleanMobile, cleanCode);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.message });
    }

    // ایجاد یا واکشی مشتری از دیتابیس
    const customer = await db.createOrGetCustomerByMobile(cleanMobile);

    // صدور توکن مستقل نشست مشتری با اعتبار ۳۰ روز
    const token = jwt.sign(
      {
        customerId: customer.id,
        mobile: customer.mobile,
        type: 'customer',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      customer,
      profileCompleted: Boolean(customer.profileCompleted),
      message: `خوش آمدید، ${customer.name || 'مشتری گرامی'}`,
    });
  } catch (err: any) {
    console.error('❌ [Verify OTP Error]:', err);
    res.status(500).json({ error: `خطا در تایید کد پیامکی: ${err.message}` });
  }
});

app.get('/api/customer/me', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const customer = await db.getCustomerById(req.customer!.id);
    if (!customer) {
      return res.status(404).json({ error: 'اطلاعات مشتری یافت نشد.' });
    }
    res.json({ success: true, customer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customer/profile', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const { name, email, province, city, postalCode, fullAddress, nationalCode, companyName } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است.' });
    }

    const updated = await db.updateCustomerProfile(req.customer!.id, {
      name,
      email,
      province,
      city,
      postalCode,
      fullAddress,
      nationalCode,
      companyName,
    });

    if (!updated) {
      return res.status(404).json({ error: 'مشتری یافت نشد.' });
    }

    res.json({
      success: true,
      customer: updated,
      message: 'پروفایل کاربری شما با موفقیت ذخیره و به‌روزرسانی شد.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/orders', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const orders = await db.getCustomerOrders(req.customer!.id, req.customer!.mobile);
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/orders/:id', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const order = await db.getCustomerOrderById(req.params.id, req.customer!.id, req.customer!.mobile);
    if (!order) {
      return res.status(404).json({ error: 'سفارش مورد نظر یافت نشد.' });
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/activities', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const customer = await db.getCustomerById(req.customer!.id);
    const activities = await db.getCustomerFullActivities(req.customer!.id, req.customer!.mobile);
    res.json({ success: true, activities, customer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/sales-invoices', authenticateCustomerToken, async (req: CustomerAuthRequest, res) => {
  try {
    const invoices = await db.getCustomerSalesInvoices(req.customer!.id, req.customer!.mobile);
    res.json({ success: true, invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 12. ONLINE STORE ORDER PLACEMENT & TRACKING (SQL-Backed)
// -------------------------------------------------------------
app.post('/api/orders/checkout', async (req, res) => {
  const {
    customerId,
    customerName,
    customerMobile,
    customerAddress,
    customerPostalCode,
    customerProvince,
    customerCity,
    customerEmail,
    items,
    shippingMethodCode,
    paymentGatewayCode,
    couponCode,
    warehouseId,
  } = req.body;

  if (!customerName || !customerMobile || !customerAddress || !items || !items.length) {
    return res.status(400).json({ error: 'اطلاعات گیرنده، آدرس و اقلام سفارش الزامی هستند.' });
  }

  try {
    const result = await db.placeOnlineOrder({
      customerId,
      customerName,
      customerMobile,
      customerAddress,
      customerPostalCode,
      customerProvince,
      customerCity,
      customerEmail,
      items,
      shippingMethodCode: shippingMethodCode || 'courier',
      paymentGatewayCode: paymentGatewayCode || 'zarinpal',
      couponCode,
      warehouseId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant']), async (req, res) => {
  try {
    const orders = await db.getOnlineOrders();
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/track', async (req, res) => {
  try {
    const { mobile, orderNumber } = req.query;
    if (!mobile || !orderNumber) {
      return res.status(400).json({ 
        error: 'وارد کردن همزمان شماره موبایل و شماره سفارش برای رهگیری سفارش الزامی است.' 
      });
    }

    const cleanMobile = String(mobile).trim();
    const cleanOrderNumber = String(orderNumber).trim();

    const orders = await db.trackOnlineOrder(cleanMobile, cleanOrderNumber);
    if (orders.length === 0) {
      return res.status(404).json({
        error: 'سفارشی با این مشخصات یافت نشد.',
        orders: [],
      });
    }

    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const { orderStatus, trackingCode } = req.body;
    await db.updateOrderStatus(req.params.id, orderStatus, trackingCode);
    res.json({ message: 'وضعیت سفارش با موفقیت به‌روز شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 13. DASHBOARD ANALYTICS & STATS (SQL Aggregations)
// -------------------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 14. MODULAR CMS ARCHITECTURE ENDPOINTS (Core + Modules)
// -------------------------------------------------------------
// Modules & Hooks
app.get('/api/cms/modules', (req, res) => {
  res.json({ modules: cmsEngine.getModules() });
});

app.post('/api/cms/modules/:id/toggle', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { isEnabled } = req.body;
    const mod = cmsEngine.toggleModule(req.params.id, isEnabled);
    res.json({ module: mod, message: `ماژول «${mod.name}» ${isEnabled ? 'فعال' : 'غیرفعال'} گردید.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/cms/hooks', (req, res) => {
  res.json({ hooks: cmsEngine.getEventHooks() });
});

// Page Builder (Drag & Drop Blocks & Templates)
app.get('/api/cms/page-builder/blocks', (req, res) => {
  res.json({ blocks: cmsEngine.getPageBlocks() });
});

app.put('/api/cms/page-builder/blocks', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { blocks } = req.body;
    const updated = cmsEngine.savePageBlocks(blocks);
    res.json({ blocks: updated, message: 'چیدمان صفحه اصلی با موفقیت ذخیره و منتشر گردید.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/cms/page-builder/templates', (req, res) => {
  res.json({ templates: cmsEngine.getTemplates() });
});

app.post('/api/cms/page-builder/templates/apply', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { templateId } = req.body;
    const blocks = cmsEngine.applyTemplate(templateId);
    res.json({ blocks, message: 'قالب انتخابی با موفقیت اعمال گردید.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cms/page-builder/templates', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { name, description, blocks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'نام قالب الزامی است.' });
    }
    const tpl = cmsEngine.saveAsTemplate(name, description, blocks);
    res.json({ template: tpl, message: `قالب «${tpl.name}» با موفقیت ذخیره شد.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cms/page-builder/templates/:id', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const result = cmsEngine.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'قالب سفارشی با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Media Library & Direct File Upload to Server
app.post('/api/upload', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant', 'seller']), (req, res) => {
  try {
    const { dataUrl, filename, category = 'logo', title, altText } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'محتوای تصویر (dataUrl) ارسال نشده است.' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'فرمت داده تصویر (Base64) نامعتبر است.' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = 'webp';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('svg')) ext = 'svg';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('ico')) ext = 'ico';

    const safeBaseName = (filename || title || 'upload')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_')
      .slice(0, 40);
    const uniqueFileName = `${Date.now()}_${safeBaseName}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFileName}`;

    const item = cmsEngine.addMediaItem({
      filename: uniqueFileName,
      title: title || filename || 'نشان و تصویر فروشگاه',
      url: fileUrl,
      fileType: mimeType,
      sizeBytes: buffer.length,
      dimensions: 'auto',
      altText: altText || title || 'تصویر',
      category: category as any,
    });

    res.json({
      success: true,
      url: fileUrl,
      filename: uniqueFileName,
      mediaItem: item,
      message: 'فایل با موفقیت روی سرور بارگذاری و در کتابخانه رسانه ثبت گردید.',
    });
  } catch (err: any) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: `خطا در آپلود فایل: ${err.message}` });
  }
});

app.get('/api/cms/media', (req, res) => {
  const { category } = req.query;
  res.json({ media: cmsEngine.getMedia(category as string) });
});

app.post('/api/cms/media', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { filename, title, url, fileType, sizeBytes, dimensions, altText, category } = req.body;
    if (!url || !title) return res.status(400).json({ error: 'آدرس فایل و عنوان الزامی است.' });
    const item = cmsEngine.addMediaItem({
      filename: filename || 'image.webp',
      title,
      url,
      fileType: fileType || 'image/webp',
      sizeBytes: sizeBytes || 120000,
      dimensions: dimensions || '1000x1000',
      altText: altText || title,
      category: category || 'product',
    });
    res.json({ item, message: 'فایل با موفقیت در کتابخانه رسانه ذخیره گردید.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cms/media/:id', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    cmsEngine.deleteMediaItem(req.params.id);
    res.json({ success: true, message: 'فایل از کتابخانه حذف شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// SMS Gateway
app.get('/api/cms/sms/config', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const config = await cmsEngine.getSmsConfig();
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cms/sms/config', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const updated = await cmsEngine.updateSmsConfig(req.body);
    res.json({ config: updated, message: 'تنظیمات درگاه پیامک به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cms/sms/send-test', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const { mobile, message } = req.body;
    if (!mobile) return res.status(400).json({ error: 'شماره موبایل گیرنده الزامی است.' });
    const result = await cmsEngine.sendTestSms(mobile, message);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/cms/sms/logs', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  res.json({ logs: cmsEngine.getSmsLogs() });
});

// Payment Gateways
app.get('/api/cms/gateways', (req, res) => {
  res.json({ gateways: cmsEngine.getGateways() });
});

app.put('/api/cms/gateways/:code', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const updated = cmsEngine.updateGateway(req.params.code, req.body);
    res.json({ gateway: updated, message: 'تنظیمات درگاه پرداخت ذخیره شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Coupons
app.get('/api/cms/coupons', (req, res) => {
  res.json({ coupons: cmsEngine.getCoupons() });
});

app.post('/api/cms/coupons', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const cpn = cmsEngine.createCoupon(req.body);
    res.json({ coupon: cpn, message: 'کد تخفیف با موفقیت ایجاد شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cms/coupons/:id', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    cmsEngine.deleteCoupon(req.params.id);
    res.json({ success: true, message: 'کد تخفیف حذف شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cms/coupons/validate', (req, res) => {
  try {
    const { code, cartAmount } = req.body;
    if (!code) return res.status(400).json({ error: 'کد تخفیف الزامی است.' });
    const result = cmsEngine.validateCoupon(code, Number(cartAmount) || 0);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Product Reviews
app.get('/api/cms/reviews', (req, res) => {
  const { productId } = req.query;
  res.json({ reviews: cmsEngine.getReviews(productId as string) });
});

app.post('/api/cms/reviews', (req, res) => {
  try {
    const { productId, productName, customerName, rating, comment } = req.body;
    if (!productId || !customerName || !comment) {
      return res.status(400).json({ error: 'اطلاعات نظر، نام و متن دیدگاه الزامی است.' });
    }
    const rev = cmsEngine.createReview({ productId, productName, customerName, rating, comment });
    res.json({ review: rev, message: 'نظر شما ثبت شد و پس از بررسی منتشر خواهد شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/cms/reviews/:id/approve', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const rev = cmsEngine.approveReview(req.params.id);
    res.json({ review: rev, message: 'دیدگاه تایید و در سایت منتشر گردید.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/cms/reviews/:id/reject', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const rev = cmsEngine.rejectReview(req.params.id);
    res.json({ review: rev, message: 'دیدگاه رد شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cms/reviews/:id/reply', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  try {
    const { replyText } = req.body;
    const rev = cmsEngine.replyReview(req.params.id, replyText);
    res.json({ review: rev, message: 'پاسخ مدیریت برای این دیدگاه ثبت شد.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Audit Logs
app.get('/api/cms/audit-logs', authenticateToken, requireRole(['admin', 'site_manager']), (req, res) => {
  res.json({ logs: cmsEngine.getAuditLogs() });
});

// -------------------------------------------------------------
// 11.6 MULTI-CHANNEL PUBLICATION ENDPOINTS (ایتا، بله، تلگرام، اینستاگرام، سایت)
// -------------------------------------------------------------

// دریافت لیست کانال‌های پیکربندی‌شده
app.get('/api/publication/channels', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant', 'seller']), async (req, res) => {
  try {
    const channels = await PublicationService.getChannels();
    res.json({ channels });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ایجاد یا ثبت کانال جدید
app.post('/api/publication/channels', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const { id, provider, name, enabled, config } = req.body;
    if (!provider || !name) {
      return res.status(400).json({ error: 'نام و نوع درگاه انتشار الزامی است.' });
    }
    const channelId = id || `pub_chan_${provider}_${Date.now()}`;
    const channel = await PublicationService.createChannel({ id: channelId, provider, name, enabled, config });
    res.json({ channel, message: 'کانال جدید با موفقیت ثبت شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// به‌روزرسانی کانال موجود
app.put('/api/publication/channels/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const { name, enabled, config } = req.body;
    const channel = await PublicationService.updateChannel(req.params.id, { name, enabled, config });
    if (!channel) {
      return res.status(404).json({ error: 'کانال مورد نظر یافت نشد.' });
    }
    res.json({ channel, message: 'تنظیمات کانال با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// حذف کانال
app.delete('/api/publication/channels/:id', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const success = await PublicationService.deleteChannel(req.params.id);
    res.json({ success, message: 'کانال مورد نظر با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// تست اتصال و احراز هویت کانال با درگاه خارجی
app.post('/api/publication/channels/:id/test', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    const testResult = await PublicationService.testChannel(req.params.id);
    res.json(testResult);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'خطا در تست اتصال کانال' });
  }
});

// انتشار دستی کالا به یک یا چند کانال
app.post('/api/publication/products/:productId/publish', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'seller']), async (req, res) => {
  try {
    const { providers, customText, sendImage, generateHashtags } = req.body;
    const result = await PublicationService.publishManually(
      req.params.productId,
      {
        productId: req.params.productId,
        providers: providers || ['website', 'eitaa', 'bale', 'telegram'],
        event: 'manual',
        customText,
        sendImage,
        generateHashtags,
      },
      (req as any).user?.id
    );

    res.json({
      success: true,
      message: `${result.queuedCount} وظیفه انتشار در صف پردازش قرار گرفت.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// تاریخچه انتشار یک کالا
app.get('/api/publication/products/:productId/history', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant', 'seller']), async (req, res) => {
  try {
    const history = await PublicationService.getProductHistory(req.params.productId);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// تلاش مجدد برای انتشار یک کار ناموفق
app.post('/api/publication/:publicationId/retry', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    const updated = await PublicationService.retry(req.params.publicationId);
    if (!updated) {
      return res.status(404).json({ error: 'وظیفه انتشار مورد نظر یافت نشد.' });
    }
    res.json({ success: true, message: 'وظیفه با موفقیت مجدداً در صف انتشار قرار گرفت.', item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// لغو کار در صف
app.post('/api/publication/:publicationId/cancel', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    const cancelled = await PublicationService.cancel(req.params.publicationId);
    if (!cancelled) {
      return res.status(404).json({ error: 'وظیفه قابل لغو در صف یافت نشد.' });
    }
    res.json({ success: true, message: 'وظیفه انتشار لغو شد.', item: cancelled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// آمار کلی انتشار چندکاناله
app.get('/api/publication/stats', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant', 'seller']), async (req, res) => {
  try {
    const stats = await PublicationService.getStats();
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// لاگ و سوابق جامع انتشار چندکاناله با فیلتر و صفحه‌بندی
app.get('/api/publication/history', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant', 'accountant', 'seller']), async (req, res) => {
  try {
    const { productId, provider, status, eventType, limit, offset } = req.query;
    const history = await PublicationService.getHistory({
      productId: productId ? String(productId) : undefined,
      provider: provider ? String(provider) : undefined,
      status: status ? String(status) : undefined,
      eventType: eventType ? String(eventType) : undefined,
      limit: limit ? Number(limit) : 25,
      offset: offset ? Number(offset) : 0,
    });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// دریافت تنظیمات انتشار
app.get('/api/publication/settings', authenticateToken, requireRole(['admin', 'site_manager', 'chief_accountant']), async (req, res) => {
  try {
    const settings = await PublicationService.getSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// به‌روزرسانی تنظیمات انتشار
app.put('/api/publication/settings', authenticateToken, requireRole(['admin', 'site_manager']), async (req, res) => {
  try {
    const settings = await PublicationService.updateSettings(req.body);
    res.json({ settings, message: 'تنظیمات انتشار چندکاناله با موفقیت ذخیره شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------
async function start() {
  const isProduction = process.env.NODE_ENV === 'production' || 
    (typeof __filename !== 'undefined' && __filename.endsWith('.cjs')) ||
    (!fs.existsSync(path.join(process.cwd(), 'src/main.tsx')));

  // 1. Vite Middleware Setup / Static Serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>Khatinoo</title></head><body><div id="root">Loading Khatinoo Store...</div></body></html>');
      }
    });
  }

  // 2. Global Express Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('⚠️ [Express Unhandled Route Error]:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: err.message || 'خطای داخلی سرور',
    });
  });

  // 3. Start HTTP Server on 0.0.0.0 and dynamic PORT
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 سرور فروشگاه و حسابداری خطی‌نو روی پورت ${PORT} (0.0.0.0) در وضعیت ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} فعال است.`);
  });

  server.on('error', (err: any) => {
    console.error('❌ [Server Listen Error]:', err);
  });

  // 4. Initialize PostgreSQL Database Schema and Seed Data in background
  try {
    const isConnected = await initializeDatabase();
    if (!isConnected) {
      console.warn('⚠️ [Database Warning] پایگاه داده با موتور داخلی فعال شد.');
    }

    // 5. Start Multi-Channel Publication Worker
    try {
      startPublicationWorker();
    } catch (workerErr: any) {
      console.error('❌ [Worker Startup Error]:', workerErr.message);
    }
  } catch (err: any) {
    console.error('❌ [Database Boot Error] خطا در راه‌اندازی پایگاه داده:', err.message);
  }
}

start();
