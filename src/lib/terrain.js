// Pure heightmap function — no THREE.js dependency
export const FIELD_SIZE = 120;

export function getHeightAt(x, z) {
  let h = 0;
  h += Math.sin(x * 0.02) * Math.cos(z * 0.03) * 2.0;
  h += Math.sin(x * 0.05 + 1.0) * Math.cos(z * 0.04 + 2.0) * 1.0;
  h += Math.sin(x * 0.1 + 3.0) * Math.sin(z * 0.08 + 1.5) * 0.5;
  return h;
}
