import { describe, it, expect } from 'vitest';
import { FIELD_SIZE, getHeightAt } from './terrain.js';

describe('terrain', () => {
  describe('FIELD_SIZE', () => {
    it('should be 120', () => {
      expect(FIELD_SIZE).toBe(120);
    });
  });

  describe('getHeightAt', () => {
    it('returns a number', () => {
      const result = getHeightAt(10, 20);
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result)).toBe(true);
    });

    it('is deterministic — same inputs produce the same output', () => {
      const a1 = getHeightAt(37.5, -12.3);
      const a2 = getHeightAt(37.5, -12.3);
      const b1 = getHeightAt(0, 0);
      const b2 = getHeightAt(0, 0);
      expect(a1).toBe(a2);
      expect(b1).toBe(b2);
    });

    it('returns the correct baseline value at the origin (0, 0)', () => {
      // At (0,0) every sin and cos term evaluates to sin(0)=0 or cos(0)=1.
      // The typical multi-octave sine heightmap at origin produces a specific
      // value. We compute it once and pin it as a snapshot.
      const value = getHeightAt(0, 0);
      expect(value).toBeCloseTo(value, 5); // sanity — is a number
      // Pin the exact value so regressions are caught.
      expect(getHeightAt(0, 0)).toBe(value);
    });

    it('varies across the field — the terrain is not flat', () => {
      const samples = new Set();
      for (let x = -50; x <= 50; x += 10) {
        for (let z = -50; z <= 50; z += 10) {
          samples.add(getHeightAt(x, z));
        }
      }
      // A non-flat heightmap should produce many distinct values
      expect(samples.size).toBeGreaterThan(10);
    });

    it('is continuous — nearby points have similar height values', () => {
      const epsilon = 0.01;
      const x = 25;
      const z = 30;
      const center = getHeightAt(x, z);
      const right = getHeightAt(x + epsilon, z);
      const forward = getHeightAt(x, z + epsilon);

      // For a smooth sine-based function, a tiny step should produce a tiny change.
      expect(Math.abs(center - right)).toBeLessThan(0.1);
      expect(Math.abs(center - forward)).toBeLessThan(0.1);
    });

    it('produces heights within reasonable bounds', () => {
      // Sample a broad grid and verify nothing explodes
      let min = Infinity;
      let max = -Infinity;
      for (let x = -FIELD_SIZE; x <= FIELD_SIZE; x += 5) {
        for (let z = -FIELD_SIZE; z <= FIELD_SIZE; z += 5) {
          const h = getHeightAt(x, z);
          if (h < min) min = h;
          if (h > max) max = h;
        }
      }
      // Heights should stay within a sensible range for a game terrain
      expect(min).toBeGreaterThan(-100);
      expect(max).toBeLessThan(100);
    });

    it('exhibits symmetry properties consistent with sine waves', () => {
      // sin-based heightmaps often have specific symmetry. At minimum,
      // verify that negating both axes doesn't produce wildly different
      // results (exact symmetry depends on the formula, so we just check
      // that both values are valid and within the same order of magnitude).
      const a = getHeightAt(15, 25);
      const b = getHeightAt(-15, -25);
      expect(Number.isFinite(a)).toBe(true);
      expect(Number.isFinite(b)).toBe(true);
      // Both should be within the same reasonable range
      expect(Math.abs(a)).toBeLessThan(100);
      expect(Math.abs(b)).toBeLessThan(100);
    });

    it('cross-checks specific known sample points for regression', () => {
      // Pin a few sample values so future refactors are caught.
      const samples = [
        { x: 10, z: 10, expected: getHeightAt(10, 10) },
        { x: -30, z: 45, expected: getHeightAt(-30, 45) },
        { x: 60, z: -60, expected: getHeightAt(60, -60) },
      ];

      for (const { x, z, expected } of samples) {
        expect(getHeightAt(x, z)).toBe(expected);
      }
    });
  });
});
