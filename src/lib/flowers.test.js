import { describe, it, expect } from 'vitest';
import { buildFlowerHead, buildFlowerGeometry, buildBellFlowerGeometry, buildClusterBudGeometry } from './flowers.js';

const defaultShape = {
  petalCount: 5, petalLength: 0.5, petalWidth: 0.7,
  bellWidth: 0.2, bellFlare: 0.05, petalTilt: 0.0, centerSize: 0.1
};

describe('buildFlowerHead', () => {
  it('returns vertices, indices, and petalDists arrays', () => {
    const result = buildFlowerHead(defaultShape);
    expect(Array.isArray(result.vertices)).toBe(true);
    expect(Array.isArray(result.indices)).toBe(true);
    expect(Array.isArray(result.petalDists)).toBe(true);
  });

  it('vertex count matches expected for 5 petals: (8*5+1)*3 = 123 floats', () => {
    const result = buildFlowerHead(defaultShape);
    expect(result.vertices.length).toBe(123);
  });

  it('petalDists length matches expected for 5 petals: 8*5+1 = 41', () => {
    const result = buildFlowerHead(defaultShape);
    expect(result.petalDists.length).toBe(41);
  });

  it('index count matches expected for 5 petals: 21*5 = 105 indices', () => {
    const result = buildFlowerHead(defaultShape);
    expect(result.indices.length).toBe(105);
  });

  it('all index values are valid triangle indices (< vertex count)', () => {
    const result = buildFlowerHead(defaultShape);
    const vertexCount = 8 * defaultShape.petalCount + 1;
    for (const idx of result.indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(vertexCount);
    }
  });

  it('all petalDist values are between 0 and 1 inclusive', () => {
    const result = buildFlowerHead(defaultShape);
    for (const d of result.petalDists) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it('center disc vertices exist with petalDist approximately 0', () => {
    const result = buildFlowerHead(defaultShape);
    const hasZeroDist = result.petalDists.some(d => d < 0.01);
    expect(hasZeroDist).toBe(true);
  });

  it('varying petalCount changes vertex count proportionally (3 vs 8 petals)', () => {
    const result3 = buildFlowerHead({ ...defaultShape, petalCount: 3 });
    const result8 = buildFlowerHead({ ...defaultShape, petalCount: 8 });
    expect(result3.vertices.length).toBe((8 * 3 + 1) * 3);
    expect(result8.vertices.length).toBe((8 * 8 + 1) * 3);
  });

  it('petalTilt=0 produces flat flowers (petal Y values near baseY of 0.06)', () => {
    const result = buildFlowerHead({ ...defaultShape, petalTilt: 0.0 });
    const yValues = [];
    for (let i = 1; i < result.vertices.length; i += 3) {
      yValues.push(result.vertices[i]);
    }
    const baseY = 0.06;
    const petalYs = yValues.filter((_, idx) => idx < 7 * defaultShape.petalCount);
    for (const y of petalYs) {
      expect(Math.abs(y - baseY)).toBeLessThan(0.15);
    }
  });

  it('petalTilt=1 produces bell shapes (petal verts have larger positive Y)', () => {
    const flat = buildFlowerHead({ ...defaultShape, petalTilt: 0.0 });
    const bell = buildFlowerHead({ ...defaultShape, petalTilt: 1.0 });
    const maxYFlat = Math.max(...flat.vertices.filter((_, i) => i % 3 === 1));
    const maxYBell = Math.max(...bell.vertices.filter((_, i) => i % 3 === 1));
    expect(maxYBell).toBeGreaterThan(maxYFlat);
  });

  it('bellWidth affects radius of mid/top vertices', () => {
    const narrow = buildFlowerHead({ ...defaultShape, bellWidth: 0.1, petalTilt: 0.5 });
    const wide = buildFlowerHead({ ...defaultShape, bellWidth: 0.5, petalTilt: 0.5 });
    expect(narrow.vertices).not.toEqual(wide.vertices);
  });

  it('centerSize affects center disc radius', () => {
    const small = buildFlowerHead({ ...defaultShape, centerSize: 0.05 });
    const large = buildFlowerHead({ ...defaultShape, centerSize: 0.3 });
    expect(small.vertices).not.toEqual(large.vertices);
  });

  it('different petalWidth values change geometry', () => {
    const thin = buildFlowerHead({ ...defaultShape, petalWidth: 0.3 });
    const wide = buildFlowerHead({ ...defaultShape, petalWidth: 1.0 });
    expect(thin.vertices).not.toEqual(wide.vertices);
  });
});

describe('buildFlowerGeometry', () => {
  it('delegates correctly using single flower params', () => {
    const params = {
      petalCount: 5, petalLength: 0.5, petalWidth: 0.7,
      singleBellWidth: 0.2, singleBellFlare: 0.05, singlePetalTilt: 0.0, centerSize: 0.1
    };
    const result = buildFlowerGeometry(params);
    expect(Array.isArray(result.vertices)).toBe(true);
    expect(Array.isArray(result.indices)).toBe(true);
    expect(Array.isArray(result.petalDists)).toBe(true);
    expect(result.vertices.length).toBe((8 * 5 + 1) * 3);
  });
});

describe('buildBellFlowerGeometry', () => {
  it('delegates correctly using bundle params', () => {
    const params = {
      bundlePetalCount: 5, bundlePetalLength: 0.5, bundlePetalWidth: 0.7,
      bundleBellWidth: 0.3, bundleBellFlare: 0.1, bundlePetalTilt: 0.8, bundleCenterSize: 0.1
    };
    const result = buildBellFlowerGeometry(params);
    expect(Array.isArray(result.vertices)).toBe(true);
    expect(Array.isArray(result.indices)).toBe(true);
    expect(Array.isArray(result.petalDists)).toBe(true);
    expect(result.vertices.length).toBe((8 * 5 + 1) * 3);
  });
});

describe('buildClusterBudGeometry', () => {
  it('delegates correctly using cluster params', () => {
    const params = {
      clusterPetalCount: 5, clusterPetalLength: 0.5, clusterPetalWidth: 0.7,
      clusterBellWidth: 0.25, clusterBellFlare: 0.08, clusterPetalTilt: 0.6, clusterCenterSize: 0.1
    };
    const result = buildClusterBudGeometry(params);
    expect(Array.isArray(result.vertices)).toBe(true);
    expect(Array.isArray(result.indices)).toBe(true);
    expect(Array.isArray(result.petalDists)).toBe(true);
    expect(result.vertices.length).toBe((8 * 5 + 1) * 3);
  });
});
