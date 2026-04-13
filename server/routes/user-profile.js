import path from 'path';
import { unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getDb } from '../db.js';
import { requireUser, hashPassword, checkUserPassword } from '../auth.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.resolve(__dirname, '../../retro/content/avatars');

const ALLOWED_IMAGE_EXTS = new Set(['.png', '.gif', '.jpg', '.jpeg', '.webp']);

const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar_${req.user.id}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXTS.has(ext)) cb(null, true);
    else cb(new Error('only image files are accepted (png, gif, jpg, webp)'));
  },
  limits: { fileSize: 512 * 1024 },
});

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

export function registerUserProfileRoutes(app) {

  // GET /api/user/:username — public profile
  app.get('/api/user/:username', (req, res) => {
    const user = getDb()
      .prepare(`SELECT id, username, display_name, bio, avatar_path, site_url, created_at FROM users WHERE username = ? AND status = 'active'`)
      .get(req.params.username.toLowerCase());
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ user });
  });

  // POST /api/user/me/profile — update own profile fields + optional avatar upload
  // Must be registered before the /:username wildcard above.
  app.post('/api/user/me/profile', requireUser, (req, res) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const db   = getDb();
      const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);

      const display_name = req.body?.display_name?.trim() || user.display_name;
      const bio          = req.body?.bio?.trim()          ?? user.bio;
      const site_url     = req.body?.site_url?.trim()     ?? user.site_url;

      let avatar_path = user.avatar_path;
      if (req.file) {
        // Remove old avatar if filename changed
        if (avatar_path && avatar_path !== req.file.filename) {
          try { unlinkSync(path.join(AVATAR_DIR, avatar_path)); } catch {}
        }
        avatar_path = req.file.filename;
      }

      db.prepare(`UPDATE users SET display_name=?, bio=?, site_url=?, avatar_path=? WHERE id=?`)
        .run(display_name, bio, site_url, avatar_path, user.id);

      const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
      res.json({ user: safeUser(updated) });
    });
  });

  // POST /api/user/me/password — change own password
  app.post('/api/user/me/password', requireUser, (req, res) => {
    const { current_password, new_password } = req.body ?? {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'new password must be at least 8 characters' });
    }
    const db   = getDb();
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
    if (!checkUserPassword(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(new_password), user.id);
    res.json({ ok: true });
  });
}
