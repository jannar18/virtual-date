import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import GUI from 'lil-gui';

import grassVert from './shaders/grass.vert.glsl';
import grassFrag from './shaders/grass.frag.glsl';
import stemVert from './shaders/stem.vert.glsl';
import stemFrag from './shaders/stem.frag.glsl';
import flowerVert from './shaders/flower.vert.glsl';
import flowerFrag from './shaders/flower.frag.glsl';

import { resetToSeed, seededRandom } from './lib/prng.js';
import * as network from './lib/network.js';
import { PlayerManager } from './lib/players.js';

// ─── Config ──────────────────────────────────────────────
const FIELD_SIZE = 120;
const GRASS_COUNT = 80000;
const FOG_COLOR = new THREE.Color(0xd4c4a8);
const FOG_NEAR = 30;
const FOG_FAR = 90;

// ─── Presets ─────────────────────────────────────────────
// Keys that get saved/loaded in a preset (everything except 'preset' itself)
const PRESET_KEYS = [
  'petalCount','petalLength','petalWidth','centerSize',
  'singleStems','singleStemSpread','singleStemThickness','singleStemCurve',
  'singlePetalTilt','singleBellWidth','singleBellFlare',
  'bundleStems','bundleFlowersPerStem','bundleStemSpread',
  'bundleStemThickness','bundleStemCurve','bundleStemHeightMult',
  'bundlePetalCount','bundlePetalLength','bundlePetalWidth',
  'bundleBellWidth','bundleBellFlare','bundlePetalTilt','bundleCenterSize',
  'scaleMin','scaleMax','flowerCount','bundleRatio',
  'stemHeightMin','stemHeightMax',
  'primaryColor','secondaryColor','centerColor',
  'bundleColor','bundleCenterColor',
  'singleStemBaseColor','singleStemTipColor',
  'bundleStemBaseColor','bundleStemTipColor',
  'grassBaseColor','grassTipColor','grassHeight',
  'patchBaseColor','patchTipColor','patchHeight','groundColor',
  'windStrength',
];

const PRESETS = {
  'Desert Spring': {
    petalCount: 4, petalLength: 0.6, petalWidth: 1.0, centerSize: 0.1,
    singleStems: 1, singleStemSpread: 0.02, singleStemThickness: 0.65, singleStemCurve: 0.0,
    singlePetalTilt: 0.25, singleBellWidth: 0.05, singleBellFlare: 0.0,
    bundleStems: 6, bundleFlowersPerStem: 4, bundleStemSpread: 0.2,
    bundleStemThickness: 0.5, bundleStemCurve: 0.35, bundleStemHeightMult: 2.0,
    bundlePetalCount: 4, bundlePetalLength: 0.1, bundlePetalWidth: 1.1,
    bundleBellWidth: 0.2, bundleBellFlare: 0.05, bundlePetalTilt: 1.0, bundleCenterSize: 0.02,
    scaleMin: 0.1, scaleMax: 0.5, stemHeightMin: 0.1, stemHeightMax: 0.6,
    flowerCount: 10000, bundleRatio: 0.45, windStrength: 0.83,
    primaryColor: '#ffebfc', secondaryColor: '#ffda8a', centerColor: '#fff3a0',
    bundleColor: '#ffaf94', bundleCenterColor: '#ffe4a0',
    singleStemBaseColor: '#99bf80', singleStemTipColor: '#99bf80',
    bundleStemBaseColor: '#a6c7ae', bundleStemTipColor: '#a6c7ae',
    grassBaseColor: '#d8d97d', grassTipColor: '#f7ffb8', grassHeight: 0.7,
    patchBaseColor: '#9ed963', patchTipColor: '#e6e882', patchHeight: 0.7,
    groundColor: '#feffbd',
  },
  Daisy:       { petalCount: 8,  petalLength: 0.5,  petalWidth: 0.55, centerSize: 0.12, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Poppy:       { petalCount: 4,  petalLength: 0.55, petalWidth: 0.85, centerSize: 0.08, singlePetalTilt: 0.15, singleBellWidth: 0.28, singleBellFlare: 0.04 },
  Cosmos:      { petalCount: 8,  petalLength: 0.6,  petalWidth: 0.5,  centerSize: 0.10, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Buttercup:   { petalCount: 5,  petalLength: 0.35, petalWidth: 0.7,  centerSize: 0.15, singlePetalTilt: 0.1,  singleBellWidth: 0.20, singleBellFlare: 0.03 },
  'Wild Rose': { petalCount: 5,  petalLength: 0.5,  petalWidth: 0.75, centerSize: 0.10, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Sunflower:   { petalCount: 10, petalLength: 0.55, petalWidth: 0.35, centerSize: 0.18, singlePetalTilt: 0.0,  singleBellWidth: 0.22, singleBellFlare: 0.0 },
};

// ─── Tweakable params ────────────────────────────────────
const params = {
  preset: 'Desert Spring',

  // Single wildflower shape
  petalCount: 4,
  petalLength: 0.6,
  petalWidth: 1.0,
  centerSize: 0.1,
  singleStems: 1,
  singleStemSpread: 0.02,
  singleStemThickness: 0.65,
  singleStemCurve: 0.0,
  singleBellWidth: 0.05,
  singleBellFlare: 0.0,
  singlePetalTilt: 0.25,

  // Bundled bell-flower shape
  bundleStems: 6,
  bundleFlowersPerStem: 4,
  bundleStemSpread: 0.2,
  bundleStemThickness: 0.5,
  bundleStemCurve: 0.35,
  bundleStemHeightMult: 2.0,
  bundlePetalCount: 4,
  bundlePetalLength: 0.1,
  bundlePetalWidth: 1.1,
  bundleBellWidth: 0.2,
  bundleBellFlare: 0.05,
  bundlePetalTilt: 1.0,
  bundleCenterSize: 0.02,

  // Scale & field
  scaleMin: 0.1,
  scaleMax: 0.5,
  flowerCount: 10000,
  bundleRatio: 0.45,
  stemHeightMin: 0.1,
  stemHeightMax: 0.6,

  // Colors — singles
  primaryColor: '#ffebfc',
  secondaryColor: '#ffda8a',
  centerColor: '#fff3a0',

  // Colors — bundles (coral)
  bundleColor: '#ffaf94',
  bundleCenterColor: '#ffe4a0',

  // Stems
  singleStemBaseColor: '#99bf80',
  singleStemTipColor: '#99bf80',
  bundleStemBaseColor: '#a6c7ae',
  bundleStemTipColor: '#a6c7ae',

  // Grass
  grassBaseColor: '#d8d97d',
  grassTipColor: '#f7ffb8',
  grassHeight: 0.7,
  patchBaseColor: '#9ed963',
  patchTipColor: '#e6e882',
  patchHeight: 0.7,
  groundColor: '#feffbd',

  // Wind
  windStrength: 0.83,
};

// ─── Renderer ────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(FOG_COLOR);
document.body.appendChild(renderer.domElement);

// ─── Scene + Camera ──────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(
  65, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(0, 3, 0);

// ─── Terrain ─────────────────────────────────────────────
function getHeightAt(x, z) {
  let h = 0;
  h += Math.sin(x * 0.02) * Math.cos(z * 0.03) * 2.0;
  h += Math.sin(x * 0.05 + 1.0) * Math.cos(z * 0.04 + 2.0) * 1.0;
  h += Math.sin(x * 0.1 + 3.0) * Math.sin(z * 0.08 + 1.5) * 0.5;
  return h;
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getHeightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  terrainMat = new THREE.MeshLambertMaterial({ color: params.groundColor });
  scene.add(new THREE.Mesh(geo, terrainMat));
}

// ─── Grass ───────────────────────────────────────────────
function createGrassBlade() {
  const verts = new Float32Array([
    -0.04, 0, 0, 0.04, 0, 0,
    -0.02, 0.5, 0, 0.02, 0.5, 0,
    0.0, 1.0, 0,
  ]);
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  base.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  return base;
}

let grassMat = null;
let patchGrassMat = null;
let terrainMat = null;

function createGrass() {
  const base = createGrassBlade();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));

  const offsets = new Float32Array(GRASS_COUNT * 3);
  const scales = new Float32Array(GRASS_COUNT);
  const phases = new Float32Array(GRASS_COUNT);

  for (let i = 0; i < GRASS_COUNT; i++) {
    const x = (seededRandom() - 0.5) * FIELD_SIZE;
    const z = (seededRandom() - 0.5) * FIELD_SIZE;
    offsets[i * 3] = x;
    offsets[i * 3 + 1] = getHeightAt(x, z);
    offsets[i * 3 + 2] = z;
    scales[i] = 0.6 + seededRandom() * 0.8;
    phases[i] = seededRandom() * Math.PI * 2;
  }

  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('bladeScale', new THREE.InstancedBufferAttribute(scales, 1));
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: grassVert, fragmentShader: grassFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: 0.6 },
      uHeightScale: { value: params.grassHeight },
      uBaseColor: { value: new THREE.Color(params.grassBaseColor) },
      uTipColor: { value: new THREE.Color(params.grassTipColor) },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  grassMat = mat;
}

// ─── Patch Grass (weed clumps) ──────────────────────────
const PATCH_GRASS_COUNT = 15000;
const PATCH_CELL_SIZE = 4;

function createPatchBlade() {
  // Wider, shorter blade for weeds
  const verts = new Float32Array([
    -0.07, 0, 0,  0.07, 0, 0,
    -0.04, 0.35, 0,  0.04, 0.35, 0,
    0.0, 0.6, 0,
  ]);
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  base.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  return base;
}

function isPatchCell(cx, cz, seed) {
  // Simple spatial hash — deterministically pick ~20% of cells as patch zones
  let h = (cx * 73856093) ^ (cz * 19349663) ^ (seed * 83492791);
  h = ((h >>> 0) % 100);
  return h < 20;
}

function createPatchGrass() {
  const base = createPatchBlade();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));

  const offsets = new Float32Array(PATCH_GRASS_COUNT * 3);
  const scales = new Float32Array(PATCH_GRASS_COUNT);
  const phases = new Float32Array(PATCH_GRASS_COUNT);

  let placed = 0;
  let attempts = 0;
  const maxAttempts = PATCH_GRASS_COUNT * 8;

  while (placed < PATCH_GRASS_COUNT && attempts < maxAttempts) {
    attempts++;
    const x = (seededRandom() - 0.5) * FIELD_SIZE;
    const z = (seededRandom() - 0.5) * FIELD_SIZE;

    const cx = Math.floor(x / PATCH_CELL_SIZE);
    const cz = Math.floor(z / PATCH_CELL_SIZE);

    if (!isPatchCell(cx, cz, _flowerSeed)) continue;

    offsets[placed * 3] = x;
    offsets[placed * 3 + 1] = getHeightAt(x, z);
    offsets[placed * 3 + 2] = z;
    scales[placed] = 0.5 + seededRandom() * 0.6;
    phases[placed] = seededRandom() * Math.PI * 2;
    placed++;
  }

  // Trim to actual placed count
  const trimOff = offsets.subarray(0, placed * 3);
  const trimSc = scales.subarray(0, placed);
  const trimPh = phases.subarray(0, placed);

  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(trimOff, 3));
  geo.setAttribute('bladeScale', new THREE.InstancedBufferAttribute(trimSc, 1));
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(trimPh, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: grassVert, fragmentShader: grassFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: 0.6 },
      uHeightScale: { value: params.patchHeight },
      uBaseColor: { value: new THREE.Color(params.patchBaseColor) },
      uTipColor: { value: new THREE.Color(params.patchTipColor) },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  patchGrassMat = mat;
}

// ─── Shared flower geometry builder ──────────────────────
// Both single and bundle flowers use this. Pass shape params directly.
function buildFlowerHead({ petalCount, petalLength, petalWidth, bellWidth, bellFlare, petalTilt, centerSize }) {
  const verts = [];
  const dists = [];
  const indices = [];
  let vi = 0;

  const halfW = (Math.PI / petalCount) * petalWidth;
  const t = petalTilt; // 0 = flat outward, 1 = full upward bell

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
    verts.push(0, baseY, 0);
    dists.push(0);
    // v1: Mid left
    verts.push(Math.cos(angle - halfW) * midR, midH, Math.sin(angle - halfW) * midR);
    dists.push(0.45);
    // v2: Mid center (slightly further out for roundness)
    verts.push(Math.cos(angle) * midR * 1.15, midH * 1.05, Math.sin(angle) * midR * 1.15);
    dists.push(0.5);
    // v3: Mid right
    verts.push(Math.cos(angle + halfW) * midR, midH, Math.sin(angle + halfW) * midR);
    dists.push(0.45);
    // v4: Top left (rim)
    verts.push(Math.cos(angle - halfW * 0.85) * topR, topH, Math.sin(angle - halfW * 0.85) * topR);
    dists.push(1.0);
    // v5: Top center (rim)
    verts.push(Math.cos(angle) * topR * 1.05, topH * 0.98, Math.sin(angle) * topR * 1.05);
    dists.push(1.0);
    // v6: Top right (rim)
    verts.push(Math.cos(angle + halfW * 0.85) * topR, topH, Math.sin(angle + halfW * 0.85) * topR);
    dists.push(1.0);

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
  verts.push(0, discTopY, 0);
  dists.push(0);
  const cBase = vi;
  vi++;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    verts.push(Math.cos(a) * centerSize, discRingY, Math.sin(a) * centerSize);
    dists.push(0.1);
    vi++;
  }
  for (let i = 0; i < petalCount; i++) {
    indices.push(cBase, cBase + 1 + i, cBase + 1 + ((i + 1) % petalCount));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('petalDist', new THREE.Float32BufferAttribute(dists, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildFlowerGeometry(p) {
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

function buildBellFlowerGeometry(p) {
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

// ─── Flower + stem instance management ───────────────────
let singleStemMesh = null, singleStemMat = null;
let singleFlowerMesh = null, singleFlowerMat = null;
let bundleStemMesh = null, bundleStemMat = null;
let bundleFlowerMesh = null, bundleFlowerMat = null;
let _flowerSeed = 0;

function cleanupMeshAndMat(mesh, mat) {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  if (mat) mat.dispose();
}

function makeStemGroup(offsets, stemHeights, phases, stemThicknesses, stemCurves, baseColor, tipColor) {
  const stemBase = createGrassBlade();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = stemBase.index;
  geo.setAttribute('position', stemBase.getAttribute('position'));
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('stemHeight', new THREE.InstancedBufferAttribute(stemHeights, 1));
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
  geo.setAttribute('stemThickness', new THREE.InstancedBufferAttribute(stemThicknesses, 1));
  geo.setAttribute('stemCurve', new THREE.InstancedBufferAttribute(stemCurves, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: stemVert, fragmentShader: stemFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uStemBase: { value: baseColor },
      uStemTip: { value: tipColor },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, mat };
}

function makeFlowerGroup(baseGeo, headOffsets, scales, phases, rotYs, petalColors, centerCol, swayFactors) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = baseGeo.index;
  geo.setAttribute('position', baseGeo.getAttribute('position'));
  geo.setAttribute('petalDist', baseGeo.getAttribute('petalDist'));
  geo.setAttribute('offset', new THREE.InstancedBufferAttribute(headOffsets, 3));
  geo.setAttribute('flowerScale', new THREE.InstancedBufferAttribute(scales, 1));
  geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
  geo.setAttribute('rotY', new THREE.InstancedBufferAttribute(rotYs, 1));
  geo.setAttribute('petalColor', new THREE.InstancedBufferAttribute(petalColors, 3));
  geo.setAttribute('swayFactor', new THREE.InstancedBufferAttribute(swayFactors, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: flowerVert, fragmentShader: flowerFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uCenterColor: { value: centerCol },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, mat };
}

function rebuildFlowers() {
  cleanupMeshAndMat(singleStemMesh, singleStemMat);
  cleanupMeshAndMat(singleFlowerMesh, singleFlowerMat);
  cleanupMeshAndMat(bundleStemMesh, bundleStemMat);
  cleanupMeshAndMat(bundleFlowerMesh, bundleFlowerMat);
  singleStemMesh = singleStemMat = null;
  singleFlowerMesh = singleFlowerMat = null;
  bundleStemMesh = bundleStemMat = null;
  bundleFlowerMesh = bundleFlowerMat = null;

  resetToSeed(_flowerSeed);

  const totalCount = Math.round(params.flowerCount);
  const bundleCount = Math.round(totalCount * params.bundleRatio);
  const singleCount = totalCount - bundleCount;

  const singleColors = [
    new THREE.Color(params.primaryColor),
    new THREE.Color(params.secondaryColor),
  ];
  const bundleCol = new THREE.Color(params.bundleColor);

  // ── Phase 1: consume PRNG for all base positions ──
  const singlePositions = [];
  const bundlePositions = [];

  for (let i = 0; i < totalCount; i++) {
    const x = (seededRandom() - 0.5) * FIELD_SIZE;
    const z = (seededRandom() - 0.5) * FIELD_SIZE;
    const gy = getHeightAt(x, z);
    const sh = params.stemHeightMin + seededRandom() * (params.stemHeightMax - params.stemHeightMin);
    const scale = params.scaleMin + seededRandom() * (params.scaleMax - params.scaleMin);
    const phase = seededRandom() * Math.PI * 2;
    const rotY = seededRandom() * Math.PI * 2;
    const colorRand = seededRandom();

    if (i < bundleCount) {
      bundlePositions.push({ x, z, gy, sh, scale, phase, rotY });
    } else {
      const c = singleColors[Math.floor(colorRand * singleColors.length)];
      singlePositions.push({ x, z, gy, sh, scale, phase, rotY, c });
    }
  }

  // ── Phase 2: expand single positions into multi-stem clusters ──
  // Stems vary from max(1, singleStems-1) to singleStems per cluster
  if (singlePositions.length > 0) {
    const maxStems = params.singleStems;
    const minStems = Math.max(1, maxStems - 1);
    // Allocate at max capacity
    const maxTotalStems = singlePositions.length * maxStems;

    const sStOffsets = new Float32Array(maxTotalStems * 3);
    const sStHeights = new Float32Array(maxTotalStems);
    const sStPhases = new Float32Array(maxTotalStems);
    const sStThick = new Float32Array(maxTotalStems);
    const sStCurve = new Float32Array(maxTotalStems);

    const sFlOffsets = new Float32Array(maxTotalStems * 3);
    const sFlScales = new Float32Array(maxTotalStems);
    const sFlPhases = new Float32Array(maxTotalStems);
    const sFlRotYs = new Float32Array(maxTotalStems);
    const sFlPetCol = new Float32Array(maxTotalStems * 3);
    const sFlSway = new Float32Array(maxTotalStems);

    let ssi = 0, sfi = 0;

    for (let i = 0; i < singlePositions.length; i++) {
      const sp = singlePositions[i];
      const numStems = minStems + Math.floor(seededRandom() * (maxStems - minStems + 1));

      for (let s = 0; s < numStems; s++) {
        let sx = sp.x, sz = sp.z;
        let stemPhase = sp.phase;
        let sh = sp.sh;
        let stemCurveVal = params.singleStemCurve;
        let stemThick = params.singleStemThickness;

        if (numStems > 1) {
          const stemAngle = (s / numStems) * Math.PI * 2 + seededRandom() * 0.5;
          const stemDist = params.singleStemSpread * (0.5 + seededRandom() * 0.5);
          sx += Math.cos(stemAngle) * stemDist;
          sz += Math.sin(stemAngle) * stemDist;
          stemPhase += seededRandom() * 0.5;
          sh *= (0.85 + seededRandom() * 0.3);
          stemCurveVal *= (0.7 + seededRandom() * 0.6);
          stemThick *= (0.8 + seededRandom() * 0.4);
        }

        const sgy = getHeightAt(sx, sz);

        sStOffsets[ssi * 3] = sx;
        sStOffsets[ssi * 3 + 1] = sgy;
        sStOffsets[ssi * 3 + 2] = sz;
        sStHeights[ssi] = sh;
        sStPhases[ssi] = stemPhase;
        sStThick[ssi] = stemThick;
        sStCurve[ssi] = stemCurveVal;
        ssi++;

        // One flower at tip of each stem
        const curveX = Math.cos(stemPhase) * stemCurveVal;
        const curveZ = Math.sin(stemPhase) * stemCurveVal;

        sFlOffsets[sfi * 3] = sx + curveX;
        sFlOffsets[sfi * 3 + 1] = sgy + sh;
        sFlOffsets[sfi * 3 + 2] = sz + curveZ;
        sFlScales[sfi] = sp.scale * (numStems > 1 ? (0.7 + seededRandom() * 0.3) : 1.0);
        sFlPhases[sfi] = stemPhase;
        sFlRotYs[sfi] = sp.rotY + (numStems > 1 ? seededRandom() * Math.PI : 0);
        sFlPetCol[sfi * 3] = sp.c.r;
        sFlPetCol[sfi * 3 + 1] = sp.c.g;
        sFlPetCol[sfi * 3 + 2] = sp.c.b;
        sFlSway[sfi] = 1.0;
        sfi++;
      }
    }

    const sGeo = buildFlowerGeometry(params);
    const stem = makeStemGroup(
      sStOffsets.subarray(0, ssi * 3), sStHeights.subarray(0, ssi),
      sStPhases.subarray(0, ssi), sStThick.subarray(0, ssi), sStCurve.subarray(0, ssi),
      new THREE.Color(params.singleStemBaseColor), new THREE.Color(params.singleStemTipColor));
    singleStemMesh = stem.mesh;
    singleStemMat = stem.mat;
    const flower = makeFlowerGroup(sGeo,
      sFlOffsets.subarray(0, sfi * 3), sFlScales.subarray(0, sfi),
      sFlPhases.subarray(0, sfi), sFlRotYs.subarray(0, sfi),
      sFlPetCol.subarray(0, sfi * 3), new THREE.Color(params.centerColor),
      sFlSway.subarray(0, sfi));
    singleFlowerMesh = flower.mesh;
    singleFlowerMat = flower.mat;
  }

  // ── Phase 3: expand bundle positions into multi-stem bell clusters ──
  // Stems and flowers-per-stem vary: param is max, min is max-1 (at least 2)
  if (bundlePositions.length > 0) {
    const maxStems = params.bundleStems;
    const minStems = Math.max(2, maxStems - 1);
    const maxFPS = params.bundleFlowersPerStem;
    const minFPS = Math.max(2, maxFPS - 1);
    // Allocate at max capacity
    const maxTotalStems = bundlePositions.length * maxStems;
    const maxTotalFlowers = maxTotalStems * maxFPS;

    const bStOffsets = new Float32Array(maxTotalStems * 3);
    const bStHeights = new Float32Array(maxTotalStems);
    const bStPhases = new Float32Array(maxTotalStems);
    const bStThick = new Float32Array(maxTotalStems);
    const bStCurve = new Float32Array(maxTotalStems);

    const bFlOffsets = new Float32Array(maxTotalFlowers * 3);
    const bFlScales = new Float32Array(maxTotalFlowers);
    const bFlPhases = new Float32Array(maxTotalFlowers);
    const bFlRotYs = new Float32Array(maxTotalFlowers);
    const bFlPetCol = new Float32Array(maxTotalFlowers * 3);
    const bFlSway = new Float32Array(maxTotalFlowers);

    let bsi = 0, bfi = 0;

    for (let i = 0; i < bundlePositions.length; i++) {
      const bp = bundlePositions[i];
      const baseSh = bp.sh * params.bundleStemHeightMult;
      const numStems = minStems + Math.floor(seededRandom() * (maxStems - minStems + 1));

      for (let s = 0; s < numStems; s++) {
        const stemAngle = (s / numStems) * Math.PI * 2 + seededRandom() * 0.5;
        const stemDist = params.bundleStemSpread * (0.5 + seededRandom() * 0.5);
        const sx = bp.x + Math.cos(stemAngle) * stemDist;
        const sz = bp.z + Math.sin(stemAngle) * stemDist;
        const sgy = getHeightAt(sx, sz);
        const sh = baseSh * (0.85 + seededRandom() * 0.3);
        const stemPhase = bp.phase + seededRandom() * 0.5;
        const stemCurveVal = params.bundleStemCurve * (0.7 + seededRandom() * 0.6);
        const stemThick = params.bundleStemThickness * (0.8 + seededRandom() * 0.4);

        bStOffsets[bsi * 3] = sx;
        bStOffsets[bsi * 3 + 1] = sgy;
        bStOffsets[bsi * 3 + 2] = sz;
        bStHeights[bsi] = sh;
        bStPhases[bsi] = stemPhase;
        bStThick[bsi] = stemThick;
        bStCurve[bsi] = stemCurveVal;
        bsi++;

        // Vary flowers per stem
        const numFlowers = minFPS + Math.floor(seededRandom() * (maxFPS - minFPS + 1));

        for (let f = 0; f < numFlowers; f++) {
          const relH = numFlowers > 1
            ? 0.5 + (f / (numFlowers - 1)) * 0.5
            : 1.0;

          const curveH = relH * relH;
          const curveX = Math.cos(stemPhase) * stemCurveVal * curveH;
          const curveZ = Math.sin(stemPhase) * stemCurveVal * curveH;
          const flowerScale = bp.scale * (0.5 + relH * 0.5);

          bFlOffsets[bfi * 3] = sx + curveX;
          bFlOffsets[bfi * 3 + 1] = sgy + relH * sh;
          bFlOffsets[bfi * 3 + 2] = sz + curveZ;
          bFlScales[bfi] = flowerScale;
          bFlPhases[bfi] = stemPhase;
          bFlRotYs[bfi] = bp.rotY + seededRandom() * Math.PI;
          bFlPetCol[bfi * 3] = bundleCol.r;
          bFlPetCol[bfi * 3 + 1] = bundleCol.g;
          bFlPetCol[bfi * 3 + 2] = bundleCol.b;
          bFlSway[bfi] = curveH;
          bfi++;
        }
      }
    }

    const bGeo = buildBellFlowerGeometry(params);
    const stem = makeStemGroup(
      bStOffsets.subarray(0, bsi * 3), bStHeights.subarray(0, bsi),
      bStPhases.subarray(0, bsi), bStThick.subarray(0, bsi), bStCurve.subarray(0, bsi),
      new THREE.Color(params.bundleStemBaseColor), new THREE.Color(params.bundleStemTipColor));
    bundleStemMesh = stem.mesh;
    bundleStemMat = stem.mat;
    const flower = makeFlowerGroup(bGeo,
      bFlOffsets.subarray(0, bfi * 3), bFlScales.subarray(0, bfi),
      bFlPhases.subarray(0, bfi), bFlRotYs.subarray(0, bfi),
      bFlPetCol.subarray(0, bfi * 3), new THREE.Color(params.bundleCenterColor),
      bFlSway.subarray(0, bfi));
    bundleFlowerMesh = flower.mesh;
    bundleFlowerMat = flower.mat;
  }
}

// ─── Lighting ────────────────────────────────────────────
function setupLighting() {
  scene.add(new THREE.AmbientLight(0xffe4c4, 0.6));
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(30, 40, 20);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffd4a0, 0.3);
  fill.position.set(-20, 10, -30);
  scene.add(fill);
}

// ─── Controls ────────────────────────────────────────────
const controls = new PointerLockControls(camera, document.body);
const overlay = document.getElementById('overlay');

overlay.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => overlay.classList.add('hidden'));
controls.addEventListener('unlock', () => {
  if (!chatOpen) overlay.classList.remove('hidden');
});

// ─── Chat UI ──────────────────────────────────────────────
const chatInput = document.getElementById('chat-input');
const chatToast = document.getElementById('chat-toast');
let chatOpen = false;
let toastTimer = null;

function openChat() {
  if (chatOpen) return;
  chatOpen = true;
  chatInput.style.display = 'block';
  chatInput.focus();
}

function closeChat() {
  if (!chatOpen) return;
  chatOpen = false;
  chatInput.style.display = 'none';
  chatInput.value = '';
  chatInput.blur();
  controls.lock();
}

function submitChat() {
  const text = chatInput.value.trim().slice(0, 100);
  if (!text) { closeChat(); return; }
  network.sendChat(text);
  closeChat();
}

function showToast(text) {
  chatToast.textContent = text;
  chatToast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => chatToast.classList.remove('visible'), 3000);
}

chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') submitChat();
  if (e.key === 'Escape') closeChat();
});

const keys = {};
document.addEventListener('keydown', (e) => {
  if (chatOpen) return;
  if (e.code === 'Tab') { e.preventDefault(); controls.unlock(); return; }
  if (e.code === 'KeyT' && controls.isLocked) {
    e.preventDefault();
    openChat();
    return;
  }
  keys[e.code] = true;
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

function updateMovement(dt) {
  if (!controls.isLocked) return;
  const speed = 8 * dt;
  const dir = new THREE.Vector3();
  if (keys['KeyW']) dir.z -= 1;
  if (keys['KeyS']) dir.z += 1;
  if (keys['KeyA']) dir.x -= 1;
  if (keys['KeyD']) dir.x += 1;
  if (dir.lengthSq() > 0) {
    dir.normalize();
    controls.moveRight(dir.x * speed);
    controls.moveForward(-dir.z * speed);
  }
  const p = camera.position;
  p.y = getHeightAt(p.x, p.z) + 1.7;

  network.sendPosition(p.x, p.y, p.z, camera.rotation.y);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Helpers: update uniforms across all flower materials ─
function setTimeOnAll(t) {
  if (singleStemMat) singleStemMat.uniforms.uTime.value = t;
  if (singleFlowerMat) singleFlowerMat.uniforms.uTime.value = t;
  if (bundleStemMat) bundleStemMat.uniforms.uTime.value = t;
  if (bundleFlowerMat) bundleFlowerMat.uniforms.uTime.value = t;
}

function setWindOnAll(v) {
  if (grassMat) grassMat.uniforms.uWindStrength.value = v;
  if (patchGrassMat) patchGrassMat.uniforms.uWindStrength.value = v;
  if (singleStemMat) singleStemMat.uniforms.uWindStrength.value = v;
  if (singleFlowerMat) singleFlowerMat.uniforms.uWindStrength.value = v;
  if (bundleStemMat) bundleStemMat.uniforms.uWindStrength.value = v;
  if (bundleFlowerMat) bundleFlowerMat.uniforms.uWindStrength.value = v;
}

// ─── GUI ─────────────────────────────────────────────────
let gui = null;
let presetCtrl = null;

function setupGUI() {
  gui = new GUI({ title: 'Flower Field' });

  let rebuildTimer = null;
  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildFlowers();
      network.sendParams(params);
    }, 80);
  }

  function updateWindUniform() {
    setWindOnAll(params.windStrength);
    network.sendParams(params);
  }

  function updateSingleCenterColor() {
    if (singleFlowerMat) singleFlowerMat.uniforms.uCenterColor.value.set(params.centerColor);
    network.sendParams(params);
  }

  function updateBundleCenterColor() {
    if (bundleFlowerMat) bundleFlowerMat.uniforms.uCenterColor.value.set(params.bundleCenterColor);
    network.sendParams(params);
  }

  // ── Preset ──
  presetCtrl = gui.add(params, 'preset', Object.keys(PRESETS)).name('Preset');
  presetCtrl.onChange((name) => {
    const p = PRESETS[name];
    if (p) {
      Object.assign(params, p);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      if (grassMat) {
        grassMat.uniforms.uBaseColor.value.set(params.grassBaseColor);
        grassMat.uniforms.uTipColor.value.set(params.grassTipColor);
        grassMat.uniforms.uHeightScale.value = params.grassHeight;
      }
      if (patchGrassMat) {
        patchGrassMat.uniforms.uBaseColor.value.set(params.patchBaseColor);
        patchGrassMat.uniforms.uTipColor.value.set(params.patchTipColor);
        patchGrassMat.uniforms.uHeightScale.value = params.patchHeight;
      }
      if (terrainMat) terrainMat.color.set(params.groundColor);
      scheduleRebuild();
    }
  });

  const presetActions = { save() {}, delete() {} };

  presetActions.save = function () {
    const name = prompt('Preset name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();

    const snapshot = {};
    for (const k of PRESET_KEYS) {
      if (k in params) snapshot[k] = params[k];
    }

    PRESETS[trimmed] = snapshot;
    params.preset = trimmed;
    presetCtrl.options(Object.keys(PRESETS));
    presetCtrl.updateDisplay();

    // Persist to server
    network.sendPresetSave(trimmed, snapshot);
  };

  presetActions.delete = function () {
    const builtIn = ['Desert Spring','Daisy','Poppy','Cosmos','Buttercup','Wild Rose','Sunflower'];
    const custom = Object.keys(PRESETS).filter(n => !builtIn.includes(n));
    if (custom.length === 0) { alert('No saved presets to delete.'); return; }
    const name = prompt('Delete preset:\n' + custom.join(', '));
    if (!name || !PRESETS[name] || builtIn.includes(name)) return;

    delete PRESETS[name];
    params.preset = Object.keys(PRESETS)[0];
    presetCtrl.options(Object.keys(PRESETS));
    presetCtrl.updateDisplay();

    network.sendPresetDelete(name);
  };

  gui.add(presetActions, 'save').name('💾 Save Preset');
  gui.add(presetActions, 'delete').name('🗑 Delete Preset');

  // ── Single shape ──
  const shape = gui.addFolder('Single Shape');
  shape.add(params, 'petalCount', 3, 12, 1).name('Petals').onChange(scheduleRebuild);
  shape.add(params, 'petalLength', 0.2, 1.0, 0.01).name('Petal Length').onChange(scheduleRebuild);
  shape.add(params, 'petalWidth', 0.2, 1.2, 0.01).name('Roundness').onChange(scheduleRebuild);
  shape.add(params, 'centerSize', 0.04, 0.3, 0.01).name('Center Size').onChange(scheduleRebuild);
  shape.add(params, 'singleStemThickness', 0.2, 1.2, 0.01).name('Stem Thick').onChange(scheduleRebuild);
  shape.add(params, 'singleStemCurve', 0.0, 0.4, 0.01).name('Stem Curve').onChange(scheduleRebuild);
  shape.add(params, 'singlePetalTilt', 0.0, 1.0, 0.01).name('Petal Tilt').onChange(scheduleRebuild);
  shape.add(params, 'singleBellWidth', 0.05, 0.4, 0.005).name('Bell Width').onChange(scheduleRebuild);
  shape.add(params, 'singleBellFlare', 0.0, 0.3, 0.005).name('Bell Flare').onChange(scheduleRebuild);
  shape.add(params, 'singleStems', 1, 6, 1).name('Stems').onChange(scheduleRebuild);
  shape.add(params, 'singleStemSpread', 0.02, 0.2, 0.005).name('Stem Spread').onChange(scheduleRebuild);

  // ── Bundle shape ──
  const bundle = gui.addFolder('Bundle Shape');
  bundle.add(params, 'bundleStems', 2, 6, 1).name('Stems').onChange(scheduleRebuild);
  bundle.add(params, 'bundleFlowersPerStem', 2, 4, 1).name('Flowers/Stem').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemSpread', 0.02, 0.2, 0.005).name('Stem Spread').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemThickness', 0.3, 1.2, 0.01).name('Stem Thick').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemCurve', 0.0, 0.4, 0.01).name('Stem Curve').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemHeightMult', 0.8, 2.0, 0.05).name('Height Mult').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalCount', 4, 12, 1).name('Petals').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalLength', 0.1, 0.6, 0.01).name('Petal Length').onChange(scheduleRebuild);
  bundle.add(params, 'bundleBellWidth', 0.05, 0.4, 0.005).name('Bell Width').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalWidth', 0.3, 1.2, 0.01).name('Roundness').onChange(scheduleRebuild);
  bundle.add(params, 'bundleBellFlare', 0.0, 0.3, 0.005).name('Bell Flare').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalTilt', 0.0, 1.0, 0.01).name('Petal Tilt').onChange(scheduleRebuild);
  bundle.add(params, 'bundleCenterSize', 0.02, 0.15, 0.01).name('Center Size').onChange(scheduleRebuild);

  // ── Size ──
  const size = gui.addFolder('Size');
  size.add(params, 'scaleMin', 0.1, 1.0, 0.01).name('Scale Min').onChange(scheduleRebuild);
  size.add(params, 'scaleMax', 0.2, 1.5, 0.01).name('Scale Max').onChange(scheduleRebuild);
  size.add(params, 'stemHeightMin', 0.1, 1.0, 0.01).name('Stem Min').onChange(scheduleRebuild);
  size.add(params, 'stemHeightMax', 0.2, 1.5, 0.01).name('Stem Max').onChange(scheduleRebuild);

  // ── Colors ──
  const colors = gui.addFolder('Colors');
  colors.addColor(params, 'primaryColor').name('Single 1').onChange(scheduleRebuild);
  colors.addColor(params, 'secondaryColor').name('Single 2').onChange(scheduleRebuild);
  colors.addColor(params, 'centerColor').name('Single Center').onChange(updateSingleCenterColor);
  colors.addColor(params, 'singleStemBaseColor').name('Stem Base').onChange(scheduleRebuild);
  colors.addColor(params, 'singleStemTipColor').name('Stem Tip').onChange(scheduleRebuild);
  colors.addColor(params, 'bundleColor').name('Bundle').onChange(scheduleRebuild);
  colors.addColor(params, 'bundleCenterColor').name('Bundle Center').onChange(updateBundleCenterColor);
  colors.addColor(params, 'bundleStemBaseColor').name('Bndl Stem Base').onChange(scheduleRebuild);
  colors.addColor(params, 'bundleStemTipColor').name('Bndl Stem Tip').onChange(scheduleRebuild);

  // ── Grass ──
  function updateGrassColors() {
    if (grassMat) {
      grassMat.uniforms.uBaseColor.value.set(params.grassBaseColor);
      grassMat.uniforms.uTipColor.value.set(params.grassTipColor);
    }
  }
  function updatePatchColors() {
    if (patchGrassMat) {
      patchGrassMat.uniforms.uBaseColor.value.set(params.patchBaseColor);
      patchGrassMat.uniforms.uTipColor.value.set(params.patchTipColor);
    }
  }
  function updateGrassHeight() {
    if (grassMat) grassMat.uniforms.uHeightScale.value = params.grassHeight;
  }
  function updatePatchHeight() {
    if (patchGrassMat) patchGrassMat.uniforms.uHeightScale.value = params.patchHeight;
  }
  const grass = gui.addFolder('Grass');
  grass.addColor(params, 'grassBaseColor').name('Base').onChange(updateGrassColors);
  grass.addColor(params, 'grassTipColor').name('Tip').onChange(updateGrassColors);
  grass.add(params, 'grassHeight', 0.2, 3.0, 0.05).name('Height').onChange(updateGrassHeight);
  grass.addColor(params, 'patchBaseColor').name('Patch Base').onChange(updatePatchColors);
  grass.addColor(params, 'patchTipColor').name('Patch Tip').onChange(updatePatchColors);
  grass.add(params, 'patchHeight', 0.2, 3.0, 0.05).name('Patch Height').onChange(updatePatchHeight);
  grass.addColor(params, 'groundColor').name('Ground').onChange(() => {
    if (terrainMat) terrainMat.color.set(params.groundColor);
  });

  // ── Field ──
  const field = gui.addFolder('Field');
  field.add(params, 'flowerCount', 500, 10000, 100).name('Count').onChange(scheduleRebuild);
  field.add(params, 'bundleRatio', 0, 1, 0.05).name('Bundle %').onChange(scheduleRebuild);
  field.add(params, 'windStrength', 0, 2, 0.01).name('Wind').onChange(updateWindUniform);

  shape.open();
  bundle.open();
  colors.open();
}

// ─── Player manager ──────────────────────────────────────
const playerManager = new PlayerManager(scene);

// ─── Network: apply remote param changes ─────────────────
function applyRemoteParams(remoteParams) {
  Object.assign(params, remoteParams);
  rebuildFlowers();
  setWindOnAll(params.windStrength);
  if (grassMat) {
    grassMat.uniforms.uBaseColor.value.set(params.grassBaseColor);
    grassMat.uniforms.uTipColor.value.set(params.grassTipColor);
    grassMat.uniforms.uHeightScale.value = params.grassHeight;
  }
  if (patchGrassMat) {
    patchGrassMat.uniforms.uBaseColor.value.set(params.patchBaseColor);
    patchGrassMat.uniforms.uTipColor.value.set(params.patchTipColor);
    patchGrassMat.uniforms.uHeightScale.value = params.patchHeight;
  }
  if (terrainMat) terrainMat.color.set(params.groundColor);
  if (singleFlowerMat) singleFlowerMat.uniforms.uCenterColor.value.set(params.centerColor);
  if (bundleFlowerMat) bundleFlowerMat.uniforms.uCenterColor.value.set(params.bundleCenterColor);
  if (gui) gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// ─── Init (deferred until server sends seed) ─────────────
createTerrain();
setupLighting();

network.connect({
  onInit({ seed, params: serverParams, players, presets: serverPresets }) {
    _flowerSeed = seed;

    // Merge server-saved presets into PRESETS
    if (serverPresets) {
      for (const [name, data] of Object.entries(serverPresets)) {
        PRESETS[name] = data;
      }
    }

    if (serverParams) Object.assign(params, serverParams);

    resetToSeed(seed + 1);
    createGrass();
    createPatchGrass();
    rebuildFlowers();

    setupGUI();

    for (const id of Object.keys(players)) {
      const pid = Number(id);
      playerManager.add(pid);
      const p = players[id];
      playerManager.updatePosition(pid, p.x, p.y, p.z, p.yaw);
    }

    animate();
  },
  onPlayerJoin(id) {
    playerManager.add(id);
  },
  onPlayerLeave(id) {
    playerManager.remove(id);
  },
  onPlayerMove(id, x, y, z, yaw) {
    playerManager.updatePosition(id, x, y, z, yaw);
  },
  onParamsUpdate(remoteParams) {
    applyRemoteParams(remoteParams);
  },
  onChat(id, text) {
    if (id === network.getMyId()) {
      showToast(text);
    } else {
      playerManager.showChat(id, text);
    }
  },
  onPresetSave(name, data) {
    PRESETS[name] = data;
    if (presetCtrl) {
      presetCtrl.options(Object.keys(PRESETS));
      presetCtrl.updateDisplay();
    }
  },
  onPresetDelete(name) {
    delete PRESETS[name];
    if (params.preset === name) {
      params.preset = Object.keys(PRESETS)[0];
    }
    if (presetCtrl) {
      presetCtrl.options(Object.keys(PRESETS));
      presetCtrl.updateDisplay();
    }
  },
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  if (grassMat) grassMat.uniforms.uTime.value = t;
  if (patchGrassMat) patchGrassMat.uniforms.uTime.value = t;
  setTimeOnAll(t);

  updateMovement(dt);
  playerManager.tick(dt);
  renderer.render(scene, camera);
}
