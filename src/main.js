import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import GUI from 'lil-gui';

import grassVert from './shaders/grass.vert.glsl';
import grassFrag from './shaders/grass.frag.glsl';
import stemVert from './shaders/stem.vert.glsl';
import stemFrag from './shaders/stem.frag.glsl';
import flowerVert from './shaders/flower.vert.glsl';
import flowerFrag from './shaders/flower.frag.glsl';
import watercolorVert from './shaders/watercolor.vert.glsl';
import ghibliFrag from './shaders/ghibli.frag.glsl';

import { resetToSeed, seededRandom } from './lib/prng.js';
import * as network from './lib/network.js';
import { PlayerManager } from './lib/players.js';
import { FIELD_SIZE, getHeightAt } from './lib/terrain.js';
import { PRESET_KEYS, PRESETS } from './lib/presets.js';
import { buildFlowerHead, buildFlowerGeometry, buildBellFlowerGeometry, buildClusterBudGeometry } from './lib/flowers.js';
import { isPatchCell, PATCH_CELL_SIZE } from './lib/placement.js';
import { createGrassBladeVertices, GRASS_BLADE_INDICES, createPatchBladeVertices, PATCH_BLADE_INDICES } from './lib/grass.js';

// ─── Config ──────────────────────────────────────────────
const FOG_COLOR = new THREE.Color(0x87ceeb);
const FOG_NEAR = 30;
const FOG_FAR = 90;
const SUN_DIR = new THREE.Vector3(30, 40, 20).normalize();

// ─── Tweakable params ────────────────────────────────────
const params = {
  preset: "Howl's Secret Garden",

  // Single wildflower shape
  petalCount: 5,
  petalLength: 0.15,
  petalWidth: 0.7,
  centerSize: 0.04,
  singleStems: 4,
  singleStemSpread: 0.06,
  singleStemThickness: 0.25,
  singleStemCurve: 0.0,
  singleBellWidth: 0.08,
  singleBellFlare: 0.0,
  singlePetalTilt: 0.0,

  // Bundled bell-flower shape
  bundleStems: 4,
  bundleFlowersPerStem: 4,
  bundleStemSpread: 0.12,
  bundleStemThickness: 0.3,
  bundleStemCurve: 0.2,
  bundleStemHeightMult: 1.8,
  bundlePetalCount: 1,
  bundlePetalLength: 0.12,
  bundlePetalWidth: 1.2,
  bundleBellWidth: 0.14,
  bundleBellFlare: 0.02,
  bundlePetalTilt: 0.85,
  bundleCenterSize: 0.03,

  // Cluster flower shape
  clusterStems: 1,
  clusterBudsPerStem: 6,
  clusterBudSpread: 0.04,
  clusterStemThickness: 0.4,
  clusterStemCurve: 0.1,
  clusterStemHeightMult: 1.4,
  clusterPetalCount: 5,
  clusterPetalLength: 0.08,
  clusterPetalWidth: 0.55,
  clusterBellWidth: 0.06,
  clusterBellFlare: 0.01,
  clusterPetalTilt: 0.92,
  clusterCenterSize: 0.02,

  // Scale & field
  scaleMin: 0.1,
  scaleMax: 0.75,
  flowerCount: 180000,
  singlePct: 90,
  bundlePct: 8,
  clusterPct: 20,
  stemHeightMin: 0.2,
  stemHeightMax: 0.75,

  // Colors — singles
  primaryColor: '#ffffff',
  secondaryColor: '#ffe5f0',
  centerColor: '#ffee70',

  // Colors — bundles (coral)
  bundleColor: '#ffc7d6',
  bundleCenterColor: '#f58fa8',

  // Colors — clusters (lavender)
  clusterColor: '#b49adb',
  clusterCenterColor: '#9a84c0',

  // Stems
  singleStemBaseColor: '#5a9a48',
  singleStemTipColor: '#5a9a48',
  bundleStemBaseColor: '#9fc119',
  bundleStemTipColor: '#6a9a55',
  clusterStemBaseColor: '#71c261',
  clusterStemTipColor: '#71c261',

  // Grass
  grassCount: 5000,
  grassBaseColor: '#41a45a',
  grassTipColor: '#add978',
  grassHeight: 0.2,
  patchBaseColor: '#1d8724',
  patchTipColor: '#56a13a',
  patchHeight: 0.55,
  groundColor: '#d9ff42',

  // Wind
  windStrength: 0.6,

  // Cel-shading
  celBands: 3.0,
  celSoftness: 0.08,
  ambientStrength: 0.65,
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
camera.position.set(-8, 3, 8); // spawn outside the cottage

// ─── Post-Processing ────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const pixelRatio = renderer.getPixelRatio();
const GhibliShader = {
  uniforms: {
    tDiffuse:           { value: null },
    uResolution:        { value: new THREE.Vector2(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio) },
    uOutlineStrength:   { value: 0.4 },
    uOutlineThickness:  { value: 1.0 },
    uColorSteps:        { value: 14.0 },
    uQuantizeStrength:  { value: 0.15 },
    uWarmth:            { value: 0.15 },
    uSaturation:        { value: 1.2 },
    uHazeStrength:      { value: 0.1 },
    uHazeColor:         { value: new THREE.Color(0.53, 0.81, 0.92) }, // sky blue
  },
  vertexShader: watercolorVert,
  fragmentShader: ghibliFrag,
};

const ghibliPass = new ShaderPass(GhibliShader);
composer.addPass(ghibliPass);

// ─── Terrain ─────────────────────────────────────────────
function createGroundTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Light base
  ctx.fillStyle = '#e8f0d8';
  ctx.fillRect(0, 0, size, size);

  // Large soft blotches for color variation across the ground
  for (let i = 0; i < 30; i++) {
    const x = seededRandom() * size;
    const y = seededRandom() * size;
    const r = 40 + seededRandom() * 80;
    ctx.globalAlpha = 0.15 + seededRandom() * 0.15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hues = ['#b8d888', '#d8e8a0', '#e8e070', '#f0e860'];
    const hue = hues[Math.floor(seededRandom() * hues.length)];
    grad.addColorStop(0, hue);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Dense grass blade strokes — high contrast, visible
  const bladeColors = ['#6a9840', '#88b858', '#a0c868', '#4a7828', '#78a848', '#c0d888', '#c8d050', '#d8e060', '#b0c040'];
  ctx.lineCap = 'round';
  for (let i = 0; i < 6000; i++) {
    const x = seededRandom() * size;
    const y = seededRandom() * size;
    const len = 4 + seededRandom() * 12;
    const angle = -Math.PI / 2 + (seededRandom() - 0.5) * 1.0;
    ctx.globalAlpha = 0.4 + seededRandom() * 0.4;
    ctx.strokeStyle = bladeColors[Math.floor(seededRandom() * bladeColors.length)];
    ctx.lineWidth = 1 + seededRandom() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Small dark clumps for depth
  for (let i = 0; i < 400; i++) {
    const x = seededRandom() * size;
    const y = seededRandom() * size;
    ctx.globalAlpha = 0.2 + seededRandom() * 0.15;
    ctx.fillStyle = '#3a5a1a';
    ctx.beginPath();
    ctx.arc(x, y, 1 + seededRandom() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright yellow-green highlights
  const highlightColors = ['#e8ffa0', '#f0f060', '#ffe850', '#f8f080', '#e0e040'];
  for (let i = 0; i < 500; i++) {
    const x = seededRandom() * size;
    const y = seededRandom() * size;
    ctx.globalAlpha = 0.3 + seededRandom() * 0.25;
    ctx.fillStyle = highlightColors[Math.floor(seededRandom() * highlightColors.length)];
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + seededRandom() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scattered flower-like spots — coral, pink, yellow
  const flowerSpots = [
    '#ff7f6a', '#ff6b5a', '#e86050',           // coral
    '#ff90b0', '#ffa0c0', '#ff78a8', '#e870a0', // pink
    '#ffe040', '#ffd030', '#ffea60', '#f0d020',  // yellow
  ];
  for (let i = 0; i < 350; i++) {
    const x = seededRandom() * size;
    const y = seededRandom() * size;
    const r = 1 + seededRandom() * 2.5;
    ctx.globalAlpha = 0.5 + seededRandom() * 0.35;
    ctx.fillStyle = flowerSpots[Math.floor(seededRandom() * flowerSpots.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getHeightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const groundTex = createGroundTexture();
  terrainMat = new THREE.MeshLambertMaterial({
    color: params.groundColor,
    map: groundTex,
  });
  scene.add(new THREE.Mesh(geo, terrainMat));
}

// ─── Grass ───────────────────────────────────────────────
function createGrassBlade() {
  const verts = new Float32Array(createGrassBladeVertices());
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  base.setIndex(GRASS_BLADE_INDICES);
  return base;
}

const cameraPosUniform = new THREE.Vector3();

let grassMesh = null, grassMat = null;
let patchGrassMesh = null, patchGrassMat = null;
let terrainMat = null;

function createGrass() {
  cleanupMeshAndMat(grassMesh, grassMat);
  grassMesh = grassMat = null;

  const count = Math.round(params.grassCount);
  const base = createGrassBlade();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));

  const offsets = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
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
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uCameraPos: { value: cameraPosUniform },
      uHeightScale: { value: params.grassHeight },
      uBaseColor: { value: new THREE.Color(params.grassBaseColor) },
      uTipColor: { value: new THREE.Color(params.grassTipColor) },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
      uLightDir: { value: SUN_DIR },
      uCelBands: { value: params.celBands },
      uCelSoftness: { value: params.celSoftness },
      uAmbientStrength: { value: params.ambientStrength },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  grassMesh = mesh;
  grassMat = mat;
}

// ─── Patch Grass (weed clumps) ──────────────────────────
function createPatchBlade() {
  const verts = new Float32Array(createPatchBladeVertices());
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  base.setIndex(PATCH_BLADE_INDICES);
  return base;
}

function createPatchGrass() {
  cleanupMeshAndMat(patchGrassMesh, patchGrassMat);
  patchGrassMesh = patchGrassMat = null;

  const patchCount = Math.round(params.grassCount * 0.2);
  const base = createPatchBlade();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));

  const offsets = new Float32Array(patchCount * 3);
  const scales = new Float32Array(patchCount);
  const phases = new Float32Array(patchCount);

  let placed = 0;
  let attempts = 0;
  const maxAttempts = patchCount * 8;

  while (placed < patchCount && attempts < maxAttempts) {
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
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uCameraPos: { value: cameraPosUniform },
      uHeightScale: { value: params.patchHeight },
      uBaseColor: { value: new THREE.Color(params.patchBaseColor) },
      uTipColor: { value: new THREE.Color(params.patchTipColor) },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
      uLightDir: { value: SUN_DIR },
      uCelBands: { value: params.celBands },
      uCelSoftness: { value: params.celSoftness },
      uAmbientStrength: { value: params.ambientStrength },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  patchGrassMesh = mesh;
  patchGrassMat = mat;
}

function rebuildAllGrass() {
  resetToSeed(_flowerSeed + 1);
  createGrass();
  createPatchGrass();
}

// ─── Shared flower geometry builder ──────────────────────
// Wraps pure buildFlowerHead from lib into THREE.BufferGeometry
function buildFlowerHeadGeo(shapeParams) {
  const { vertices, petalDists, indices } = buildFlowerHead(shapeParams);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('petalDist', new THREE.Float32BufferAttribute(petalDists, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildFlowerGeo(p) {
  const { vertices, petalDists, indices } = buildFlowerGeometry(p);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('petalDist', new THREE.Float32BufferAttribute(petalDists, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildBellFlowerGeo(p) {
  const { vertices, petalDists, indices } = buildBellFlowerGeometry(p);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('petalDist', new THREE.Float32BufferAttribute(petalDists, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildClusterBudGeo(p) {
  const { vertices, petalDists, indices } = buildClusterBudGeometry(p);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('petalDist', new THREE.Float32BufferAttribute(petalDists, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Flower + stem instance management ───────────────────
let singleStemMesh = null, singleStemMat = null;
let singleFlowerMesh = null, singleFlowerMat = null;
let bundleStemMesh = null, bundleStemMat = null;
let bundleFlowerMesh = null, bundleFlowerMat = null;
let clusterStemMesh = null, clusterStemMat = null;
let clusterFlowerMesh = null, clusterFlowerMat = null;
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
      uCameraPos: { value: cameraPosUniform },
      uStemBase: { value: baseColor },
      uStemTip: { value: tipColor },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
      uLightDir: { value: SUN_DIR },
      uCelBands: { value: params.celBands },
      uCelSoftness: { value: params.celSoftness },
      uAmbientStrength: { value: params.ambientStrength },
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
  geo.setAttribute('normal', baseGeo.getAttribute('normal'));
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
      uCameraPos: { value: cameraPosUniform },
      uCenterColor: { value: centerCol },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
      uLightDir: { value: SUN_DIR },
      uCelBands: { value: params.celBands },
      uCelSoftness: { value: params.celSoftness },
      uAmbientStrength: { value: params.ambientStrength },
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
  cleanupMeshAndMat(clusterStemMesh, clusterStemMat);
  cleanupMeshAndMat(clusterFlowerMesh, clusterFlowerMat);
  singleStemMesh = singleStemMat = null;
  singleFlowerMesh = singleFlowerMat = null;
  bundleStemMesh = bundleStemMat = null;
  bundleFlowerMesh = bundleFlowerMat = null;
  clusterStemMesh = clusterStemMat = null;
  clusterFlowerMesh = clusterFlowerMat = null;

  resetToSeed(_flowerSeed);

  const totalCount = Math.round(params.flowerCount);
  const pctSum = (params.singlePct + params.bundlePct + params.clusterPct) || 1;
  const clusterCount = Math.round(totalCount * params.clusterPct / pctSum);
  const bundleCount = Math.round(totalCount * params.bundlePct / pctSum);
  const singleCount = Math.max(0, totalCount - clusterCount - bundleCount);

  const singleColors = [
    new THREE.Color(params.primaryColor),
    new THREE.Color(params.secondaryColor),
  ];
  const bundleCol = new THREE.Color(params.bundleColor);
  const clusterCol = new THREE.Color(params.clusterColor);

  // ── Phase 1: rejection-sampled patch placement ──
  const singlePositions = [];
  const bundlePositions = [];
  const clusterPositions = [];

  let placed = 0;
  let attempts = 0;
  const maxAttempts = totalCount * 4;

  while (placed < totalCount && attempts < maxAttempts) {
    attempts++;
    const x = (seededRandom() - 0.5) * FIELD_SIZE;
    const z = (seededRandom() - 0.5) * FIELD_SIZE;

    // Patch-based acceptance (different seed from grass patches)
    const cx = Math.floor(x / PATCH_CELL_SIZE);
    const cz = Math.floor(z / PATCH_CELL_SIZE);
    const inPatch = isPatchCell(cx, cz, _flowerSeed + 42);
    if (!inPatch && seededRandom() > 0.17) continue;

    const gy = getHeightAt(x, z);
    const sh = params.stemHeightMin + seededRandom() * (params.stemHeightMax - params.stemHeightMin);
    const scale = params.scaleMin + seededRandom() * (params.scaleMax - params.scaleMin);
    const phase = seededRandom() * Math.PI * 2;
    const rotY = seededRandom() * Math.PI * 2;
    const colorRand = seededRandom();

    if (placed < clusterCount) {
      clusterPositions.push({ x, z, gy, sh, scale, phase, rotY });
    } else if (placed < clusterCount + bundleCount) {
      bundlePositions.push({ x, z, gy, sh, scale, phase, rotY });
    } else {
      const c = singleColors[Math.floor(colorRand * singleColors.length)];
      singlePositions.push({ x, z, gy, sh, scale, phase, rotY, c });
    }
    placed++;
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

    const sGeo = buildFlowerGeo(params);
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

    const bGeo = buildBellFlowerGeo(params);
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

  // ── Phase 4: expand cluster positions into tight bud rings at stem tops ──
  if (clusterPositions.length > 0) {
    const maxStems = params.clusterStems;
    const minStems = Math.max(1, maxStems);
    const budsPerStem = params.clusterBudsPerStem;
    const maxTotalStems = clusterPositions.length * maxStems;
    const maxTotalBuds = maxTotalStems * budsPerStem;

    const cStOffsets = new Float32Array(maxTotalStems * 3);
    const cStHeights = new Float32Array(maxTotalStems);
    const cStPhases = new Float32Array(maxTotalStems);
    const cStThick = new Float32Array(maxTotalStems);
    const cStCurve = new Float32Array(maxTotalStems);

    const cFlOffsets = new Float32Array(maxTotalBuds * 3);
    const cFlScales = new Float32Array(maxTotalBuds);
    const cFlPhases = new Float32Array(maxTotalBuds);
    const cFlRotYs = new Float32Array(maxTotalBuds);
    const cFlPetCol = new Float32Array(maxTotalBuds * 3);
    const cFlSway = new Float32Array(maxTotalBuds);

    let csi = 0, cfi = 0;

    for (let i = 0; i < clusterPositions.length; i++) {
      const cp = clusterPositions[i];
      const baseSh = cp.sh * params.clusterStemHeightMult;

      for (let s = 0; s < maxStems; s++) {
        let sx = cp.x, sz = cp.z;
        let stemPhase = cp.phase;

        if (maxStems > 1) {
          const stemAngle = (s / maxStems) * Math.PI * 2 + seededRandom() * 0.5;
          const stemDist = 0.05 * (0.5 + seededRandom() * 0.5);
          sx += Math.cos(stemAngle) * stemDist;
          sz += Math.sin(stemAngle) * stemDist;
          stemPhase += seededRandom() * 0.5;
        }

        const sgy = getHeightAt(sx, sz);
        const sh = baseSh * (0.85 + seededRandom() * 0.3);
        const stemCurveVal = params.clusterStemCurve * (0.7 + seededRandom() * 0.6);
        const stemThick = params.clusterStemThickness * (0.8 + seededRandom() * 0.4);

        cStOffsets[csi * 3] = sx;
        cStOffsets[csi * 3 + 1] = sgy;
        cStOffsets[csi * 3 + 2] = sz;
        cStHeights[csi] = sh;
        cStPhases[csi] = stemPhase;
        cStThick[csi] = stemThick;
        cStCurve[csi] = stemCurveVal;
        csi++;

        // Buds packed tightly at stem top in a radial ring
        for (let b = 0; b < budsPerStem; b++) {
          const relH = 0.88 + (b / Math.max(1, budsPerStem - 1)) * 0.12;
          const budAngle = (b / budsPerStem) * Math.PI * 2 + seededRandom() * 0.4;
          const budDist = params.clusterBudSpread * (0.6 + seededRandom() * 0.4);

          const curveH = relH * relH;
          const curveX = Math.cos(stemPhase) * stemCurveVal * curveH;
          const curveZ = Math.sin(stemPhase) * stemCurveVal * curveH;

          const budX = sx + curveX + Math.cos(budAngle) * budDist;
          const budZ = sz + curveZ + Math.sin(budAngle) * budDist;
          const budScale = cp.scale * (0.4 + seededRandom() * 0.3);

          cFlOffsets[cfi * 3] = budX;
          cFlOffsets[cfi * 3 + 1] = sgy + relH * sh;
          cFlOffsets[cfi * 3 + 2] = budZ;
          cFlScales[cfi] = budScale;
          cFlPhases[cfi] = stemPhase;
          cFlRotYs[cfi] = cp.rotY + seededRandom() * Math.PI;
          cFlPetCol[cfi * 3] = clusterCol.r;
          cFlPetCol[cfi * 3 + 1] = clusterCol.g;
          cFlPetCol[cfi * 3 + 2] = clusterCol.b;
          cFlSway[cfi] = curveH;
          cfi++;
        }
      }
    }

    const cGeo = buildClusterBudGeo(params);
    const stem = makeStemGroup(
      cStOffsets.subarray(0, csi * 3), cStHeights.subarray(0, csi),
      cStPhases.subarray(0, csi), cStThick.subarray(0, csi), cStCurve.subarray(0, csi),
      new THREE.Color(params.clusterStemBaseColor), new THREE.Color(params.clusterStemTipColor));
    clusterStemMesh = stem.mesh;
    clusterStemMat = stem.mat;
    const flower = makeFlowerGroup(cGeo,
      cFlOffsets.subarray(0, cfi * 3), cFlScales.subarray(0, cfi),
      cFlPhases.subarray(0, cfi), cFlRotYs.subarray(0, cfi),
      cFlPetCol.subarray(0, cfi * 3), new THREE.Color(params.clusterCenterColor),
      cFlSway.subarray(0, cfi));
    clusterFlowerMesh = flower.mesh;
    clusterFlowerMat = flower.mat;
  }
}

// ─── Lighting ────────────────────────────────────────────
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffe4c4, 0.6);
  ambient.layers.enableAll();
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(30, 40, 20);
  sun.layers.enableAll();
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffd4a0, 0.3);
  fill.position.set(-20, 10, -30);
  fill.layers.enableAll();
  scene.add(fill);
}

// ─── Controls ────────────────────────────────────────────
const controls = new PointerLockControls(camera, document.body);
const overlay = document.getElementById('overlay');
const isMobile = 'ontouchstart' in window && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let mobileActive = false;

overlay.textContent = isMobile ? 'Tap to enter the meadow' : 'Click to enter the meadow';
if (isMobile) {
  overlay.addEventListener('click', () => {
    mobileActive = true;
    overlay.classList.add('hidden');
    document.body.classList.add('mobile-active');
  });
} else {
  overlay.addEventListener('click', () => controls.lock());
}
controls.addEventListener('lock', () => overlay.classList.add('hidden'));
controls.addEventListener('unlock', () => {
  if (!chatOpen && !isMobile) overlay.classList.remove('hidden');
});

// ─── Mobile touch: camera look ───────────────────────────
let mobileLookTouchId = null;
let mobileLookLastX = 0;
let mobileLookLastY = 0;
const mobileYaw = { value: 0 };
const mobilePitch = { value: 0 };
const LOOK_SENSITIVITY = 0.004;

if (isMobile) {
  // Initialize yaw/pitch from camera
  mobileYaw.value = camera.rotation.y;
  mobilePitch.value = camera.rotation.x;

  const canvas = document.querySelector('canvas') || document.body;

  document.addEventListener('touchstart', (e) => {
    if (!mobileActive) return;
    for (const touch of e.changedTouches) {
      // Ignore touches on UI elements
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && (el.id === 'mobile-joystick' || el.id === 'mobile-chat-btn' ||
                 el.id === 'chat-input' || el.closest?.('#mobile-joystick'))) continue;
      if (mobileLookTouchId === null) {
        mobileLookTouchId = touch.identifier;
        mobileLookLastX = touch.clientX;
        mobileLookLastY = touch.clientY;
      }
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!mobileActive) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === mobileLookTouchId) {
        const dx = touch.clientX - mobileLookLastX;
        const dy = touch.clientY - mobileLookLastY;
        mobileYaw.value -= dx * LOOK_SENSITIVITY;
        mobilePitch.value -= dy * LOOK_SENSITIVITY;
        mobilePitch.value = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, mobilePitch.value));
        mobileLookLastX = touch.clientX;
        mobileLookLastY = touch.clientY;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === mobileLookTouchId) {
        mobileLookTouchId = null;
      }
    }
  }, { passive: true });

  document.addEventListener('touchcancel', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === mobileLookTouchId) {
        mobileLookTouchId = null;
      }
    }
  }, { passive: true });
}

// ─── Mobile touch: virtual joystick ──────────────────────
const mobileMove = { x: 0, z: 0 };
let joystickTouchId = null;

if (isMobile) {
  const joystick = document.getElementById('mobile-joystick');
  const knob = document.getElementById('mobile-joystick-knob');
  const JOYSTICK_MAX = 40; // max knob displacement in px

  joystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
  }, { passive: false });

  joystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        const rect = joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > JOYSTICK_MAX) {
          dx = (dx / dist) * JOYSTICK_MAX;
          dy = (dy / dist) * JOYSTICK_MAX;
        }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        mobileMove.x = dx / JOYSTICK_MAX;
        mobileMove.z = dy / JOYSTICK_MAX;
      }
    }
  }, { passive: false });

  const resetJoystick = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        joystickTouchId = null;
        knob.style.transform = 'translate(-50%, -50%)';
        mobileMove.x = 0;
        mobileMove.z = 0;
      }
    }
  };
  joystick.addEventListener('touchend', resetJoystick);
  joystick.addEventListener('touchcancel', resetJoystick);

  // Mobile chat button
  const chatBtn = document.getElementById('mobile-chat-btn');
  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openChat();
  });
}

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
  if (!isMobile) controls.lock();
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

const velocity = new THREE.Vector3();
const MOVE_SPEED = 8;
const DAMPING = 8; // higher = snappier, lower = floatier

function updateMovement(dt) {
  const isActive = isMobile ? mobileActive : controls.isLocked;

  if (isActive) {
    // On mobile, update camera rotation from touch look
    if (isMobile) {
      camera.rotation.order = 'YXZ';
      camera.rotation.y = mobileYaw.value;
      camera.rotation.x = mobilePitch.value;
    }

    const target = new THREE.Vector3();

    if (isMobile) {
      // Joystick: x = left/right, z = up/down (forward/back)
      target.x = mobileMove.x;
      target.z = mobileMove.z;
    } else {
      if (keys['KeyW']) target.z -= 1;
      if (keys['KeyS']) target.z += 1;
      if (keys['KeyA']) target.x -= 1;
      if (keys['KeyD']) target.x += 1;
    }

    if (target.lengthSq() > 0) target.normalize();
    target.multiplyScalar(MOVE_SPEED);

    // Smooth acceleration / deceleration
    const t = 1 - Math.exp(-DAMPING * dt);
    velocity.lerp(target, t);

    if (velocity.lengthSq() > 0.0001) {
      if (isMobile) {
        // Move relative to camera yaw (forward = -Z in Three.js)
        const yaw = camera.rotation.y;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        camera.position.x += (cos * velocity.x + sin * velocity.z) * dt;
        camera.position.z += (-sin * velocity.x + cos * velocity.z) * dt;
      } else {
        controls.moveRight(velocity.x * dt);
        controls.moveForward(-velocity.z * dt);
      }
    }
    const p = camera.position;
    p.y = getHeightAt(p.x, p.z) + 1.7;
  }

  // Always send position so other players see us, even before entering
  network.sendPosition(camera.position.x, camera.position.y, camera.position.z, camera.rotation.y);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  const pr = renderer.getPixelRatio();
  composer.setSize(w * pr, h * pr);
  ghibliPass.uniforms.uResolution.value.set(w * pr, h * pr);
});

// ─── Helpers: update uniforms across all flower materials ─
function setTimeOnAll(t) {
  if (singleStemMat) singleStemMat.uniforms.uTime.value = t;
  if (singleFlowerMat) singleFlowerMat.uniforms.uTime.value = t;
  if (bundleStemMat) bundleStemMat.uniforms.uTime.value = t;
  if (bundleFlowerMat) bundleFlowerMat.uniforms.uTime.value = t;
  if (clusterStemMat) clusterStemMat.uniforms.uTime.value = t;
  if (clusterFlowerMat) clusterFlowerMat.uniforms.uTime.value = t;
}

function setWindOnAll(v) {
  if (grassMat) grassMat.uniforms.uWindStrength.value = v;
  if (patchGrassMat) patchGrassMat.uniforms.uWindStrength.value = v;
  if (singleStemMat) singleStemMat.uniforms.uWindStrength.value = v;
  if (singleFlowerMat) singleFlowerMat.uniforms.uWindStrength.value = v;
  if (bundleStemMat) bundleStemMat.uniforms.uWindStrength.value = v;
  if (bundleFlowerMat) bundleFlowerMat.uniforms.uWindStrength.value = v;
  if (clusterStemMat) clusterStemMat.uniforms.uWindStrength.value = v;
  if (clusterFlowerMat) clusterFlowerMat.uniforms.uWindStrength.value = v;
}

function setCelUniformOnAll(name, value) {
  const mats = [grassMat, patchGrassMat, singleStemMat, singleFlowerMat,
                bundleStemMat, bundleFlowerMat, clusterStemMat, clusterFlowerMat];
  for (const m of mats) {
    if (m && m.uniforms[name]) m.uniforms[name].value = value;
  }
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

  function updateClusterCenterColor() {
    if (clusterFlowerMat) clusterFlowerMat.uniforms.uCenterColor.value.set(params.clusterCenterColor);
    network.sendParams(params);
  }

  // ── Preset ──
  presetCtrl = gui.add(params, 'preset', Object.keys(PRESETS)).name('Preset');
  presetCtrl.onChange((name) => {
    const p = PRESETS[name];
    if (p) {
      const oldGrassCount = params.grassCount;
      Object.assign(params, p);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      if (params.grassCount !== oldGrassCount) {
        rebuildAllGrass();
      } else {
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
      }
      if (terrainMat) terrainMat.color.set(params.groundColor);
      setCelUniformOnAll('uCelBands', params.celBands);
      setCelUniformOnAll('uCelSoftness', params.celSoftness);
      setCelUniformOnAll('uAmbientStrength', params.ambientStrength);
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
    const builtIn = ['Desert Spring',"Howl's Secret Garden",'Daisy','Poppy','Cosmos','Buttercup','Wild Rose','Sunflower'];
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

  // ── Singles ──
  // Consistent order: Count → Petals → Petal Length → Roundness → Center Size →
  //   Petal Tilt → Bell Width → Bell Flare → Stems → Stem Spread → Stem Thick → Stem Curve →
  //   Colors (petal, center, stem base, stem tip)
  const single = gui.addFolder('Singles');
  single.add(params, 'singlePct', 0, 100, 1).name('%').onChange(scheduleRebuild);
  single.add(params, 'petalCount', 3, 12, 1).name('Petals').onChange(scheduleRebuild);
  single.add(params, 'petalLength', 0.2, 1.0, 0.01).name('Petal Length').onChange(scheduleRebuild);
  single.add(params, 'petalWidth', 0.2, 1.2, 0.01).name('Roundness').onChange(scheduleRebuild);
  single.add(params, 'centerSize', 0.04, 0.3, 0.01).name('Center Size').onChange(scheduleRebuild);
  single.add(params, 'singlePetalTilt', 0.0, 1.0, 0.01).name('Petal Tilt').onChange(scheduleRebuild);
  single.add(params, 'singleBellWidth', 0.05, 0.4, 0.005).name('Bell Width').onChange(scheduleRebuild);
  single.add(params, 'singleBellFlare', 0.0, 0.3, 0.005).name('Bell Flare').onChange(scheduleRebuild);
  single.add(params, 'singleStems', 1, 6, 1).name('Stems').onChange(scheduleRebuild);
  single.add(params, 'singleStemSpread', 0.02, 0.2, 0.005).name('Stem Spread').onChange(scheduleRebuild);
  single.add(params, 'singleStemThickness', 0.2, 1.2, 0.01).name('Stem Thick').onChange(scheduleRebuild);
  single.add(params, 'singleStemCurve', 0.0, 0.4, 0.01).name('Stem Curve').onChange(scheduleRebuild);
  single.addColor(params, 'primaryColor').name('Color 1').onChange(scheduleRebuild);
  single.addColor(params, 'secondaryColor').name('Color 2').onChange(scheduleRebuild);
  single.addColor(params, 'centerColor').name('Center').onChange(updateSingleCenterColor);
  single.addColor(params, 'singleStemBaseColor').name('Stem Base').onChange(scheduleRebuild);
  single.addColor(params, 'singleStemTipColor').name('Stem Tip').onChange(scheduleRebuild);

  // ── Bundles ──
  const bundle = gui.addFolder('Bundles');
  bundle.add(params, 'bundlePct', 0, 100, 1).name('%').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalCount', 1, 12, 1).name('Petals').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalLength', 0.1, 0.6, 0.01).name('Petal Length').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalWidth', 0.3, 1.2, 0.01).name('Roundness').onChange(scheduleRebuild);
  bundle.add(params, 'bundleCenterSize', 0.02, 0.15, 0.01).name('Center Size').onChange(scheduleRebuild);
  bundle.add(params, 'bundlePetalTilt', 0.0, 1.0, 0.01).name('Petal Tilt').onChange(scheduleRebuild);
  bundle.add(params, 'bundleBellWidth', 0.05, 0.4, 0.005).name('Bell Width').onChange(scheduleRebuild);
  bundle.add(params, 'bundleBellFlare', 0.0, 0.3, 0.005).name('Bell Flare').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStems', 2, 6, 1).name('Stems').onChange(scheduleRebuild);
  bundle.add(params, 'bundleFlowersPerStem', 2, 4, 1).name('Flowers/Stem').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemSpread', 0.02, 0.2, 0.005).name('Stem Spread').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemThickness', 0.3, 1.2, 0.01).name('Stem Thick').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemCurve', 0.0, 0.4, 0.01).name('Stem Curve').onChange(scheduleRebuild);
  bundle.add(params, 'bundleStemHeightMult', 0.8, 2.0, 0.05).name('Height Mult').onChange(scheduleRebuild);
  bundle.addColor(params, 'bundleColor').name('Color').onChange(scheduleRebuild);
  bundle.addColor(params, 'bundleCenterColor').name('Center').onChange(updateBundleCenterColor);
  bundle.addColor(params, 'bundleStemBaseColor').name('Stem Base').onChange(scheduleRebuild);
  bundle.addColor(params, 'bundleStemTipColor').name('Stem Tip').onChange(scheduleRebuild);

  // ── Clusters ──
  const cluster = gui.addFolder('Clusters');
  cluster.add(params, 'clusterPct', 0, 100, 1).name('%').onChange(scheduleRebuild);
  cluster.add(params, 'clusterPetalCount', 3, 10, 1).name('Petals').onChange(scheduleRebuild);
  cluster.add(params, 'clusterPetalLength', 0.04, 0.3, 0.01).name('Petal Length').onChange(scheduleRebuild);
  cluster.add(params, 'clusterPetalWidth', 0.2, 1.2, 0.01).name('Roundness').onChange(scheduleRebuild);
  cluster.add(params, 'clusterCenterSize', 0.01, 0.1, 0.005).name('Center Size').onChange(scheduleRebuild);
  cluster.add(params, 'clusterPetalTilt', 0.0, 1.0, 0.01).name('Petal Tilt').onChange(scheduleRebuild);
  cluster.add(params, 'clusterBellWidth', 0.02, 0.2, 0.005).name('Bell Width').onChange(scheduleRebuild);
  cluster.add(params, 'clusterBellFlare', 0.0, 0.15, 0.005).name('Bell Flare').onChange(scheduleRebuild);
  cluster.add(params, 'clusterStems', 1, 4, 1).name('Stems').onChange(scheduleRebuild);
  cluster.add(params, 'clusterBudsPerStem', 3, 10, 1).name('Buds/Stem').onChange(scheduleRebuild);
  cluster.add(params, 'clusterBudSpread', 0.01, 0.1, 0.005).name('Bud Spread').onChange(scheduleRebuild);
  cluster.add(params, 'clusterStemThickness', 0.2, 1.2, 0.01).name('Stem Thick').onChange(scheduleRebuild);
  cluster.add(params, 'clusterStemCurve', 0.0, 0.4, 0.01).name('Stem Curve').onChange(scheduleRebuild);
  cluster.add(params, 'clusterStemHeightMult', 0.8, 2.0, 0.05).name('Height Mult').onChange(scheduleRebuild);
  cluster.addColor(params, 'clusterColor').name('Color').onChange(scheduleRebuild);
  cluster.addColor(params, 'clusterCenterColor').name('Center').onChange(updateClusterCenterColor);
  cluster.addColor(params, 'clusterStemBaseColor').name('Stem Base').onChange(scheduleRebuild);
  cluster.addColor(params, 'clusterStemTipColor').name('Stem Tip').onChange(scheduleRebuild);

  // ── Shared ──
  const shared = gui.addFolder('Shared');
  shared.add(params, 'flowerCount', 0, 210000, 1000).name('Total Flowers').onChange(scheduleRebuild);
  shared.add(params, 'scaleMin', 0.1, 1.0, 0.01).name('Scale Min').onChange(scheduleRebuild);
  shared.add(params, 'scaleMax', 0.2, 1.5, 0.01).name('Scale Max').onChange(scheduleRebuild);
  shared.add(params, 'stemHeightMin', 0.1, 1.0, 0.01).name('Stem Min').onChange(scheduleRebuild);
  shared.add(params, 'stemHeightMax', 0.2, 1.5, 0.01).name('Stem Max').onChange(scheduleRebuild);
  shared.add(params, 'windStrength', 0, 2, 0.01).name('Wind').onChange(updateWindUniform);

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
  let grassRebuildTimer = null;
  function scheduleGrassRebuild() {
    clearTimeout(grassRebuildTimer);
    grassRebuildTimer = setTimeout(() => {
      rebuildAllGrass();
      network.sendParams(params);
    }, 150);
  }
  const grass = gui.addFolder('Grass');
  grass.add(params, 'grassCount', 10000, 600000, 10000).name('Density').onChange(scheduleGrassRebuild);
  grass.add(params, 'grassHeight', 0.1, 3.0, 0.05).name('Height').onChange(updateGrassHeight);
  grass.add(params, 'patchHeight', 0.1, 3.0, 0.05).name('Patch Height').onChange(updatePatchHeight);
  grass.addColor(params, 'grassBaseColor').name('Base').onChange(updateGrassColors);
  grass.addColor(params, 'grassTipColor').name('Tip').onChange(updateGrassColors);
  grass.addColor(params, 'patchBaseColor').name('Patch Base').onChange(updatePatchColors);
  grass.addColor(params, 'patchTipColor').name('Patch Tip').onChange(updatePatchColors);
  grass.addColor(params, 'groundColor').name('Ground').onChange(() => {
    if (terrainMat) terrainMat.color.set(params.groundColor);
  });

  // ── Style (Ghibli post-processing + cel-shading) ──
  const style = gui.addFolder('Style');
  const gu = ghibliPass.uniforms;
  style.add(gu.uOutlineStrength,  'value', 0, 1, 0.01).name('Outline Strength');
  style.add(gu.uOutlineThickness, 'value', 0.5, 3, 0.1).name('Outline Thickness');
  style.add(gu.uColorSteps,       'value', 4, 32, 1).name('Color Steps');
  style.add(gu.uQuantizeStrength,  'value', 0, 0.5, 0.01).name('Quantize');
  style.add(gu.uWarmth,           'value', 0, 1, 0.01).name('Warmth');
  style.add(gu.uSaturation,       'value', 0.5, 1.5, 0.01).name('Saturation');
  style.add(gu.uHazeStrength,     'value', 0, 0.5, 0.01).name('Haze');
  style.add(params, 'celBands', 2, 8, 1).name('Cel Bands').onChange(v => {
    setCelUniformOnAll('uCelBands', v);
    network.sendParams(params);
  });
  style.add(params, 'celSoftness', 0.01, 0.3, 0.01).name('Cel Softness').onChange(v => {
    setCelUniformOnAll('uCelSoftness', v);
    network.sendParams(params);
  });
  style.add(params, 'ambientStrength', 0.1, 0.8, 0.01).name('Ambient').onChange(v => {
    setCelUniformOnAll('uAmbientStrength', v);
    network.sendParams(params);
  });

  if (isMobile) {
    gui.close();
  } else {
    single.open();
    bundle.open();
    cluster.open();
  }
}

// ─── Player manager ──────────────────────────────────────
const playerManager = new PlayerManager(scene, camera);

// ─── Network: apply remote param changes ─────────────────
function applyRemoteParams(remoteParams) {
  const oldGrassCount = params.grassCount;
  Object.assign(params, remoteParams);
  rebuildFlowers();
  if (params.grassCount !== oldGrassCount) {
    rebuildAllGrass();
  }
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
  if (clusterFlowerMat) clusterFlowerMat.uniforms.uCenterColor.value.set(params.clusterCenterColor);
  setCelUniformOnAll('uCelBands', params.celBands);
  setCelUniformOnAll('uCelSoftness', params.celSoftness);
  setCelUniformOnAll('uAmbientStrength', params.ambientStrength);
  if (gui) gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// ─── GLB Model ──────────────────────────────────────────
function loadCottage(onProgress) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('/cottage.glb', (gltf) => {
      const model = gltf.scene;
      const cx = 3, cz = -3;
      const cy = getHeightAt(cx, cz);
      model.position.set(cx, cy + 5.25, cz);
      model.scale.setScalar(8.0);

      // Brighten and saturate GLB materials to match the scene style
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const mat = child.material;
          if (mat.color) {
            const hsl = {};
            mat.color.getHSL(hsl);
            mat.color.setHSL(hsl.h, Math.min(hsl.s * 2.0, 1.0), Math.min(hsl.l * 2.0, 1.0));
          }
          mat.emissive?.setScalar(0.3);
        }
      });

      scene.add(model);
      resolve();
    }, (progress) => {
      if (onProgress) {
        if (progress.lengthComputable) {
          onProgress(progress.loaded / progress.total);
        } else {
          // Fallback: estimate against known ~87MB file size
          onProgress(Math.min(progress.loaded / 87_000_000, 0.99));
        }
      }
    }, (err) => {
      console.warn('Cottage model failed to load:', err);
      resolve(); // continue even if cottage fails
    });
  });
}

// ─── Init ────────────────────────────────────────────────
setupLighting();

const loadBlocks = document.querySelectorAll('.load-block');
const loadingScreen = document.getElementById('loading-screen');

const cottageReady = loadCottage((pct) => {
  const filled = Math.round(pct * loadBlocks.length);
  loadBlocks.forEach((b, i) => b.classList.toggle('filled', i < filled));
});

let networkInitData = null;
const networkReady = new Promise((resolve) => {
  networkInitData = { resolve };
});

// Once both cottage and network are ready, start the scene
Promise.all([cottageReady, networkReady]).then(() => {
  loadBlocks.forEach((b) => b.classList.add('filled'));
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    overlay.classList.remove('hidden');
  }, 300);
});

network.connect({
  onInit({ seed, params: serverParams, players, presets: serverPresets }) {
    _flowerSeed = seed;

    // Merge server-saved presets into PRESETS (never overwrite built-ins)
    const builtInNames = new Set(Object.keys(PRESETS));
    if (serverPresets) {
      for (const [name, data] of Object.entries(serverPresets)) {
        if (!builtInNames.has(name)) {
          PRESETS[name] = data;
        }
      }
    }

    if (serverParams) Object.assign(params, serverParams);

    // Built-in presets always win over stale server params
    const activePreset = PRESETS[params.preset];
    if (activePreset && builtInNames.has(params.preset)) {
      Object.assign(params, activePreset);
    }

    resetToSeed(seed);
    createTerrain();
    if (terrainMat) terrainMat.color.set(params.groundColor);

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
    networkInitData.resolve();
  },
  onPlayerJoin(id, x, y, z, yaw) {
    playerManager.add(id);
    playerManager.updatePosition(id, x, y, z, yaw);
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

const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = timer.getDelta();
  const t = timer.getElapsed();

  cameraPosUniform.copy(camera.position);

  if (grassMat) grassMat.uniforms.uTime.value = t;
  if (patchGrassMat) patchGrassMat.uniforms.uTime.value = t;
  setTimeOnAll(t);

  updateMovement(dt);
  playerManager.tick(dt);

  composer.render();
}
