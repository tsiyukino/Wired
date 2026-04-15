import { getDb } from '../db.js';
import config from '../config.js';

const ANON_COLORS = [
  '#7a9ec2', '#6a9a5a', '#9a6a9a', '#9a8a4a',
  '#6a8a9a', '#9a6a6a', '#7a8a6a', '#8a7a9a',
];

const ANON_ADJECTIVES = ['quiet','static','signal','lost','echo','null','void','relay','ghost','proxy'];
const ANON_NOUNS      = ['node','wire','pulse','gate','packet','frame','layer','socket','port','trace'];

// Active WebSocket connections: ws → { handle }
const clients = new Map();

function now() {
  return new Date().toISOString().replace('T', ' ').slice(11, 16);
}

// Random color, independent of identity
function randomColor() {
  return ANON_COLORS[Math.floor(Math.random() * ANON_COLORS.length)];
}

// Session handle: Anon#adjective-noun, e.g. "Anon#ghost-port"
function randomHandle() {
  const adj  = ANON_ADJECTIVES[Math.floor(Math.random() * ANON_ADJECTIVES.length)];
  const noun = ANON_NOUNS[Math.floor(Math.random() * ANON_NOUNS.length)];
  return `Anon#${adj}-${noun}`;
}

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function persistMessage(msg) {
  const db = getDb();
  // Keep only the last lobbyMaxHistory messages
  db.prepare('INSERT INTO lobby_messages (time, name, color, text) VALUES (?, ?, ?, ?)').run(
    msg.time, msg.name, msg.color, msg.text
  );
  const count = db.prepare('SELECT COUNT(*) AS n FROM lobby_messages').get().n;
  if (count > config.lobbyMaxHistory) {
    db.prepare(`
      DELETE FROM lobby_messages WHERE id IN (
        SELECT id FROM lobby_messages ORDER BY id ASC LIMIT ?
      )
    `).run(count - config.lobbyMaxHistory);
  }
}

export function registerLobbyRoutes(app, wss) {
  // GET /api/lobby/history — seed messages for new connections
  app.get('/api/lobby/history', (req, res) => {
    const db = getDb();
    const messages = db.prepare(`
      SELECT * FROM lobby_messages ORDER BY id DESC LIMIT ?
    `).all(config.lobbyMaxHistory).reverse();
    res.json({ messages });
  });

  // WebSocket upgrade at /ws/lobby
  wss.on('connection', (ws) => {
    const handle = randomHandle();
    clients.set(ws, { handle });

    ws.on('message', (data) => {
      let parsed;
      try { parsed = JSON.parse(data); } catch { return; }

      const text = parsed.text?.trim();
      if (!text) return;

      const msg = {
        id:    Date.now(),
        time:  now(),
        name:  handle,
        color: randomColor(),
        text,
      };

      persistMessage(msg);
      broadcast(msg);
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => { clients.delete(ws); ws.terminate(); });
  });
}
