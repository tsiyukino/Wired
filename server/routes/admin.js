import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getDb } from '../db.js';
import config from '../config.js';
import { checkPassword, createSession, clearSession, requireAdmin } from '../auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '../../retro/content/posts');

// Multer — accept only .md files, store on disk in retro/content/posts/
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, POSTS_DIR),
    filename: (_req, file, cb) => cb(null, file.originalname),
  }),
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.md')) cb(null, true);
    else cb(new Error('only .md files are accepted'));
  },
  limits: { fileSize: 1024 * 1024 }, // 1 MB
});

function isoNow() {
  return new Date().toISOString();
}

function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + config.binTtlDays);
  return d.toISOString();
}

// Derive a slug from a filename: strip .md, replace non-alphanumeric with hyphens
function slugify(filename) {
  return filename
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract the first H1 from markdown as the title, fallback to slug
function extractTitle(body, slug) {
  const m = body.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : slug;
}

export function registerAdminRoutes(app) {

  // POST /api/admin/login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body ?? {};
    if (!password || !checkPassword(password)) {
      return res.status(401).json({ error: 'invalid password' });
    }
    createSession(res);
    res.json({ ok: true });
  });

  // POST /api/admin/logout
  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  // --- blog posts ---

  // GET /api/admin/posts
  app.get('/api/admin/posts', requireAdmin, (req, res) => {
    const posts = getDb()
      .prepare(`SELECT id, slug, filename, title, created_at, updated_at FROM blog_posts ORDER BY id DESC`)
      .all();
    res.json({ posts });
  });

  // POST /api/admin/posts — upload a .md file
  app.post('/api/admin/posts', requireAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'no file uploaded' });

      let body;
      try {
        body = readFileSync(req.file.path, 'utf8');
      } catch (e) {
        return res.status(500).json({ error: 'failed to read uploaded file' });
      }

      const slug = slugify(req.file.originalname);
      const title = extractTitle(body, slug);
      const now = isoNow();
      const db = getDb();

      // Upsert: if slug exists, update body and timestamp
      const existing = db.prepare(`SELECT id FROM blog_posts WHERE slug = ?`).get(slug);
      if (existing) {
        db.prepare(`UPDATE blog_posts SET body = ?, filename = ?, title = ?, updated_at = ? WHERE slug = ?`)
          .run(body, req.file.originalname, title, now, slug);
      } else {
        db.prepare(`INSERT INTO blog_posts (slug, filename, title, body, created_at, updated_at) VALUES (?,?,?,?,?,?)`)
          .run(slug, req.file.originalname, title, body, now, now);
      }

      const post = db.prepare(`SELECT * FROM blog_posts WHERE slug = ?`).get(slug);
      res.status(existing ? 200 : 201).json({ post });
    });
  });

  // DELETE /api/admin/posts/:id
  app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const post = db.prepare(`SELECT * FROM blog_posts WHERE id = ?`).get(req.params.id);
    if (!post) return res.status(404).json({ error: 'not found' });
    db.prepare(`DELETE FROM blog_posts WHERE id = ?`).run(post.id);
    res.json({ ok: true });
  });

  // --- board moderation ---

  // DELETE /api/admin/threads/:id — move thread + replies to bin
  app.delete('/api/admin/threads/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const thread = db.prepare(`SELECT * FROM threads WHERE id = ?`).get(req.params.id);
    if (!thread) return res.status(404).json({ error: 'not found' });

    const replies = db.prepare(`SELECT * FROM replies WHERE thread_id = ?`).all(thread.id);
    const now = isoNow();
    const exp = expiresAt();

    const insertBin = db.prepare(`
      INSERT INTO bin (kind, original_id, no, time, name, subject, body, thread_no, deleted_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertBin.run('thread', thread.id, thread.no, thread.time, thread.name, thread.subject ?? null, thread.body, null, now, exp);
      for (const r of replies) {
        insertBin.run('reply', r.id, r.no, r.time, r.name, null, r.body, thread.no, now, exp);
      }
      db.prepare(`DELETE FROM replies WHERE thread_id = ?`).run(thread.id);
      db.prepare(`DELETE FROM threads WHERE id = ?`).run(thread.id);
    })();

    res.json({ ok: true });
  });

  // DELETE /api/admin/replies/:id — move single reply to bin
  app.delete('/api/admin/replies/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const reply = db.prepare(`SELECT r.*, t.no AS thread_no FROM replies r JOIN threads t ON t.id = r.thread_id WHERE r.id = ?`).get(req.params.id);
    if (!reply) return res.status(404).json({ error: 'not found' });

    const now = isoNow();
    db.transaction(() => {
      db.prepare(`
        INSERT INTO bin (kind, original_id, no, time, name, subject, body, thread_no, deleted_at, expires_at)
        VALUES ('reply', ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      `).run(reply.id, reply.no, reply.time, reply.name, reply.body, reply.thread_no, now, expiresAt());
      db.prepare(`DELETE FROM replies WHERE id = ?`).run(reply.id);
    })();

    res.json({ ok: true });
  });

  // GET /api/admin/bin
  app.get('/api/admin/bin', requireAdmin, (req, res) => {
    const rows = getDb().prepare(`SELECT * FROM bin ORDER BY deleted_at DESC`).all();
    res.json({ bin: rows });
  });

  // POST /api/admin/bin/:id/restore
  app.post('/api/admin/bin/:id/restore', requireAdmin, (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM bin WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });

    db.transaction(() => {
      if (row.kind === 'thread') {
        db.prepare(`
          INSERT INTO threads (no, time, name, subject, body, pinned)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(row.no, row.time, row.name, row.subject ?? null, row.body);
      } else {
        // Find parent thread by no
        const thread = db.prepare(`SELECT id FROM threads WHERE no = ?`).get(row.thread_no);
        if (!thread) throw new Error('parent thread not found — restore the thread first');
        db.prepare(`
          INSERT INTO replies (thread_id, no, time, name, body)
          VALUES (?, ?, ?, ?, ?)
        `).run(thread.id, row.no, row.time, row.name, row.body);
      }
      db.prepare(`DELETE FROM bin WHERE id = ?`).run(row.id);
    })();

    res.json({ ok: true });
  });

  // DELETE /api/admin/bin/:id — permanent deletion
  app.delete('/api/admin/bin/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT id FROM bin WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    db.prepare(`DELETE FROM bin WHERE id = ?`).run(row.id);
    res.json({ ok: true });
  });

  // --- lobby moderation ---

  // GET /api/admin/lobby?offset=0&limit=50
  app.get('/api/admin/lobby', requireAdmin, (req, res) => {
    const limit  = Math.min(parseInt(req.query.limit  ?? '50', 10), 200);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const rows = getDb()
      .prepare(`SELECT * FROM lobby_messages ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(limit, offset);
    res.json({ messages: rows });
  });

  // DELETE /api/admin/lobby/:id — permanent
  app.delete('/api/admin/lobby/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT id FROM lobby_messages WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    db.prepare(`DELETE FROM lobby_messages WHERE id = ?`).run(row.id);
    res.json({ ok: true });
  });
}
