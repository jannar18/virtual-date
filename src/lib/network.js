// WebSocket client wrapper for multiplayer sync
let ws = null;
let myId = null;
let _onInit = null;
let _onPlayerJoin = null;
let _onPlayerLeave = null;
let _onPlayerMove = null;
let _onParamsUpdate = null;

export function connect({ onInit, onPlayerJoin, onPlayerLeave, onPlayerMove, onParamsUpdate }) {
  _onInit = onInit;
  _onPlayerJoin = onPlayerJoin;
  _onPlayerLeave = onPlayerLeave;
  _onPlayerMove = onPlayerMove;
  _onParamsUpdate = onParamsUpdate;

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

// Debounced params sender
let _paramsTimer = null;
export function sendParams(params) {
  clearTimeout(_paramsTimer);
  _paramsTimer = setTimeout(() => {
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'params-update', params }));
    }
  }, 80);
}
