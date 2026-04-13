import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import config from './config.js';
import { getDb, initSchema, sweepBin } from './db.js';
import { sessionMiddleware } from './auth.js';
import { registerBoardRoutes } from './routes/board.js';
import { registerLobbyRoutes } from './routes/lobby.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAdminStatic } from './routes/admin-static.js';

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

// Block Reference/ and legacy files before static middleware sees them
app.use((req, res, next) => {
  if (req.path.startsWith('/Reference/') || EXCLUDED.has(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Root → entry point
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'copland-os.html')));

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

// Static files — serve the project root (minus the excluded paths above)
app.use(express.static(ROOT));

// Session middleware — attaches req.isAdmin on every request
app.use(sessionMiddleware);

// Admin panel — secret path serves the SPA; API routes follow
registerAdminStatic(app, config.adminPath);
registerAdminRoutes(app);

// Public API routes
registerBoardRoutes(app);

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
