import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PRESETS_FILE = join(__dirname, '..', 'presets.json');

function loadPresets() {
  try {
    if (existsSync(PRESETS_FILE)) return JSON.parse(readFileSync(PRESETS_FILE, 'utf8'));
  } catch {}
  return {};
}

function savePresets(presets) {
  writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
}

export function createWSHandler(httpServer) {
  // Use noServer mode so we only intercept upgrades to /ws,
  // leaving Vite's HMR WebSocket untouched.
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
    // Don't call socket.destroy() — let Vite handle its own upgrades
  });

  const seed = (Math.random() * 0x7fffffff) | 0;
  let nextId = 1;
  const clients = new Map(); // ws → { id, x, y, z, yaw }
  let currentParams = null;
  let userPresets = loadPresets();

  function broadcast(msg, exclude) {
    const data = JSON.stringify(msg);
    for (const [ws] of clients) {
      if (ws !== exclude && ws.readyState === 1) ws.send(data);
    }
  }

  wss.on('connection', (ws) => {
    const id = nextId++;
    clients.set(ws, { id, x: 0, y: 3, z: 0, yaw: 0 });

    // Build players snapshot (everyone except self)
    const players = {};
    for (const [, info] of clients) {
      if (info.id !== id) {
        players[info.id] = { x: info.x, y: info.y, z: info.z, yaw: info.yaw };
      }
    }

    // Send init (includes saved presets)
    ws.send(JSON.stringify({
      type: 'init',
      id,
      seed,
      params: currentParams,
      players,
      presets: userPresets,
    }));

    // Notify others
    broadcast({ type: 'player-join', id }, ws);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'player-move') {
        const info = clients.get(ws);
        if (!info) return;
        info.x = msg.x;
        info.y = msg.y;
        info.z = msg.z;
        info.yaw = msg.yaw;
        broadcast({ type: 'player-move', id: info.id, x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw }, ws);
      }

      if (msg.type === 'params-update') {
        currentParams = msg.params;
        broadcast({ type: 'params-update', params: msg.params }, ws);
      }

      if (msg.type === 'preset-save' && msg.name && msg.data) {
        const name = String(msg.name).slice(0, 50);
        userPresets[name] = msg.data;
        savePresets(userPresets);
        broadcast({ type: 'preset-save', name, data: msg.data }, ws);
      }

      if (msg.type === 'preset-delete' && msg.name) {
        const name = String(msg.name);
        delete userPresets[name];
        savePresets(userPresets);
        broadcast({ type: 'preset-delete', name }, ws);
      }

      if (msg.type === 'chat') {
        const info = clients.get(ws);
        if (!info) return;
        const text = String(msg.text || '').slice(0, 100);
        if (!text) return;
        broadcast({ type: 'chat', id: info.id, text });
      }
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      clients.delete(ws);
      if (info) broadcast({ type: 'player-leave', id: info.id });
    });
  });

  console.log(`[ws] WebSocket server ready on /ws (seed: ${seed})`);
  return wss;
}
