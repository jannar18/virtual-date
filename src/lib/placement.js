// Flower placement logic — rejection sampling + spatial hash
import { seededRandom } from './prng.js';

export const PATCH_CELL_SIZE = 4;

export function isPatchCell(cx, cz, seed) {
  let h = (cx * 73856093) ^ (cz * 19349663) ^ (seed * 83492791);
  h = ((h >>> 0) % 100);
  return h < 20;
}

export function sampleFlowerPositions(params, seed, fieldSize) {
  const totalCount = Math.round(params.flowerCount);
  const pctSum = (params.singlePct + params.bundlePct + params.clusterPct) || 1;
  const clusterCount = Math.round(totalCount * params.clusterPct / pctSum);
  const bundleCount = Math.round(totalCount * params.bundlePct / pctSum);
  const singleCount = Math.max(0, totalCount - clusterCount - bundleCount);

  const singlePositions = [];
  const bundlePositions = [];
  const clusterPositions = [];

  let placed = 0;
  let attempts = 0;
  const maxAttempts = totalCount * 4;

  while (placed < totalCount && attempts < maxAttempts) {
    attempts++;
    const x = (seededRandom() - 0.5) * fieldSize;
    const z = (seededRandom() - 0.5) * fieldSize;

    const cx = Math.floor(x / PATCH_CELL_SIZE);
    const cz = Math.floor(z / PATCH_CELL_SIZE);
    const inPatch = isPatchCell(cx, cz, seed + 42);
    if (!inPatch && seededRandom() > 0.17) continue;

    const sh = params.stemHeightMin + seededRandom() * (params.stemHeightMax - params.stemHeightMin);
    const scale = params.scaleMin + seededRandom() * (params.scaleMax - params.scaleMin);
    const phase = seededRandom() * Math.PI * 2;
    const rotY = seededRandom() * Math.PI * 2;
    seededRandom(); // consume colorRand to keep sequence identical

    if (placed < clusterCount) {
      clusterPositions.push({ x, z, sh, scale, phase, rotY });
    } else if (placed < clusterCount + bundleCount) {
      bundlePositions.push({ x, z, sh, scale, phase, rotY });
    } else {
      singlePositions.push({ x, z, sh, scale, phase, rotY });
    }
    placed++;
  }

  return { singlePositions, bundlePositions, clusterPositions };
}
