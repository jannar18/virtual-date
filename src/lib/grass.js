// Pure grass blade geometry data — no THREE.js

export function createGrassBladeVertices() {
  return [
    -0.02, 0, 0, 0.02, 0, 0,
    -0.01, 0.5, 0, 0.01, 0.5, 0,
    0.0, 1.0, 0,
  ];
}

export const GRASS_BLADE_INDICES = [0, 1, 2, 2, 1, 3, 2, 3, 4];

export function createPatchBladeVertices() {
  return [
    -0.035, 0, 0, 0.035, 0, 0,
    -0.02, 0.35, 0, 0.02, 0.35, 0,
    0.0, 0.6, 0,
  ];
}

export const PATCH_BLADE_INDICES = [0, 1, 2, 2, 1, 3, 2, 3, 4];
