import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import config from './config.js';
import { getDb, initSchema, sweepBin } from './db.js';
import { sessionMiddleware, userSessionMiddleware } from './auth.js';
import { registerBoardRoutes } from './routes/board.js';
import { registerLobbyRoutes } from './routes/lobby.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAdminStatic } from './routes/admin-static.js';
import { registerContentRoutes } from './routes/content.js';
import { registerUserAuthRoutes } from './routes/user-auth.js';
import { registerUserProfileRoutes } from './routes/user-profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXCLUDED = new Set([
  '/copland-os-legacy.html',
]);

const app = express();
app.use(express.json());
app.use(cookieParser());

// Trust Cloudflare's forwarded IP for rate limiting
app.set('trust proxy', 1);

// Session middleware must run before any route that inspects req.user
app.use(sessionMiddleware);
app.use(userSessionMiddleware);

// Block Reference/, legacy files, and direct access to admin/ source files
app.use((req, res, next) => {
  if (req.path.startsWith('/Reference/') || req.path.startsWith('/admin/') || req.path.startsWith('/server/') || req.path.startsWith('/deploy/') || EXCLUDED.has(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Root → entry point
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'copland-os.html')));

// Direct retro page URLs
app.get('/blog',      (req, res) => res.sendFile(path.join(ROOT, 'retro/blog.html')));
app.get('/works',     (req, res) => res.sendFile(path.join(ROOT, 'retro/portfolio.html')));
app.get('/micro',     (req, res) => res.sendFile(path.join(ROOT, 'retro/micro.html')));
app.get('/about',     (req, res) => res.sendFile(path.join(ROOT, 'retro/about.html')));
app.get('/links',     (req, res) => res.sendFile(path.join(ROOT, 'retro/links.html')));

// User-facing pages
app.get('/login',     (req, res) => res.sendFile(path.join(ROOT, 'retro/login.html')));
app.get('/invite/:token', (req, res) => res.sendFile(path.join(ROOT, 'retro/invite.html')));
app.get('/me',        (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(ROOT, 'retro/me.html'));
});
app.get('/members',   (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(ROOT, 'retro/members.html'));
});
app.get('/u/:username', (req, res) => res.sendFile(path.join(ROOT, 'retro/profile.html')));

// Admin panel — must be registered before clean-URL and static middleware so
// the secret path is matched first and /admin is never served directly.
registerAdminStatic(app, config.adminPath);
registerAdminRoutes(app);

// Board and lobby — serve index.html from their subdirectory
app.get('/board',     (req, res) => res.sendFile(path.join(ROOT, 'board/index.html')));
app.get('/lobby',     (req, res) => res.sendFile(path.join(ROOT, 'lobby/index.html')));

// Clean URLs — /foo serves /foo.html, /foo/bar serves /foo/bar.html
// Skips paths that already have an extension, API routes, and WS upgrades.
app.use((req, res, next) => {
  if (req.path.includes('.') || req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(ROOT, req.path + '.html'), err => {
    if (err) next();
  });
});

// Static files — directory indexes disabled so /admin never serves admin/index.html directly.
app.use(express.static(ROOT, { index: false }));

// Public API routes
registerContentRoutes(app);
registerBoardRoutes(app);
registerUserAuthRoutes(app);
registerUserProfileRoutes(app);

// HTTP server (WebSocket shares it)
const server = http.createServer(app);

// WebSocket server — only handles /ws/lobby upgrades
const wss = new WebSocketServer({ noServer: true });
registerLobbyRoutes(app, wss);

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws/lobby') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

// Graceful shutdown — finish in-flight requests, then close DB and exit
const SHUTDOWN_TIMEOUT_MS = 5000;

function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  const timer = setTimeout(() => {
    console.error('shutdown timeout — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  server.close(() => {
    try { getDb().close(); } catch {}
    console.log('shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Initialise DB schema, sweep expired bin rows, then start listening
initSchema();
sweepBin();
server.listen(config.port, () => {
  console.log(`wired server listening on :${config.port}`);
});
