// Admin session auth — signed cookies, no DB state.
// Cookie is HttpOnly + Secure + SameSite=Strict.
// Signature: HMAC-SHA256 over the payload using SESSION_SECRET.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config from './config.js';

const COOKIE_NAME = 'wsession';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// --- token helpers ---

function sign(payload) {
  const mac = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${mac}`;
}

function verify(token) {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const expected = sign(payload);
  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return null;
  return payload;
}

// --- public API ---

export function createSession(res) {
  const payload = `admin:${Date.now()}`;
  const token = sign(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE * 1000,
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME);
}

export function checkPassword(plain) {
  return bcrypt.compareSync(plain, config.adminPasswordHash);
}

// Attaches req.isAdmin — does not reject.
export function sessionMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  req.isAdmin = !!verify(token);
  next();
}

// Rejects with 401 if not admin.
export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!verify(token)) return res.status(401).json({ error: 'unauthorised' });
  next();
}
