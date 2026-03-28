import { describe, it, expect } from 'vitest';
import {
  createGrassBladeVertices,
  GRASS_BLADE_INDICES,
  createPatchBladeVertices,
  PATCH_BLADE_INDICES,
} from './grass.js';

describe('grass', () => {
  it('blade vertices have correct count (5 vertices x 3 components = 15 floats)', () => {
    const vertices = createGrassBladeVertices();
    expect(vertices).toHaveLength(15);
  });

  it('blade indices form valid triangles (all indices < 5)', () => {
    const expectedIndices = [0, 1, 2, 2, 1, 3, 2, 3, 4];
    expect(GRASS_BLADE_INDICES).toEqual(expectedIndices);

    const vertexCount = 5;
    GRASS_BLADE_INDICES.forEach((index) => {
      expect(index).toBeLessThan(vertexCount);
    });

    expect(PATCH_BLADE_INDICES).toEqual(expectedIndices);
    PATCH_BLADE_INDICES.forEach((index) => {
      expect(index).toBeLessThan(vertexCount);
    });
  });

  it('patch blade dimensions differ from regular blade (different widths/heights)', () => {
    const bladeVerts = createGrassBladeVertices();
    const patchVerts = createPatchBladeVertices();

    // Extract x-coordinates for width comparison (vertices at index 0, 3, 6, 9, 12)
    const bladeXValues = [bladeVerts[0], bladeVerts[3], bladeVerts[6], bladeVerts[9], bladeVerts[12]];
    const patchXValues = [patchVerts[0], patchVerts[3], patchVerts[6], patchVerts[9], patchVerts[12]];

    const bladeWidth = Math.max(...bladeXValues) - Math.min(...bladeXValues);
    const patchWidth = Math.max(...patchXValues) - Math.min(...patchXValues);

    // Extract y-coordinates for height comparison (vertices at index 1, 4, 7, 10, 13)
    const bladeYValues = [bladeVerts[1], bladeVerts[4], bladeVerts[7], bladeVerts[10], bladeVerts[13]];
    const patchYValues = [patchVerts[1], patchVerts[4], patchVerts[7], patchVerts[10], patchVerts[13]];

    const bladeHeight = Math.max(...bladeYValues) - Math.min(...bladeYValues);
    const patchHeight = Math.max(...patchYValues) - Math.min(...patchYValues);

    // Patch and blade should have different dimensions
    expect(patchWidth).not.toBeCloseTo(bladeWidth, 5);
    expect(patchHeight).not.toBeCloseTo(bladeHeight, 5);
  });

  it('vertices are in expected ranges (blade: width ~0.04, height ~1.0; patch: width ~0.07, height ~0.6)', () => {
    const bladeVerts = createGrassBladeVertices();
    const patchVerts = createPatchBladeVertices();

    // Regular blade dimensions
    const bladeXValues = [bladeVerts[0], bladeVerts[3], bladeVerts[6], bladeVerts[9], bladeVerts[12]];
    const bladeYValues = [bladeVerts[1], bladeVerts[4], bladeVerts[7], bladeVerts[10], bladeVerts[13]];

    const bladeWidth = Math.max(...bladeXValues) - Math.min(...bladeXValues);
    const bladeHeight = Math.max(...bladeYValues) - Math.min(...bladeYValues);

    expect(bladeWidth).toBeGreaterThan(0.01);
    expect(bladeWidth).toBeLessThan(0.1);
    expect(bladeHeight).toBeGreaterThan(0.5);
    expect(bladeHeight).toBeLessThan(1.5);

    // Patch blade dimensions
    const patchXValues = [patchVerts[0], patchVerts[3], patchVerts[6], patchVerts[9], patchVerts[12]];
    const patchYValues = [patchVerts[1], patchVerts[4], patchVerts[7], patchVerts[10], patchVerts[13]];

    const patchWidth = Math.max(...patchXValues) - Math.min(...patchXValues);
    const patchHeight = Math.max(...patchYValues) - Math.min(...patchYValues);

    expect(patchWidth).toBeGreaterThan(0.03);
    expect(patchWidth).toBeLessThan(0.15);
    expect(patchHeight).toBeGreaterThan(0.3);
    expect(patchHeight).toBeLessThan(1.0);
  });
});
