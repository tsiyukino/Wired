import { getDb } from '../db.js';
import config from '../config.js';

// In-memory rate-limit map: ip → last post timestamp (ms)
const lastPost = new Map();

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16);
}

function nextNo() {
  const db = getDb();
  const row = db.prepare(`
    SELECT MAX(no) AS max FROM (
      SELECT no FROM threads UNION ALL SELECT no FROM replies
    )
  `).get();
  return (row.max ?? 1000) + 1;
}

function checkCooldown(ip) {
  const last = lastPost.get(ip) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < config.postCooldownMs) {
    return Math.ceil((config.postCooldownMs - elapsed) / 1000);
  }
  return null;
}

export function registerBoardRoutes(app) {
  // GET /api/board/threads — list threads, reverse-chronological
  app.get('/api/board/threads', (req, res) => {
    const db = getDb();
    const threads = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) AS replyCount
      FROM threads t
      ORDER BY t.pinned DESC, t.id DESC
      LIMIT ?
    `).all(config.boardMaxThreads);
    res.json({ threads });
  });

  // GET /api/board/threads/:id — thread + replies
  app.get('/api/board/threads/:id', (req, res) => {
    const db = getDb();
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
    if (!thread) return res.status(404).json({ error: 'not found' });
    const replies = db.prepare('SELECT * FROM replies WHERE thread_id = ? ORDER BY id').all(thread.id);
    res.json({ thread, replies });
  });

  // POST /api/board/threads — create OP
  app.post('/api/board/threads', (req, res) => {
    const ip = req.ip;
    const wait = checkCooldown(ip);
    if (wait) return res.status(429).json({ error: `wait ${wait}s before posting again` });

    const { name, subject, body } = req.body ?? {};
    if (!body?.trim()) return res.status(400).json({ error: 'body is required' });

    const db = getDb();
    const no = nextNo();
    const info = db.prepare(`
      INSERT INTO threads (no, time, name, subject, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(no, now(), (name?.trim() || 'Anonymous'), subject?.trim() || null, body.trim());

    lastPost.set(ip, Date.now());
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ thread });
  });

  // POST /api/board/threads/:id/reply — append reply
  app.post('/api/board/threads/:id/reply', (req, res) => {
    const ip = req.ip;
    const wait = checkCooldown(ip);
    if (wait) return res.status(429).json({ error: `wait ${wait}s before posting again` });

    const db = getDb();
    const thread = db.prepare('SELECT id FROM threads WHERE id = ?').get(req.params.id);
    if (!thread) return res.status(404).json({ error: 'thread not found' });

    const { name, body } = req.body ?? {};
    if (!body?.trim()) return res.status(400).json({ error: 'body is required' });

    const no = nextNo();
    const info = db.prepare(`
      INSERT INTO replies (thread_id, no, time, name, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(thread.id, no, now(), (name?.trim() || 'Anonymous'), body.trim());

    lastPost.set(ip, Date.now());
    const reply = db.prepare('SELECT * FROM replies WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ reply });
  });
}
