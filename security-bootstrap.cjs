/*
 * Khatynoo security hardening bootstrap.
 * Loaded before the production server so security controls are applied without
 * touching application/database data.
 */
'use strict';

const http = require('http');
const Module = require('module');

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set([
  'https://khatynoo.ir',
  'https://www.khatynoo.ir',
]);

if (isProduction) {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret === 'khatinoo_super_secret_jwt_key_2026_stationery_store') {
    console.error('[SECURITY] Refusing production startup: JWT_SECRET must be a unique random secret of at least 32 characters.');
    process.exit(1);
  }
}

// Restrict the otherwise-open `cors()` call in the existing application.
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'cors') {
    const realCors = originalLoad.call(this, request, parent, isMain);
    return function hardenedCors(options) {
      const configured = options || {};
      return realCors({
        ...configured,
        origin(origin, callback) {
          // Non-browser/server-to-server requests have no Origin header.
          if (!origin) return callback(null, true);
          const isLocalDev = !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(origin);
          if (allowedOrigins.has(origin) || isLocalDev) return callback(null, true);
          return callback(new Error('CORS origin denied'));
        },
      });
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Add security headers and a small login brute-force guard to every Express app.
const express = require('express');
const originalExpress = express;
const originalExpressApplication = originalExpress.application;
const originalUse = originalExpressApplication.use;
const originalPost = originalExpressApplication.post;
const originalGet = originalExpressApplication.get;

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
function loginRateLimit(req, res, next) {
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || now - entry.startedAt > LOGIN_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    loginAttempts.set(key, entry);
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - entry.startedAt)) / 1000);
    res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
    return res.status(429).json({ error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.' });
  }
  entry.count += 1;
  next();
}

originalExpressApplication.use = function(...args) {
  // Install the headers once at the beginning of the middleware stack.
  if (!this.__khatynooSecurityInstalled) {
    this.__khatynooSecurityInstalled = true;
    originalUse.call(this, securityHeaders);
  }
  return originalUse.apply(this, args);
};

originalExpressApplication.post = function(path, ...handlers) {
  if (path === '/api/auth/login') handlers.unshift(loginRateLimit);
  return originalPost.call(this, path, ...handlers);
};

// Do not expose operational/database inventory details from public health checks.
originalExpressApplication.get = function(path, ...handlers) {
  const paths = Array.isArray(path) ? path : [path];
  if (paths.includes('/api/health') || paths.includes('/health')) {
    handlers = handlers.map((handler) => async function(req, res, next) {
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        if (body && body.status === 'ok') return originalJson({ status: 'ok' });
        return originalJson({ status: 'error' });
      };
      try { return await handler(req, res, next); } catch (err) { return next(err); }
    });
  }
  return originalGet.call(this, path, ...handlers);
};

// Keep the map bounded in long-running processes.
setInterval(() => {
  const cutoff = Date.now() - LOGIN_WINDOW_MS;
  for (const [key, value] of loginAttempts) {
    if (value.startedAt < cutoff) loginAttempts.delete(key);
  }
}, LOGIN_WINDOW_MS).unref();
