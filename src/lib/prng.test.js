import { describe, it, expect } from 'vitest';
import { resetToSeed, seededRandom } from './prng.js';

describe('prng', () => {
  describe('seededRandom', () => {
    it('returns values in [0, 1)', () => {
      resetToSeed(42);
      for (let i = 0; i < 1000; i++) {
        const v = seededRandom();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('produces the same sequence for the same seed', () => {
      resetToSeed(123);
      const first = Array.from({ length: 20 }, () => seededRandom());

      resetToSeed(123);
      const second = Array.from({ length: 20 }, () => seededRandom());

      expect(first).toEqual(second);
    });

    it('produces different sequences for different seeds', () => {
      resetToSeed(1);
      const seqA = Array.from({ length: 20 }, () => seededRandom());

      resetToSeed(2);
      const seqB = Array.from({ length: 20 }, () => seededRandom());

      // At least some values should differ
      const differences = seqA.filter((v, i) => v !== seqB[i]);
      expect(differences.length).toBeGreaterThan(0);
    });

    it('has a roughly uniform distribution (bucket test)', () => {
      const bucketCount = 10;
      const sampleCount = 10000;
      const buckets = new Array(bucketCount).fill(0);

      resetToSeed(999);
      for (let i = 0; i < sampleCount; i++) {
        const v = seededRandom();
        const idx = Math.min(Math.floor(v * bucketCount), bucketCount - 1);
        buckets[idx]++;
      }

      const expectedPerBucket = sampleCount / bucketCount; // 1000
      for (let i = 0; i < bucketCount; i++) {
        const ratio = buckets[i] / expectedPerBucket;
        // Each bucket should hold between 8% and 12% of samples
        expect(ratio).toBeGreaterThan(0.8);
        expect(ratio).toBeLessThan(1.2);
      }
    });

    it('resets correctly when resetToSeed is called again', () => {
      resetToSeed(77);
      const initial = Array.from({ length: 5 }, () => seededRandom());

      // Generate more values to advance the state
      for (let i = 0; i < 100; i++) seededRandom();

      // Reset to the same seed
      resetToSeed(77);
      const afterReset = Array.from({ length: 5 }, () => seededRandom());

      expect(afterReset).toEqual(initial);
    });

    it('shows no obvious repetition within the first 1000 values', () => {
      resetToSeed(555);
      const values = Array.from({ length: 1000 }, () => seededRandom());
      const unique = new Set(values);

      // With 1000 random floats the chance of collision is vanishingly small.
      // Allow at most a handful of duplicates to be safe.
      expect(unique.size).toBeGreaterThan(990);
    });

    it('never returns exactly 1 in a large sample', () => {
      resetToSeed(314);
      for (let i = 0; i < 10000; i++) {
        expect(seededRandom()).not.toBe(1);
      }
    });

    it('handles seed = 0 correctly and produces valid numbers', () => {
      resetToSeed(0);
      for (let i = 0; i < 100; i++) {
        const v = seededRandom();
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });
});
