// WebSocket client wrapper for multiplayer sync
let ws = null;
let myId = null;
let _onInit = null;
let _onPlayerJoin = null;
let _onPlayerLeave = null;
let _onPlayerMove = null;
let _onParamsUpdate = null;
let _onChat = null;
let _onPresetSave = null;
let _onPresetDelete = null;

export function connect({ onInit, onPlayerJoin, onPlayerLeave, onPlayerMove, onParamsUpdate, onChat, onPresetSave, onPresetDelete }) {
  _onInit = onInit;
  _onPlayerJoin = onPlayerJoin;
  _onPlayerLeave = onPlayerLeave;
  _onPlayerMove = onPlayerMove;
  _onParamsUpdate = onParamsUpdate;
  _onChat = onChat;
  _onPresetSave = onPresetSave;
  _onPresetDelete = onPresetDelete;

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'init':
        myId = msg.id;
        _onInit?.(msg);
        break;
      case 'player-join':
        _onPlayerJoin?.(msg.id);
        break;
      case 'player-leave':
        _onPlayerLeave?.(msg.id);
        break;
      case 'player-move':
        _onPlayerMove?.(msg.id, msg.x, msg.y, msg.z, msg.yaw);
        break;
      case 'params-update':
        _onParamsUpdate?.(msg.params);
        break;
      case 'chat':
        _onChat?.(msg.id, msg.text);
        break;
      case 'preset-save':
        _onPresetSave?.(msg.name, msg.data);
        break;
      case 'preset-delete':
        _onPresetDelete?.(msg.name);
        break;
    }
  });
}

// Throttled position sender (~10 Hz)
let _lastSend = 0;
export function sendPosition(x, y, z, yaw) {
  const now = performance.now();
  if (now - _lastSend < 100) return;
  _lastSend = now;
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: 'player-move', x, y, z, yaw }));
  }
}

export function sendChat(text) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: 'chat', text }));
  }
}

export function getMyId() {
  return myId;
}

// Debounced params sender
let _paramsTimer = null;
export function sendPresetSave(name, data) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: 'preset-save', name, data }));
  }
}

export function sendPresetDelete(name) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: 'preset-delete', name }));
  }
}

export function sendParams(params) {
  clearTimeout(_paramsTimer);
  _paramsTimer = setTimeout(() => {
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'params-update', params }));
    }
  }, 80);
}
