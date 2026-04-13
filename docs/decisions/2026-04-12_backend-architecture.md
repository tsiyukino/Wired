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
CREATE TABLE IF NOT EXISTS threads ( ... );
CREATE TABLE IF NOT EXISTS replies ( ... );
CREATE TABLE IF NOT EXISTS lobby_messages ( ... );

-- Added Stage 5 (admin panel):
CREATE TABLE IF NOT EXISTS bin (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL CHECK(kind IN ('thread','reply')),
  original_id INTEGER NOT NULL,
  no          INTEGER NOT NULL,
  time        TEXT NOT NULL,
  name        TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  thread_no   INTEGER,          -- non-null for replies; references parent thread.no
  deleted_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL     -- purged by sweepBin() on server start
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT UNIQUE NOT NULL,
  filename   TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Real-time: WebSocket via ws

Lobby uses a WebSocket connection at `/ws/lobby`. On connect the server assigns a color from the palette (server-side, stable for the session — client does not pick its own color). On disconnect the connection is removed from the broadcast set. HTTP long-polling is not used.

### API shape

REST over HTTP for board (low-frequency, cacheable reads). WebSocket for lobby (real-time broadcast). Static files served by the same Node process in development; Cloudflare caches them in production.

```
GET  /api/board/threads            list threads, reverse-chronological
GET  /api/board/threads/:id        thread + replies
POST /api/board/threads            create thread (OP post)
POST /api/board/threads/:id/reply  append reply

GET  /api/lobby/history            last N messages (seed for new connections)
WS   /ws/lobby                     bidirectional chat

-- Admin (Stage 5) — all require a valid session cookie:
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/posts
POST   /api/admin/posts              (multipart, .md upload)
DELETE /api/admin/posts/:id
GET    /api/admin/bin
POST   /api/admin/bin/:id/restore
DELETE /api/admin/bin/:id
DELETE /api/admin/threads/:id        (move to bin)
DELETE /api/admin/replies/:id        (move to bin)
GET    /api/admin/lobby
DELETE /api/admin/lobby/:id          (permanent)
```

### Admin auth

Single-admin. Session is a stateless signed cookie (HMAC-SHA256 over a timestamp payload, keyed by `SESSION_SECRET`). Flags: `HttpOnly`, `Secure`, `SameSite=Strict`. Password stored as a bcrypt hash in `ADMIN_PASSWORD_HASH` env var. Chosen over JWT-in-localStorage because `HttpOnly` cookies are not readable by JS, removing the XSS theft vector.

### Static file serving

Node serves static files from the project root. Behind Cloudflare this is fine — static assets are cached at the edge. In development the Node process handles everything with no separate server needed.

### Rate limiting

In-memory map keyed by IP, tracking last-post timestamp. Lost on server restart — acceptable for a personal site. Board enforces a configurable cooldown between posts from the same IP. Lobby does not rate-limit (chat messages are ephemeral and the lobby is low-traffic).

## Consequences

- `server/` directory contains all backend source; nothing outside it runs on the server.
- Blog content (posts, works, about) remains static JS/MD files — no database involvement.
- Scaling beyond one server instance requires migrating away from SQLite. Not a current concern.
- If Deno becomes preferable later, the module shape is unchanged; only the DB and WS libraries swap.
