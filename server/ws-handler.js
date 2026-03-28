import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameState, addClient, removeClient, handleMessage } from './game-state.js';

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
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  const seed = (Math.random() * 0x7fffffff) | 0;
  const state = createGameState(seed);
  state.userPresets = loadPresets();

  // ws → clientId mapping
  const wsToId = new Map();

  function broadcast(msg, excludeWs) {
    const data = JSON.stringify(msg);
    for (const [ws, id] of wsToId) {
      if (ws !== excludeWs && ws.readyState === 1) ws.send(data);
    }
  }

  wss.on('connection', (ws) => {
    const result = addClient(state);
    const clientId = result.clientId;
    wsToId.set(ws, clientId);

    ws.send(JSON.stringify(result.initMessage));

    for (const msg of result.broadcasts) {
      broadcast(msg, ws);
    }

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      const { broadcasts } = handleMessage(state, clientId, msg);

      for (const b of broadcasts) {
        broadcast(b, ws);
      }

      // Persist preset changes to disk
      if (msg.type === 'preset-save' || msg.type === 'preset-delete') {
        savePresets(state.userPresets);
      }
    });

    ws.on('close', () => {
      wsToId.delete(ws);
      const { broadcasts } = removeClient(state, clientId);
      for (const b of broadcasts) {
        broadcast(b);
      }
    });
  });

  console.log(`[ws] WebSocket server ready on /ws (seed: ${seed})`);
  return wss;
}
