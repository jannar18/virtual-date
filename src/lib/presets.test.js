import { describe, it, expect } from 'vitest';
import {
  PRESET_KEYS,
  PRESETS,
  createDefaultParams,
  applyPreset,
  createPresetSnapshot,
} from './presets.js';

describe('presets', () => {
  it('PRESET_KEYS is a non-empty array of strings', () => {
    expect(Array.isArray(PRESET_KEYS)).toBe(true);
    expect(PRESET_KEYS.length).toBeGreaterThan(0);
    PRESET_KEYS.forEach((key) => {
      expect(typeof key).toBe('string');
    });
  });

  it('all built-in presets exist', () => {
    const expectedPresets = [
      'Desert Spring',
      "Howl's Secret Garden",
      'Daisy',
      'Poppy',
      'Cosmos',
      'Buttercup',
      'Wild Rose',
      'Sunflower',
    ];
    expectedPresets.forEach((name) => {
      expect(PRESETS).toHaveProperty(name);
    });
  });

  it('createDefaultParams returns object with all PRESET_KEYS as properties', () => {
    const params = createDefaultParams();
    PRESET_KEYS.forEach((key) => {
      expect(params).toHaveProperty(key);
    });
  });

  it('createDefaultParams returns a new copy each call (not same reference)', () => {
    const a = createDefaultParams();
    const b = createDefaultParams();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('applyPreset merges correctly — partial presets keep existing values for missing keys', () => {
    const params = createDefaultParams();
    const result = applyPreset(params, 'Daisy');
    const daisyPreset = PRESETS['Daisy'];

    // Keys defined in the Daisy preset should be overwritten
    Object.keys(daisyPreset).forEach((key) => {
      expect(result[key]).toEqual(daisyPreset[key]);
    });

    // Keys NOT in the Daisy preset should retain their original value
    PRESET_KEYS.forEach((key) => {
      if (!(key in daisyPreset)) {
        expect(result[key]).toEqual(params[key]);
      }
    });
  });

  it('applyPreset returns new object (not same reference as input)', () => {
    const params = createDefaultParams();
    const result = applyPreset(params, 'Poppy');
    expect(result).not.toBe(params);
  });

  it('applyPreset with unknown preset name returns unchanged params (copy)', () => {
    const params = createDefaultParams();
    const result = applyPreset(params, 'NonExistentPreset');
    expect(result).not.toBe(params);
    expect(result).toEqual(params);
  });

  it('createPresetSnapshot includes only PRESET_KEYS', () => {
    const params = createDefaultParams();
    const snapshot = createPresetSnapshot(params);
    const snapshotKeys = Object.keys(snapshot);

    snapshotKeys.forEach((key) => {
      expect(PRESET_KEYS).toContain(key);
    });

    PRESET_KEYS.forEach((key) => {
      expect(snapshot).toHaveProperty(key);
    });
  });

  it('createPresetSnapshot excludes non-preset keys', () => {
    const params = { ...createDefaultParams(), preset: 'Daisy', randomExtraKey: 42 };
    const snapshot = createPresetSnapshot(params);
    expect(snapshot).not.toHaveProperty('preset');
    expect(snapshot).not.toHaveProperty('randomExtraKey');
  });

  it('all built-in presets have valid color hex strings where color keys appear', () => {
    const colorKeyPattern = /color/i;
    Object.entries(PRESETS).forEach(([presetName, preset]) => {
      Object.entries(preset).forEach(([key, value]) => {
        if (colorKeyPattern.test(key) && typeof value === 'string') {
          expect(value, `${presetName}.${key} should be a valid hex color`).toMatch(
            /^#[0-9a-fA-F]{6}$/
          );
        }
      });
    });
  });

  it('all built-in presets have numeric values where expected (petalCount, etc.)', () => {
    const numericKeys = ['petalCount', 'flowerCount', 'petalLength', 'petalWidth', 'stemHeight'];
    Object.entries(PRESETS).forEach(([presetName, preset]) => {
      numericKeys.forEach((key) => {
        if (key in preset) {
          expect(typeof preset[key], `${presetName}.${key} should be a number`).toBe('number');
        }
      });
    });
  });

  it('applyPreset sets the preset property to the preset name', () => {
    const params = createDefaultParams();
    const result = applyPreset(params, 'Cosmos');
    expect(result.preset).toBe('Cosmos');
  });
});
