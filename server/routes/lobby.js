import { getDb } from '../db.js';
import config from '../config.js';

const ANON_COLORS = [
  '#7a9ec2', '#6a9a5a', '#9a6a9a', '#9a8a4a',
  '#6a8a9a', '#9a6a6a', '#7a8a6a', '#8a7a9a',
];

// Active WebSocket connections: ws → { color }
const clients = new Map();

function now() {
  return new Date().toISOString().replace('T', ' ').slice(11, 16);
}

function assignColor() {
  const used = new Set([...clients.values()].map(c => c.color));
  return ANON_COLORS.find(c => !used.has(c)) ?? ANON_COLORS[Math.floor(Math.random() * ANON_COLORS.length)];
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
    const color = assignColor();
    clients.set(ws, { color });

    ws.on('message', (data) => {
      let parsed;
      try { parsed = JSON.parse(data); } catch { return; }

      const text = parsed.text?.trim();
      if (!text) return;

      const msg = {
        id:    Date.now(),
        time:  now(),
        name:  parsed.name?.trim() || 'Anonymous',
        color,
        text,
      };

      persistMessage(msg);
      broadcast(msg);
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => { clients.delete(ws); ws.terminate(); });
  });
}
