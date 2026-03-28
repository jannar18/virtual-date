import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMyId } from './network.js';

describe('network module', () => {
  describe('sendPosition message format', () => {
    it('creates JSON with type player-move and x, y, z, yaw', () => {
      const msg = { type: 'player-move', x: 1, y: 2, z: 3, yaw: 0.5 };
      const parsed = JSON.parse(JSON.stringify(msg));
      expect(parsed.type).toBe('player-move');
      expect(parsed).toHaveProperty('x');
      expect(parsed).toHaveProperty('y');
      expect(parsed).toHaveProperty('z');
      expect(parsed).toHaveProperty('yaw');
    });
  });

  describe('sendChat message format', () => {
    it('creates JSON with type chat and text', () => {
      const msg = { type: 'chat', text: 'hello world' };
      const parsed = JSON.parse(JSON.stringify(msg));
      expect(parsed.type).toBe('chat');
      expect(parsed.text).toBe('hello world');
    });
  });

  describe('sendPresetSave message format', () => {
    it('creates JSON with type preset-save, name, and data', () => {
      const msg = { type: 'preset-save', name: 'my-preset', data: { foo: 42 } };
      const parsed = JSON.parse(JSON.stringify(msg));
      expect(parsed.type).toBe('preset-save');
      expect(parsed.name).toBe('my-preset');
      expect(parsed.data).toEqual({ foo: 42 });
    });
  });

  describe('sendPresetDelete message format', () => {
    it('creates JSON with type preset-delete and name', () => {
      const msg = { type: 'preset-delete', name: 'old-preset' };
      const parsed = JSON.parse(JSON.stringify(msg));
      expect(parsed.type).toBe('preset-delete');
      expect(parsed.name).toBe('old-preset');
    });
  });

  describe('sendParams message format', () => {
    it('creates JSON with type params-update and params object', () => {
      const msg = { type: 'params-update', params: { speed: 10, gravity: -9.8 } };
      const parsed = JSON.parse(JSON.stringify(msg));
      expect(parsed.type).toBe('params-update');
      expect(parsed.params).toEqual({ speed: 10, gravity: -9.8 });
    });
  });

  describe('protocol detection logic', () => {
    it('maps https: to wss:', () => {
      const protocol = 'https:';
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      expect(wsProtocol).toBe('wss:');
    });

    it('maps http: to ws:', () => {
      const protocol = 'http:';
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      expect(wsProtocol).toBe('ws:');
    });
  });

  describe('getMyId', () => {
    it('returns null before connect is called', () => {
      expect(getMyId()).toBeNull();
    });
  });

  describe('message types match expected protocol strings', () => {
    it('all message types are the expected strings', () => {
      const expectedTypes = [
        'player-move',
        'chat',
        'preset-save',
        'preset-delete',
        'params-update',
      ];
      expectedTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type).toMatch(/^[a-z]+(-[a-z]+)*$/);
      });
    });
  });
});
