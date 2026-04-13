import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ABOUT_JS  = path.resolve(__dirname, '../../retro/content/about.js');

export function registerContentRoutes(app) {

  // GET /api/posts
  app.get('/api/posts', (req, res) => {
    const posts = getDb()
      .prepare(`SELECT id, slug, title, created_at, updated_at FROM blog_posts ORDER BY id DESC`)
      .all();
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
    const works = getDb()
      .prepare(`SELECT id, slug, title, tech, created_at, updated_at FROM works ORDER BY id DESC`)
      .all();
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
    const posts = getDb()
      .prepare(`SELECT * FROM micro_posts ORDER BY id DESC`)
      .all();
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
}
