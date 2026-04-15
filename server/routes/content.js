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

  // GET /feed  (also /feed.xml) — Atom 1.0 feed for blog posts
  function atomFeed(req, res) {
    const base  = `${req.protocol}://${req.get('host')}`;
    const posts = getDb()
      .prepare(`SELECT slug, title, body, created_at, updated_at FROM blog_posts ORDER BY id DESC LIMIT 20`)
      .all();

    const updated = posts.length ? posts[0].updated_at ?? posts[0].created_at : new Date().toISOString();

    const entries = posts.map(p => {
      const url     = `${base}/blog/${p.slug}`;
      const pubDate = p.created_at;
      const updDate = p.updated_at ?? p.created_at;
      // Plain-text summary: strip markdown-ish characters, truncate
      const summary = (p.body ?? '').replace(/[#*`>_~\[\]]/g, '').trim().slice(0, 280);
      return [
        `  <entry>`,
        `    <id>${url}</id>`,
        `    <title>${escapeXml(p.title)}</title>`,
        `    <link href="${url}"/>`,
        `    <published>${pubDate}</published>`,
        `    <updated>${updDate}</updated>`,
        `    <summary>${escapeXml(summary)}</summary>`,
        `  </entry>`,
      ].join('\n');
    }).join('\n');

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<feed xmlns="http://www.w3.org/2005/Atom">`,
      `  <id>${base}/feed</id>`,
      `  <title>wired — blog</title>`,
      `  <link href="${base}/blog"/>`,
      `  <link rel="self" href="${base}/feed"/>`,
      `  <updated>${updated}</updated>`,
      entries,
      `</feed>`,
    ].join('\n');

    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(xml);
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  app.get('/feed',     atomFeed);
  app.get('/feed.xml', atomFeed);

  // GET /api/search?q=<query> — full-text search over blog posts
  app.get('/api/search', (req, res) => {
    const q = (req.query.q ?? '').trim();
    if (!q) return res.json({ results: [] });

    try {
      const rows = getDb().prepare(`
        SELECT p.slug, p.title,
               snippet(blog_posts_fts, 1, '<mark>', '</mark>', '…', 24) AS snippet
        FROM blog_posts_fts
        JOIN blog_posts p ON p.id = blog_posts_fts.rowid
        WHERE blog_posts_fts MATCH ?
        ORDER BY rank
        LIMIT 20
      `).all(q);
      res.json({ results: rows });
    } catch {
      // MATCH syntax errors return 400 so the client can surface them cleanly
      res.status(400).json({ error: 'invalid search query' });
    }
  });

  // GET /sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    const db = getDb();

    const postSlugs = db.prepare(`SELECT slug, updated_at FROM blog_posts ORDER BY id DESC`).all();
    const workSlugs = db.prepare(`SELECT slug, updated_at FROM works ORDER BY id DESC`).all();

    const staticPages = [
      { loc: `${base}/`,       changefreq: 'weekly',  priority: '1.0' },
      { loc: `${base}/blog`,   changefreq: 'weekly',  priority: '0.9' },
      { loc: `${base}/works`,  changefreq: 'monthly', priority: '0.8' },
      { loc: `${base}/micro`,  changefreq: 'weekly',  priority: '0.7' },
      { loc: `${base}/about`,  changefreq: 'monthly', priority: '0.6' },
      { loc: `${base}/links`,  changefreq: 'monthly', priority: '0.5' },
    ];

    const postUrls = postSlugs.map(p => ({
      loc: `${base}/blog/${p.slug}`,
      lastmod: p.updated_at ? p.updated_at.slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: '0.7',
    }));

    const workUrls = workSlugs.map(w => ({
      loc: `${base}/works/${w.slug}`,
      lastmod: w.updated_at ? w.updated_at.slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: '0.6',
    }));

    const allUrls = [...staticPages, ...postUrls, ...workUrls];

    const urlTags = allUrls.map(u => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${u.loc}</loc>${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  });
}
