# Backend Architecture

**Date:** 2026-04-12
**Status:** decided

## Context

The project is a personal site (blog + anonymous imageboard + anonymous chat lobby) self-hosted behind Cloudflare. The board and lobby currently run on client-side mock data. This decision settles the server stack before any implementation work begins.

## Decisions

### Runtime: Node.js

Node with ES modules. Reasons: `better-sqlite3` is the most mature synchronous SQLite binding available, `ws` is battle-tested for WebSocket servers, and the ecosystem is widest for self-hosted servers. Deno would work but offers no meaningful advantage here.

### Persistence: SQLite via better-sqlite3

Single file on the server host. Appropriate for a personal site with low concurrent write volume. SQLite serializes writes, which eliminates the most common class of race conditions without extra work. The tradeoff is that horizontal scaling requires a migration — acceptable for this use case.

Schema (created by `db.js`):

```sql
CREATE TABLE IF NOT EXISTS threads (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  no      INTEGER UNIQUE NOT NULL,
  time    TEXT NOT NULL,
  name    TEXT NOT NULL DEFAULT 'Anonymous',
  subject TEXT,
  body    TEXT NOT NULL,
  pinned  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS replies (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id),
  no        INTEGER UNIQUE NOT NULL,
  time      TEXT NOT NULL,
  name      TEXT NOT NULL DEFAULT 'Anonymous',
  body      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lobby_messages (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  time  TEXT NOT NULL,
  name  TEXT NOT NULL DEFAULT 'Anonymous',
  color TEXT NOT NULL,
  text  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bin (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL CHECK(kind IN ('thread','reply')),
  original_id INTEGER NOT NULL,
  no          INTEGER NOT NULL,
  time        TEXT NOT NULL,
  name        TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  thread_no   INTEGER,
  deleted_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL     -- purged by sweepBin() on server start
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT UNIQUE NOT NULL,
  filename   TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS works (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT UNIQUE NOT NULL,
  filename   TEXT NOT NULL,
  title      TEXT NOT NULL,
  tech       TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS micro_posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL CHECK(kind IN ('friend','webring','resource')),
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS link_button (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT NOT NULL DEFAULT 'WIRED',
  url        TEXT NOT NULL DEFAULT '/',
  image_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_stats (
  id            INTEGER PRIMARY KEY CHECK(id = 1),
  visitor_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token      TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_by    INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  avatar_path   TEXT NOT NULL DEFAULT '',
  site_url      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','banned')),
  invite_id     INTEGER REFERENCES invites(id),
  created_at    TEXT NOT NULL
);
```

`blog_posts`, `works`, and `micro_posts` have a `pinned` column (manual, admin-toggled) but no `is_new` column — NEW status is computed at query time as `created_at >= now - NEW_TAG_DAYS days` (default 3, configurable via env var).

### Real-time: WebSocket via ws

Lobby uses a WebSocket connection at `/ws/lobby`. On connect the server assigns a color from the palette (server-side, stable for the session — client does not pick its own color). On disconnect the connection is removed from the broadcast set. HTTP long-polling is not used.

### API shape

REST over HTTP for board (low-frequency, cacheable reads). WebSocket for lobby (real-time broadcast). Static files served by the same Node process in development; Cloudflare caches them in production.

```
-- Public content
GET  /api/posts                    blog posts, pinned first, newest first; is_new computed
GET  /api/posts/:slug              single post with body
GET  /api/works                    portfolio works, pinned first, newest first; is_new computed
GET  /api/works/:slug              single work with body
GET  /api/micro                    micro-posts, pinned first, newest first; is_new computed
GET  /api/about                    raw about.js file content (executed client-side)
GET  /api/links                    links + 88x31 button
GET  /api/visitors                 current visitor count (no increment)
POST /api/visitors/hit             increment visitor count, return new value

-- Board
GET  /api/board/threads            list threads, reverse-chronological
GET  /api/board/threads/:id        thread + replies
POST /api/board/threads            create thread
POST /api/board/threads/:id/reply  append reply

-- Lobby
GET  /api/lobby/history            last N messages
WS   /ws/lobby                     bidirectional chat

-- Admin (require valid session cookie)
POST   /api/admin/login
POST   /api/admin/logout

GET    /api/admin/posts
POST   /api/admin/posts              multipart .md upload; upsert by slug
PATCH  /api/admin/posts/:id          { pinned }
DELETE /api/admin/posts/:id

GET    /api/admin/works
POST   /api/admin/works              multipart .md upload; upsert by slug
PATCH  /api/admin/works/:id          { pinned }
DELETE /api/admin/works/:id

GET    /api/admin/micro
POST   /api/admin/micro              { text }
PATCH  /api/admin/micro/:id          { pinned }
DELETE /api/admin/micro/:id

GET    /api/admin/about
POST   /api/admin/about              { content } — overwrites about.js

GET    /api/admin/links
POST   /api/admin/links              { kind, label, url, description }
DELETE /api/admin/links/:id

GET    /api/admin/button
POST   /api/admin/button             multipart image upload + { label, url }
DELETE /api/admin/button

GET    /api/admin/bin
POST   /api/admin/bin/:id/restore
DELETE /api/admin/bin/:id            permanent
DELETE /api/admin/threads/:id        move thread + replies to bin
DELETE /api/admin/replies/:id        move reply to bin

GET    /api/admin/lobby?offset&limit
DELETE /api/admin/lobby/:id          permanent

GET    /api/admin/invites
POST   /api/admin/invites            generate 24h invite token
DELETE /api/admin/invites/:id        revoke unused invite

GET    /api/admin/users
POST   /api/admin/users/:id/approve
POST   /api/admin/users/:id/ban
DELETE /api/admin/users/:id          permanent
```

### Admin auth

Single-admin. Session is a stateless signed cookie (HMAC-SHA256 over a timestamp payload, keyed by `SESSION_SECRET`). Flags: `HttpOnly`, `Secure`, `SameSite=Strict`. Password stored as a bcrypt hash in `ADMIN_PASSWORD_HASH` env var. Chosen over JWT-in-localStorage because `HttpOnly` cookies are not readable by JS, removing the XSS theft vector.

### Static file serving

Node serves static files from the project root. Behind Cloudflare this is fine — static assets are cached at the edge. In development the Node process handles everything with no separate server needed.

### Rate limiting

In-memory map keyed by IP, tracking last-post timestamp. Lost on server restart — acceptable for a personal site. Board enforces a configurable cooldown between posts from the same IP. Lobby does not rate-limit (chat messages are ephemeral and the lobby is low-traffic).

## Consequences

- `server/` directory contains all backend source; nothing outside it runs on the server.
- Blog posts, works, and micro-posts are stored in SQLite and served via API. The `about.js` file is the exception — it is read from disk and executed client-side.
- Scaling beyond one server instance requires migrating away from SQLite. Not a current concern.
- If Deno becomes preferable later, the module shape is unchanged; only the DB and WS libraries swap.
