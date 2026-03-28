// Pure flower geometry builders — returns raw arrays, no THREE.js

export function buildFlowerHead({ petalCount, petalLength, petalWidth, bellWidth, bellFlare, petalTilt, centerSize }) {
  const vertices = [];
  const petalDists = [];
  const indices = [];
  let vi = 0;

  const halfW = (Math.PI / petalCount) * petalWidth;
  const t = petalTilt;

  // Bell targets
  const bellH = petalLength * 1.8;
  const bellMidR = bellWidth * 0.6;
  const bellTopR = bellWidth * (0.7 + bellFlare * 2.0);

  // Flat targets
  const flatMidR = petalLength * 0.55;
  const flatTopR = petalLength * 0.75;

  // Interpolate
  const baseY = 0.06 * (1 - t);
  const midH = t * bellH * 0.55;
  const midR = flatMidR + (bellMidR - flatMidR) * t;
  const topH = t * bellH;
  const topR = flatTopR + (bellTopR - flatTopR) * t;
  const discTopY = 0.1 * (1 - t) + 0.03 * t;
  const discRingY = 0.05 * (1 - t) + 0.01 * t;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;

    // v0: Base center
    vertices.push(0, baseY, 0);
    petalDists.push(0);
    // v1: Mid left
    vertices.push(Math.cos(angle - halfW) * midR, midH, Math.sin(angle - halfW) * midR);
    petalDists.push(0.45);
    // v2: Mid center
    vertices.push(Math.cos(angle) * midR * 1.15, midH * 1.05, Math.sin(angle) * midR * 1.15);
    petalDists.push(0.5);
    // v3: Mid right
    vertices.push(Math.cos(angle + halfW) * midR, midH, Math.sin(angle + halfW) * midR);
    petalDists.push(0.45);
    // v4: Top left (rim)
    vertices.push(Math.cos(angle - halfW * 0.85) * topR, topH, Math.sin(angle - halfW * 0.85) * topR);
    petalDists.push(1.0);
    // v5: Top center (rim)
    vertices.push(Math.cos(angle) * topR * 1.05, topH * 0.98, Math.sin(angle) * topR * 1.05);
    petalDists.push(1.0);
    // v6: Top right (rim)
    vertices.push(Math.cos(angle + halfW * 0.85) * topR, topH, Math.sin(angle + halfW * 0.85) * topR);
    petalDists.push(1.0);

    const b = vi;
    indices.push(b, b + 1, b + 2);
    indices.push(b, b + 2, b + 3);
    indices.push(b + 1, b + 4, b + 5);
    indices.push(b + 1, b + 5, b + 2);
    indices.push(b + 2, b + 5, b + 6);
    indices.push(b + 2, b + 6, b + 3);
    vi += 7;
  }

  // Center disc
  vertices.push(0, discTopY, 0);
  petalDists.push(0);
  const cBase = vi;
  vi++;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    vertices.push(Math.cos(a) * centerSize, discRingY, Math.sin(a) * centerSize);
    petalDists.push(0.1);
    vi++;
  }
  for (let i = 0; i < petalCount; i++) {
    indices.push(cBase, cBase + 1 + i, cBase + 1 + ((i + 1) % petalCount));
  }

  return { vertices, petalDists, indices };
}

export function buildFlowerGeometry(p) {
  return buildFlowerHead({
    petalCount: p.petalCount,
    petalLength: p.petalLength,
    petalWidth: p.petalWidth,
    bellWidth: p.singleBellWidth,
    bellFlare: p.singleBellFlare,
    petalTilt: p.singlePetalTilt,
    centerSize: p.centerSize,
  });
}

export function buildBellFlowerGeometry(p) {
  return buildFlowerHead({
    petalCount: p.bundlePetalCount,
    petalLength: p.bundlePetalLength,
    petalWidth: p.bundlePetalWidth,
    bellWidth: p.bundleBellWidth,
    bellFlare: p.bundleBellFlare,
    petalTilt: p.bundlePetalTilt,
    centerSize: p.bundleCenterSize,
  });
}

export function buildClusterBudGeometry(p) {
  return buildFlowerHead({
    petalCount: p.clusterPetalCount,
    petalLength: p.clusterPetalLength,
    petalWidth: p.clusterPetalWidth,
    bellWidth: p.clusterBellWidth,
    bellFlare: p.clusterBellFlare,
    petalTilt: p.clusterPetalTilt,
    centerSize: p.clusterCenterSize,
  });
}
