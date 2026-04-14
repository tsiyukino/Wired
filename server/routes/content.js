import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ABOUT_JS  = path.resolve(__dirname, '../../retro/content/about.js');

export function registerContentRoutes(app) {

  // GET /api/posts
  app.get('/api/posts', (req, res) => {
    const cutoff = new Date(Date.now() - config.newTagDays * 86400000).toISOString();
    const posts = getDb()
      .prepare(`SELECT id, slug, title, pinned, created_at, updated_at,
                  (created_at >= ?) AS is_new
                FROM blog_posts ORDER BY pinned DESC, id DESC`)
      .all(cutoff);
    res.json({ posts });
  });

  // GET /api/posts/:slug
  app.get('/api/posts/:slug', (req, res) => {
    const post = getDb()
      .prepare(`SELECT * FROM blog_posts WHERE slug = ?`)
      .get(req.params.slug);
    if (!post) return res.status(404).json({ error: 'not found' });
    res.json({ post });
  });

  // GET /api/works
  app.get('/api/works', (req, res) => {
    const cutoff = new Date(Date.now() - config.newTagDays * 86400000).toISOString();
    const works = getDb()
      .prepare(`SELECT id, slug, title, tech, pinned, created_at, updated_at,
                  (created_at >= ?) AS is_new
                FROM works ORDER BY pinned DESC, id DESC`)
      .all(cutoff);
    res.json({ works });
  });

  // GET /api/works/:slug
  app.get('/api/works/:slug', (req, res) => {
    const work = getDb()
      .prepare(`SELECT * FROM works WHERE slug = ?`)
      .get(req.params.slug);
    if (!work) return res.status(404).json({ error: 'not found' });
    res.json({ work });
  });

  // GET /api/micro
  app.get('/api/micro', (req, res) => {
    const cutoff = new Date(Date.now() - config.newTagDays * 86400000).toISOString();
    const posts = getDb()
      .prepare(`SELECT id, text, pinned, created_at,
                  (created_at >= ?) AS is_new
                FROM micro_posts ORDER BY pinned DESC, id DESC`)
      .all(cutoff);
    res.json({ posts });
  });

  // GET /api/about — returns the raw about.js file content as a string
  app.get('/api/about', (req, res) => {
    try {
      const content = readFileSync(ABOUT_JS, 'utf8');
      res.json({ content });
    } catch (e) {
      res.status(500).json({ error: 'could not read about.js' });
    }
  });

  // GET /api/links
  app.get('/api/links', (req, res) => {
    const db     = getDb();
    const links  = db.prepare(`SELECT * FROM links ORDER BY kind, sort_order, id`).all();
    const button = db.prepare(`SELECT * FROM link_button LIMIT 1`).get() ?? null;
    res.json({ links, button });
  });

  // GET /api/visitors — read current count without incrementing
  app.get('/api/visitors', (req, res) => {
    const row = getDb().prepare(`SELECT visitor_count FROM site_stats WHERE id = 1`).get();
    res.json({ count: row ? row.visitor_count : 0 });
  });

  // POST /api/visitors/hit — increment count, return new value
  app.post('/api/visitors/hit', (req, res) => {
    const db = getDb();
    db.prepare(`UPDATE site_stats SET visitor_count = visitor_count + 1 WHERE id = 1`).run();
    const row = db.prepare(`SELECT visitor_count FROM site_stats WHERE id = 1`).get();
    res.json({ count: row.visitor_count });
  });
}
