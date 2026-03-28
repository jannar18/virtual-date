import { describe, it, expect } from 'vitest';
import { PATCH_CELL_SIZE, isPatchCell, sampleFlowerPositions } from './placement.js';
import { resetToSeed } from './prng.js';

const testParams = {
  flowerCount: 1000, singlePct: 50, bundlePct: 30, clusterPct: 20,
  stemHeightMin: 0.2, stemHeightMax: 0.75,
  scaleMin: 0.1, scaleMax: 0.5,
};

describe('isPatchCell', () => {
  it('is deterministic (same inputs produce same output)', () => {
    const a = isPatchCell(10, 20, 42);
    const b = isPatchCell(10, 20, 42);
    expect(a).toBe(b);
  });

  it('returns a boolean', () => {
    const result = isPatchCell(5, 5, 42);
    expect(typeof result).toBe('boolean');
  });

  it('produces roughly 20% patch cells over 1000 samples', () => {
    let patchCount = 0;
    for (let cx = 0; cx < 100; cx++) {
      for (let cz = 0; cz < 10; cz++) {
        if (isPatchCell(cx, cz, 42)) patchCount++;
      }
    }
    const pct = patchCount / 1000;
    expect(pct).toBeGreaterThanOrEqual(0.15);
    expect(pct).toBeLessThanOrEqual(0.25);
  });

  it('different seeds produce different patch patterns', () => {
    const results1 = [];
    const results2 = [];
    for (let i = 0; i < 50; i++) {
      results1.push(isPatchCell(i, 0, 42));
      results2.push(isPatchCell(i, 0, 999));
    }
    const same = results1.every((v, i) => v === results2[i]);
    expect(same).toBe(false);
  });
});

describe('sampleFlowerPositions', () => {
  it('returns correct structure with singlePositions, bundlePositions, clusterPositions arrays', () => {
    resetToSeed(42);
    const result = sampleFlowerPositions(testParams, 42, 120);
    expect(Array.isArray(result.singlePositions)).toBe(true);
    expect(Array.isArray(result.bundlePositions)).toBe(true);
    expect(Array.isArray(result.clusterPositions)).toBe(true);
  });

  it('total positions approximately equals requested flowerCount (within 50% tolerance)', () => {
    resetToSeed(42);
    const result = sampleFlowerPositions(testParams, 42, 120);
    const total = result.singlePositions.length + result.bundlePositions.length + result.clusterPositions.length;
    expect(total).toBeGreaterThan(testParams.flowerCount * 0.5);
    expect(total).toBeLessThan(testParams.flowerCount * 1.5);
  });

  it('positions x,z are within field bounds (+-fieldSize/2)', () => {
    const fieldSize = 120;
    const halfField = fieldSize / 2;
    resetToSeed(42);
    const result = sampleFlowerPositions(testParams, 42, fieldSize);
    const allPositions = [...result.singlePositions, ...result.bundlePositions, ...result.clusterPositions];
    for (const pos of allPositions) {
      expect(pos.x).toBeGreaterThanOrEqual(-halfField);
      expect(pos.x).toBeLessThanOrEqual(halfField);
      expect(pos.z).toBeGreaterThanOrEqual(-halfField);
      expect(pos.z).toBeLessThanOrEqual(halfField);
    }
  });

  it('single/bundle/cluster ratios roughly match percentage params (within tolerance)', () => {
    resetToSeed(42);
    const result = sampleFlowerPositions(testParams, 42, 120);
    const total = result.singlePositions.length + result.bundlePositions.length + result.clusterPositions.length;
    if (total > 0) {
      const singleRatio = result.singlePositions.length / total;
      const bundleRatio = result.bundlePositions.length / total;
      const clusterRatio = result.clusterPositions.length / total;
      expect(singleRatio).toBeGreaterThan(0.2);
      expect(singleRatio).toBeLessThan(0.8);
      expect(bundleRatio).toBeGreaterThan(0.05);
      expect(bundleRatio).toBeLessThan(0.6);
      expect(clusterRatio).toBeGreaterThan(0.01);
      expect(clusterRatio).toBeLessThan(0.5);
    }
  });

  it('is deterministic: same seed produces same positions', () => {
    resetToSeed(42);
    const result1 = sampleFlowerPositions(testParams, 42, 120);
    resetToSeed(42);
    const result2 = sampleFlowerPositions(testParams, 42, 120);
    expect(result1.singlePositions.length).toBe(result2.singlePositions.length);
    expect(result1.bundlePositions.length).toBe(result2.bundlePositions.length);
    expect(result1.clusterPositions.length).toBe(result2.clusterPositions.length);
    if (result1.singlePositions.length > 0) {
      expect(result1.singlePositions[0].x).toBe(result2.singlePositions[0].x);
      expect(result1.singlePositions[0].z).toBe(result2.singlePositions[0].z);
    }
  });

  it('different seeds produce different positions', () => {
    resetToSeed(42);
    const result1 = sampleFlowerPositions(testParams, 42, 120);
    resetToSeed(999);
    const result2 = sampleFlowerPositions(testParams, 999, 120);
    const allPos1 = [...result1.singlePositions, ...result1.bundlePositions, ...result1.clusterPositions];
    const allPos2 = [...result2.singlePositions, ...result2.bundlePositions, ...result2.clusterPositions];
    const allSame = allPos1.length === allPos2.length && allPos1.every((p, i) => p.x === allPos2[i].x && p.z === allPos2[i].z);
    expect(allSame).toBe(false);
  });
});

describe('PATCH_CELL_SIZE', () => {
  it('equals 4', () => {
    expect(PATCH_CELL_SIZE).toBe(4);
  });
});
