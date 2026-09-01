/*
 * Khatynoo security hardening bootstrap.
 * Loaded before the application in every supported runtime entrypoint.
 */
'use strict';

const Module = require('module');

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || 'https://khatynoo.ir,https://www.khatynoo.ir')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const MIN_JWT_SECRET_LENGTH = 32;
const INSECURE_JWT_SECRETS = new Set([
  'khatinoo_super_secret_jwt_key_2026_stationery_store',
  'change-me',
  'secret',
]);

if (isProduction) {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (
    !jwtSecret ||
    jwtSecret.length < MIN_JWT_SECRET_LENGTH ||
    INSECURE_JWT_SECRETS.has(jwtSecret)
  ) {
    console.error('[SECURITY] Refusing production startup: JWT_SECRET must be a unique random secret of at least 32 characters.');
    process.exit(1);
  }
}

/*
 * Production log redaction.
 * The application has legacy log statements that may contain OTPs, mobile
 * numbers, credentials, authorization headers, SQL parameters, or tokens.
 * Redact these at the process boundary so a forgotten debug statement cannot
 * put authentication secrets into PM2/container logs.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'pass',
  'secret',
  'jwtsecret',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'otp',
  'otpcode',
  'code',
  'simulatedcode',
  'apikey',
  'api_key',
  'privatekey',
]);

function redactString(value) {
  let output = String(value);

  // Authorization headers and bearer tokens.
  output = output.replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, '$1[REDACTED]');
  output = output.replace(/(Authorization\s*[:=]\s*)[^,\s]+/gi, '$1[REDACTED]');

  // JWT-shaped values (three base64url segments).
  output = output.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[JWT_REDACTED]');

  // OTPs in known log/message formats. Never expose a 4-8 digit verification
  // code when it is labelled as OTP/verification code.
  output = output.replace(/((?:otp|کد(?:\s+تایید|\s+پیامکی|\s+ورود)?|verification\s*code)\s*(?:[:=]|is|برای)?\s*)(\d{4,8})/gi, '$1[REDACTED]');

  // Common credential assignments in free-form logs.
  output = output.replace(/((?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');

  return output;
}

function redactValue(value, key = '') {
  if (SENSITIVE_KEYS.has(String(key).toLowerCase())) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = redactValue(childValue, childKey);
    }
    return result;
  }
  return value;
}

if (isProduction) {
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[method].bind(console);
    console[method] = (...args) => original(...args.map((value) => redactValue(value)));
  }
}

/*
 * Harden selected modules before server.ts is loaded. This keeps the existing
 * application behavior intact while ensuring production and Docker cannot
 * accidentally bypass the security layer.
 */
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'cors') {
    const realCors = originalLoad.call(this, request, parent, isMain);
    return function hardenedCors(options) {
      const configured = options || {};
      return realCors({
        ...configured,
        origin(origin, callback) {
          if (!origin) return callback(null, true);
          const isLocalDev = !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
          if (allowedOrigins.has(origin) || isLocalDev) return callback(null, true);
          return callback(new Error('CORS origin denied'));
        },
      });
    };
  }

  if (request === 'jsonwebtoken') {
    const jwt = originalLoad.call(this, request, parent, isMain);
    const hardened = { ...jwt };
    const originalSign = jwt.sign.bind(jwt);
    const originalVerify = jwt.verify.bind(jwt);

    hardened.sign = function(payload, secretOrPrivateKey, options, callback) {
      const nextOptions = { ...(options || {}) };
      const requested = nextOptions.expiresIn;
      if (requested === undefined || requested === '7d' || requested === '7 days') {
        nextOptions.expiresIn = '30m';
      }
      nextOptions.algorithm = 'HS256';
      return originalSign(payload, secretOrPrivateKey, nextOptions, callback);
    };

    hardened.verify = function(token, secretOrPublicKey, options, callback) {
      const nextOptions = { ...(options || {}) };
      nextOptions.algorithms = ['HS256'];
      return originalVerify(token, secretOrPublicKey, nextOptions, callback);
    };

    return hardened;
  }

  if (request === 'express') {
    const express = originalLoad.call(this, request, parent, isMain);
    const originalJson = express.json;
    const originalUrlencoded = express.urlencoded;

    express.json = function(options) {
      return originalJson.call(this, {
        ...(options || {}),
        limit: '2mb',
      });
    };

    express.urlencoded = function(options) {
      return originalUrlencoded.call(this, {
        ...(options || {}),
        limit: '2mb',
      });
    };

    return express;
  }

  return originalLoad.call(this, request, parent, isMain);
};

// Add security headers and a login brute-force guard to every Express app.
const express = require('express');
const originalExpressApplication = express.application;
const originalUse = originalExpressApplication.use;
const originalPost = originalExpressApplication.post;
const originalGet = originalExpressApplication.get;

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimit(req, res, next) {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 120);
  const key = `${ip}|${username || '<missing>'}`;
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
  res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const current = loginAttempts.get(key);
      if (current) {
        current.count = Math.max(0, current.count - 1);
        if (current.count === 0) loginAttempts.delete(key);
      }
    }
  });

  next();
}

originalExpressApplication.use = function(...args) {
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

originalExpressApplication.get = function(path, ...handlers) {
  const paths = Array.isArray(path) ? path : [path];
  if (paths.includes('/api/health') || paths.includes('/health')) {
    handlers = handlers.map((handler) => async function(req, res, next) {
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        return originalJson({ status: body?.status === 'ok' ? 'ok' : 'error' });
      };
      try {
        return await handler(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  }
  return originalGet.call(this, path, ...handlers);
};

setInterval(() => {
  const cutoff = Date.now() - LOGIN_WINDOW_MS;
  for (const [key, value] of loginAttempts) {
    if (value.startedAt < cutoff) loginAttempts.delete(key);
  }
}, LOGIN_WINDOW_MS).unref();
