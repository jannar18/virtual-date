// Pure game-state logic — no WebSocket I/O

export function createGameState(seed) {
  return {
    seed,
    nextId: 1,
    clients: new Map(), // id → { x, y, z, yaw }
    currentParams: null,
    userPresets: {},
  };
}

export function addClient(state) {
  const clientId = state.nextId++;
  state.clients.set(clientId, { x: 0, y: 3, z: 0, yaw: 0 });

  const players = {};
  for (const [id, info] of state.clients) {
    if (id !== clientId) {
      players[id] = { x: info.x, y: info.y, z: info.z, yaw: info.yaw };
    }
  }

  const initMessage = {
    type: 'init',
    id: clientId,
    seed: state.seed,
    params: state.currentParams,
    players,
    presets: state.userPresets,
  };

  const broadcasts = [{ type: 'player-join', id: clientId }];

  return { state, clientId, initMessage, broadcasts };
}

export function removeClient(state, clientId) {
  state.clients.delete(clientId);
  const broadcasts = [{ type: 'player-leave', id: clientId }];
  return { state, broadcasts };
}

export function handleMessage(state, clientId, msg) {
  const broadcasts = [];

  if (msg.type === 'player-move') {
    const info = state.clients.get(clientId);
    if (!info) return { state, broadcasts };
    info.x = msg.x;
    info.y = msg.y;
    info.z = msg.z;
    info.yaw = msg.yaw;
    broadcasts.push({
      type: 'player-move', id: clientId,
      x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw,
    });
  }

  if (msg.type === 'params-update') {
    state.currentParams = msg.params;
    broadcasts.push({ type: 'params-update', params: msg.params });
  }

  if (msg.type === 'preset-save' && msg.name && msg.data) {
    const name = String(msg.name).slice(0, 50);
    state.userPresets[name] = msg.data;
    broadcasts.push({ type: 'preset-save', name, data: msg.data });
  }

  if (msg.type === 'preset-delete' && msg.name) {
    const name = String(msg.name);
    delete state.userPresets[name];
    broadcasts.push({ type: 'preset-delete', name });
  }

  if (msg.type === 'chat') {
    const info = state.clients.get(clientId);
    if (info) {
      const text = String(msg.text || '').slice(0, 100);
      if (text) {
        broadcasts.push({ type: 'chat', id: clientId, text });
      }
    }
  }

  return { state, broadcasts };
}
