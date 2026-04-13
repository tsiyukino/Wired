// Session auth — signed cookies, no DB state.
// Admin and user sessions use separate cookie names.
// Signature: HMAC-SHA256 over the payload using SESSION_SECRET.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config from './config.js';
import { getDb } from './db.js';

const ADMIN_COOKIE  = 'wsession';
const USER_COOKIE   = 'usession';
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
  try {
    if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return payload;
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: COOKIE_MAX_AGE * 1000,
};

// --- admin auth ---

export function createSession(res) {
  const token = sign(`admin:${Date.now()}`);
  res.cookie(ADMIN_COOKIE, token, COOKIE_OPTS);
}

export function clearSession(res) {
  res.clearCookie(ADMIN_COOKIE);
}

export function checkPassword(plain) {
  return bcrypt.compareSync(plain, config.adminPasswordHash);
}

// Attaches req.isAdmin — does not reject.
export function sessionMiddleware(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE];
  req.isAdmin = !!verify(token);
  next();
}

// Rejects with 401 if not admin.
export function requireAdmin(req, res, next) {
  if (!verify(req.cookies?.[ADMIN_COOKIE])) return res.status(401).json({ error: 'unauthorised' });
  next();
}

// --- user auth ---

// Encodes user id into the cookie payload.
export function createUserSession(res, userId) {
  const token = sign(`user:${userId}:${Date.now()}`);
  res.cookie(USER_COOKIE, token, COOKIE_OPTS);
}

export function clearUserSession(res) {
  res.clearCookie(USER_COOKIE);
}

// Attaches req.user (full DB row) or null — does not reject.
export function userSessionMiddleware(req, res, next) {
  const token = req.cookies?.[USER_COOKIE];
  const payload = verify(token);
  if (!payload) { req.user = null; return next(); }
  const m = payload.match(/^user:(\d+):/);
  if (!m) { req.user = null; return next(); }
  const user = getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(Number(m[1]));
  // Treat banned/deleted accounts as logged out
  req.user = (user && user.status === 'active') ? user : null;
  next();
}

// Rejects with 401 if no active user session.
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'login required' });
  next();
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}

export function checkUserPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
