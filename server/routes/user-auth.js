import { getDb } from '../db.js';
import {
  createUserSession, clearUserSession,
  checkUserPassword, hashPassword,
  requireUser,
} from '../auth.js';

function isoNow() { return new Date().toISOString(); }

// Strips password_hash before sending user data to client.
function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

export function registerUserAuthRoutes(app) {

  // GET /api/user/invite/:token — validate token (used by the invite page to preflight)
  app.get('/api/user/invite/:token', (req, res) => {
    const db     = getDb();
    const invite = db.prepare(`SELECT * FROM invites WHERE token = ?`).get(req.params.token);
    if (!invite)              return res.status(404).json({ error: 'invalid invite link' });
    if (invite.used_by)       return res.status(410).json({ error: 'invite already used' });
    if (invite.expires_at < isoNow()) return res.status(410).json({ error: 'invite has expired' });
    res.json({ ok: true });
  });

  // POST /api/user/redeem — create a pending account using an invite token
  app.post('/api/user/redeem', (req, res) => {
    const { token, username, display_name, password, bio, site_url } = req.body ?? {};
    if (!token)        return res.status(400).json({ error: 'token is required' });
    if (!username?.trim())     return res.status(400).json({ error: 'username is required' });
    if (!display_name?.trim()) return res.status(400).json({ error: 'display name is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

    const db     = getDb();
    const invite = db.prepare(`SELECT * FROM invites WHERE token = ?`).get(token);
    if (!invite)              return res.status(404).json({ error: 'invalid invite link' });
    if (invite.used_by)       return res.status(410).json({ error: 'invite already used' });
    if (invite.expires_at < isoNow()) return res.status(410).json({ error: 'invite has expired' });

    // Username: lowercase alphanumeric + underscores/hyphens only
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(clean)) {
      return res.status(400).json({ error: 'username must be 2–32 characters: letters, numbers, _ or -' });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(clean);
    if (existing) return res.status(409).json({ error: 'username already taken' });

    const hash = hashPassword(password);
    const now  = isoNow();

    try {
      const info = db.transaction(() => {
        const r = db.prepare(`
          INSERT INTO users (username, display_name, password_hash, bio, site_url, status, invite_id, created_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(clean, display_name.trim(), hash, (bio ?? '').trim(), (site_url ?? '').trim(), invite.id, now);
        db.prepare(`UPDATE invites SET used_by = ? WHERE id = ?`).run(r.lastInsertRowid, invite.id);
        return r;
      })();
      const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid);
      res.status(201).json({ user: safeUser(user) });
    } catch (e) {
      res.status(500).json({ error: 'could not create account' });
    }
  });

  // POST /api/user/login
  app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

    const db   = getDb();
    const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username.toLowerCase().trim());
    if (!user || !checkUserPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid username or password' });
    }
    if (user.status === 'pending') return res.status(403).json({ error: 'account pending approval' });
    if (user.status === 'banned')  return res.status(403).json({ error: 'account banned' });

    createUserSession(res, user.id);
    res.json({ user: safeUser(user) });
  });

  // POST /api/user/logout
  app.post('/api/user/logout', requireUser, (req, res) => {
    clearUserSession(res);
    res.json({ ok: true });
  });

  // GET /api/user/me — returns current user's own data
  app.get('/api/user/me', requireUser, (req, res) => {
    res.json({ user: safeUser(req.user) });
  });
}
