import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState, addClient, removeClient, handleMessage } from './game-state.js';

describe('game-state module', () => {
  let state;

  beforeEach(() => {
    state = createGameState(12345);
  });

  describe('createGameState', () => {
    it('returns valid initial state with all expected fields', () => {
      expect(state).toHaveProperty('seed');
      expect(state).toHaveProperty('nextId');
      expect(state).toHaveProperty('clients');
      expect(state).toHaveProperty('currentParams');
      expect(state).toHaveProperty('userPresets');
    });

    it('stores the seed', () => {
      expect(state.seed).toBe(12345);
    });
  });

  describe('addClient', () => {
    it('assigns incrementing IDs', () => {
      const result1 = addClient(state);
      state = result1.state;
      const result2 = addClient(state);
      expect(result1.clientId).toBe(1);
      expect(result2.clientId).toBe(2);
    });

    it('returns init message with seed, params, players, and presets', () => {
      const result = addClient(state);
      const init = result.initMessage;
      expect(init).toHaveProperty('seed');
      expect(init).toHaveProperty('params');
      expect(init).toHaveProperty('players');
      expect(init).toHaveProperty('presets');
    });

    it('broadcasts player-join', () => {
      const result = addClient(state);
      expect(result.broadcasts.length).toBeGreaterThanOrEqual(1);
      const joinBroadcast = result.broadcasts.find(
        (b) => b.type === 'player-join'
      );
      expect(joinBroadcast).toBeDefined();
    });

    it('init message lists existing players when a second client joins', () => {
      const result1 = addClient(state);
      state = result1.state;
      const result2 = addClient(state);
      const init2 = result2.initMessage;
      expect(Object.keys(init2.players).length).toBeGreaterThanOrEqual(1);
      expect(init2.players[result1.clientId]).toBeDefined();
    });
  });

  describe('removeClient', () => {
    it('broadcasts player-leave', () => {
      const added = addClient(state);
      state = added.state;
      const result = removeClient(state, added.clientId);
      const leaveBroadcast = result.broadcasts.find(
        (b) => b.type === 'player-leave'
      );
      expect(leaveBroadcast).toBeDefined();
    });

    it('removes client from state', () => {
      const added = addClient(state);
      state = added.state;
      const result = removeClient(state, added.clientId);
      state = result.state;
      const hasClient = state.clients.has
        ? state.clients.has(added.clientId)
        : added.clientId in state.clients;
      expect(hasClient).toBe(false);
    });
  });

  describe('handleMessage', () => {
    let clientId;

    beforeEach(() => {
      const added = addClient(state);
      state = added.state;
      clientId = added.clientId;
    });

    it('player-move updates client position', () => {
      const msg = { type: 'player-move', x: 10, y: 20, z: 30, yaw: 1.5 };
      const result = handleMessage(state, clientId, msg);
      state = result.state;
      const client = state.clients instanceof Map
        ? state.clients.get(clientId)
        : state.clients[clientId];
      expect(client.x).toBe(10);
      expect(client.y).toBe(20);
      expect(client.z).toBe(30);
      expect(client.yaw).toBe(1.5);
    });

    it('player-move broadcasts to others with correct format', () => {
      const added2 = addClient(state);
      state = added2.state;
      const msg = { type: 'player-move', x: 5, y: 6, z: 7, yaw: 0.3 };
      const result = handleMessage(state, clientId, msg);
      const moveBroadcast = result.broadcasts.find(
        (b) => b.type === 'player-move'
      );
      expect(moveBroadcast).toBeDefined();
      expect(moveBroadcast.id).toBe(clientId);
    });

    it('params-update stores and broadcasts params', () => {
      const params = { speed: 5, density: 0.8 };
      const msg = { type: 'params-update', params };
      const result = handleMessage(state, clientId, msg);
      state = result.state;
      expect(state.currentParams).toEqual(params);
      const paramsBroadcast = result.broadcasts.find(
        (b) => b.type === 'params-update'
      );
      expect(paramsBroadcast).toBeDefined();
    });

    it('preset-save stores preset, truncates name to 50 chars, and broadcasts', () => {
      const longName = 'a'.repeat(80);
      const data = { color: 'red' };
      const msg = { type: 'preset-save', name: longName, data };
      const result = handleMessage(state, clientId, msg);
      state = result.state;
      const truncatedName = longName.slice(0, 50);
      const storedPreset = state.userPresets instanceof Map
        ? state.userPresets.get(truncatedName)
        : state.userPresets[truncatedName];
      expect(storedPreset).toBeDefined();
      const saveBroadcast = result.broadcasts.find(
        (b) => b.type === 'preset-save'
      );
      expect(saveBroadcast).toBeDefined();
      expect(saveBroadcast.name).toBe(truncatedName);
    });

    it('preset-delete removes preset and broadcasts', () => {
      const saveMsg = { type: 'preset-save', name: 'to-delete', data: { a: 1 } };
      const saveResult = handleMessage(state, clientId, saveMsg);
      state = saveResult.state;
      const deleteMsg = { type: 'preset-delete', name: 'to-delete' };
      const result = handleMessage(state, clientId, deleteMsg);
      state = result.state;
      const deletedPreset = state.userPresets instanceof Map
        ? state.userPresets.get('to-delete')
        : state.userPresets['to-delete'];
      expect(deletedPreset).toBeUndefined();
      const deleteBroadcast = result.broadcasts.find(
        (b) => b.type === 'preset-delete'
      );
      expect(deleteBroadcast).toBeDefined();
    });

    it('chat broadcasts with player ID, truncates to 100 chars', () => {
      const longText = 'x'.repeat(200);
      const msg = { type: 'chat', text: longText };
      const result = handleMessage(state, clientId, msg);
      const chatBroadcast = result.broadcasts.find(
        (b) => b.type === 'chat'
      );
      expect(chatBroadcast).toBeDefined();
      expect(chatBroadcast.id).toBe(clientId);
      expect(chatBroadcast.text.length).toBeLessThanOrEqual(100);
    });

    it('chat ignores empty text and produces no broadcast', () => {
      const msg = { type: 'chat', text: '' };
      const result = handleMessage(state, clientId, msg);
      const chatBroadcast = result.broadcasts.find(
        (b) => b.type === 'chat'
      );
      expect(chatBroadcast).toBeUndefined();
    });

    it('unknown message type produces no broadcasts', () => {
      const msg = { type: 'unknown-type', data: {} };
      const result = handleMessage(state, clientId, msg);
      expect(result.broadcasts).toEqual([]);
    });
  });
});
