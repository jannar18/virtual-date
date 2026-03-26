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
const PRESETS = {
  Daisy:       { petalCount: 8,  petalLength: 0.5,  petalWidth: 0.55, cupDepth: 0.04, centerSize: 0.12 },
  Poppy:       { petalCount: 4,  petalLength: 0.55, petalWidth: 0.85, cupDepth: 0.08, centerSize: 0.08 },
  Cosmos:      { petalCount: 8,  petalLength: 0.6,  petalWidth: 0.5,  cupDepth: 0.02, centerSize: 0.10 },
  Buttercup:   { petalCount: 5,  petalLength: 0.35, petalWidth: 0.7,  cupDepth: 0.06, centerSize: 0.15 },
  'Wild Rose': { petalCount: 5,  petalLength: 0.5,  petalWidth: 0.75, cupDepth: 0.05, centerSize: 0.10 },
  Sunflower:   { petalCount: 10, petalLength: 0.55, petalWidth: 0.35, cupDepth: 0.01, centerSize: 0.18 },
};

// ─── Tweakable params ────────────────────────────────────
const params = {
  preset: 'Wild Rose',

  // Shape
  petalCount: 5,
  petalLength: 0.5,
  petalWidth: 0.75,
  cupDepth: 0.05,
  centerSize: 0.10,

  // Scale & field
  scaleMin: 0.3,
  scaleMax: 0.7,
  flowerCount: 4000,
  stemHeightMin: 0.3,
  stemHeightMax: 0.7,

  // Colors
  primaryColor: '#e84393',
  secondaryColor: '#fdcb6e',
  accentColor: '#a29bfe',
  centerColor: '#fff3a0',

  // Wind
  windStrength: 0.6,
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
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4a7a3d })));
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
      uBaseColor: { value: new THREE.Color(0x2d5a1e) },
      uTipColor: { value: new THREE.Color(0x7cb342) },
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

// ─── Flower geometry builder ─────────────────────────────
function buildFlowerGeometry(p) {
  const { petalCount, petalLength, petalWidth, cupDepth, centerSize } = p;
  const verts = [];
  const dists = [];
  const indices = [];
  let vi = 0;

  const halfW = (Math.PI / petalCount) * petalWidth;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;

    // Center
    verts.push(0, 0.06, 0);
    dists.push(0);

    // Left edge
    const lr = petalLength * 0.85;
    verts.push(Math.cos(angle - halfW) * lr, 0, Math.sin(angle - halfW) * lr);
    dists.push(0.7);

    // Tip
    verts.push(Math.cos(angle) * petalLength, -cupDepth, Math.sin(angle) * petalLength);
    dists.push(1.0);

    // Right edge
    verts.push(Math.cos(angle + halfW) * lr, 0, Math.sin(angle + halfW) * lr);
    dists.push(0.7);

    const b = vi;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    vi += 4;
  }

  // Center disc
  verts.push(0, 0.1, 0);
  dists.push(0);
  const cBase = vi;
  vi++;

  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    verts.push(Math.cos(a) * centerSize, 0.05, Math.sin(a) * centerSize);
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

// ─── Flower + stem instance management ───────────────────
let stemMesh = null, stemMat = null;
let flowerMesh = null, flowerMat = null;
let _flowerSeed = 0;

function rebuildFlowers() {
  // Clean up old meshes
  if (stemMesh) {
    scene.remove(stemMesh);
    stemMesh.geometry.dispose();
    stemMat.dispose();
  }
  if (flowerMesh) {
    scene.remove(flowerMesh);
    flowerMesh.geometry.dispose();
    flowerMat.dispose();
  }

  // Reset PRNG for deterministic flower placement
  resetToSeed(_flowerSeed);

  const count = Math.round(params.flowerCount);
  const colors = [
    new THREE.Color(params.primaryColor),
    new THREE.Color(params.secondaryColor),
    new THREE.Color(params.accentColor),
  ];
  const centerCol = new THREE.Color(params.centerColor);

  // Generate shared instance data
  const offsets = new Float32Array(count * 3);
  const headOffsets = new Float32Array(count * 3);
  const stemHeights = new Float32Array(count);
  const flowerScales = new Float32Array(count);
  const phases = new Float32Array(count);
  const rotYs = new Float32Array(count);
  const petalColors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (seededRandom() - 0.5) * FIELD_SIZE;
    const z = (seededRandom() - 0.5) * FIELD_SIZE;
    const gy = getHeightAt(x, z);
    const sh = params.stemHeightMin + seededRandom() * (params.stemHeightMax - params.stemHeightMin);

    offsets[i * 3] = x;
    offsets[i * 3 + 1] = gy;
    offsets[i * 3 + 2] = z;

    headOffsets[i * 3] = x;
    headOffsets[i * 3 + 1] = gy + sh;
    headOffsets[i * 3 + 2] = z;

    stemHeights[i] = sh;
    flowerScales[i] = params.scaleMin + seededRandom() * (params.scaleMax - params.scaleMin);
    phases[i] = seededRandom() * Math.PI * 2;
    rotYs[i] = seededRandom() * Math.PI * 2;

    const c = colors[Math.floor(seededRandom() * colors.length)];
    petalColors[i * 3] = c.r;
    petalColors[i * 3 + 1] = c.g;
    petalColors[i * 3 + 2] = c.b;
  }

  // ── Stems ──
  const stemBase = createGrassBlade();
  const stemGeo = new THREE.InstancedBufferGeometry();
  stemGeo.index = stemBase.index;
  stemGeo.setAttribute('position', stemBase.getAttribute('position'));
  stemGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
  stemGeo.setAttribute('stemHeight', new THREE.InstancedBufferAttribute(stemHeights, 1));
  stemGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));

  stemMat = new THREE.ShaderMaterial({
    vertexShader: stemVert, fragmentShader: stemFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.frustumCulled = false;
  scene.add(stemMesh);

  // ── Flower heads ──
  const flowerBase = buildFlowerGeometry(params);
  const flowerGeo = new THREE.InstancedBufferGeometry();
  flowerGeo.index = flowerBase.index;
  flowerGeo.setAttribute('position', flowerBase.getAttribute('position'));
  flowerGeo.setAttribute('petalDist', flowerBase.getAttribute('petalDist'));
  flowerGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(headOffsets, 3));
  flowerGeo.setAttribute('flowerScale', new THREE.InstancedBufferAttribute(flowerScales, 1));
  flowerGeo.setAttribute('phase', new THREE.InstancedBufferAttribute(phases, 1));
  flowerGeo.setAttribute('rotY', new THREE.InstancedBufferAttribute(rotYs, 1));
  flowerGeo.setAttribute('petalColor', new THREE.InstancedBufferAttribute(petalColors, 3));

  flowerMat = new THREE.ShaderMaterial({
    vertexShader: flowerVert, fragmentShader: flowerFrag,
    uniforms: {
      uTime: { value: 0 }, uWindStrength: { value: params.windStrength },
      uCenterColor: { value: centerCol },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
      uFogColor: { value: FOG_COLOR },
    },
    side: THREE.DoubleSide,
  });

  flowerMesh = new THREE.Mesh(flowerGeo, flowerMat);
  flowerMesh.frustumCulled = false;
  scene.add(flowerMesh);
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
  // Don't show overlay if we unlocked to type in chat
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
  // Re-lock pointer so player is back in the game
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
  e.stopPropagation(); // prevent WASD movement while typing
  if (e.key === 'Enter') submitChat();
  if (e.key === 'Escape') closeChat();
});

const keys = {};
document.addEventListener('keydown', (e) => {
  if (chatOpen) return; // don't process game keys while typing
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

  // Send position to other players
  network.sendPosition(p.x, p.y, p.z, camera.rotation.y);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── GUI ─────────────────────────────────────────────────
let gui = null;

function setupGUI() {
  gui = new GUI({ title: 'Flower Field' });

  // Rebuild helper — debounced so dragging sliders doesn't thrash
  let rebuildTimer = null;
  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildFlowers();
      network.sendParams(params);
    }, 80);
  }

  // Instant uniform update (no rebuild)
  function updateWindUniform() {
    if (grassMat) grassMat.uniforms.uWindStrength.value = params.windStrength;
    if (stemMat) stemMat.uniforms.uWindStrength.value = params.windStrength;
    if (flowerMat) flowerMat.uniforms.uWindStrength.value = params.windStrength;
    network.sendParams(params);
  }

  function updateCenterColor() {
    if (flowerMat) flowerMat.uniforms.uCenterColor.value.set(params.centerColor);
    network.sendParams(params);
  }

  // ── Preset ──
  const presetCtrl = gui.add(params, 'preset', Object.keys(PRESETS)).name('Preset');
  presetCtrl.onChange((name) => {
    const p = PRESETS[name];
    Object.assign(params, p);
    // Update all shape controllers to reflect new values
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    scheduleRebuild();
  });

  // ── Shape ──
  const shape = gui.addFolder('Shape');
  shape.add(params, 'petalCount', 3, 12, 1).name('Petals').onChange(scheduleRebuild);
  shape.add(params, 'petalLength', 0.2, 1.0, 0.01).name('Petal Length').onChange(scheduleRebuild);
  shape.add(params, 'petalWidth', 0.2, 1.0, 0.01).name('Petal Width').onChange(scheduleRebuild);
  shape.add(params, 'cupDepth', 0.0, 0.2, 0.005).name('Cup Depth').onChange(scheduleRebuild);
  shape.add(params, 'centerSize', 0.04, 0.3, 0.01).name('Center Size').onChange(scheduleRebuild);

  // ── Size ──
  const size = gui.addFolder('Size');
  size.add(params, 'scaleMin', 0.1, 1.0, 0.01).name('Scale Min').onChange(scheduleRebuild);
  size.add(params, 'scaleMax', 0.2, 1.5, 0.01).name('Scale Max').onChange(scheduleRebuild);
  size.add(params, 'stemHeightMin', 0.1, 1.0, 0.01).name('Stem Min').onChange(scheduleRebuild);
  size.add(params, 'stemHeightMax', 0.2, 1.5, 0.01).name('Stem Max').onChange(scheduleRebuild);

  // ── Colors ──
  const colors = gui.addFolder('Colors');
  colors.addColor(params, 'primaryColor').name('Primary').onChange(scheduleRebuild);
  colors.addColor(params, 'secondaryColor').name('Secondary').onChange(scheduleRebuild);
  colors.addColor(params, 'accentColor').name('Accent').onChange(scheduleRebuild);
  colors.addColor(params, 'centerColor').name('Center').onChange(updateCenterColor);

  // ── Field ──
  const field = gui.addFolder('Field');
  field.add(params, 'flowerCount', 500, 10000, 100).name('Count').onChange(scheduleRebuild);
  field.add(params, 'windStrength', 0, 2, 0.01).name('Wind').onChange(updateWindUniform);

  // Start with shape open
  shape.open();
  colors.open();
}

// ─── Player manager ──────────────────────────────────────
const playerManager = new PlayerManager(scene);

// ─── Network: apply remote param changes ─────────────────
function applyRemoteParams(remoteParams) {
  Object.assign(params, remoteParams);
  rebuildFlowers();
  // Update wind uniform immediately
  if (grassMat) grassMat.uniforms.uWindStrength.value = params.windStrength;
  if (stemMat) stemMat.uniforms.uWindStrength.value = params.windStrength;
  if (flowerMat) flowerMat.uniforms.uWindStrength.value = params.windStrength;
  if (flowerMat) flowerMat.uniforms.uCenterColor.value.set(params.centerColor);
  // Refresh GUI sliders
  if (gui) gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// ─── Init (deferred until server sends seed) ─────────────
createTerrain();
setupLighting();

network.connect({
  onInit({ seed, params: serverParams, players }) {
    _flowerSeed = seed;

    // Apply server params if any client has set them before us
    if (serverParams) Object.assign(params, serverParams);

    // Build scene with seeded PRNG
    resetToSeed(seed + 1); // grass uses seed+1
    createGrass();
    rebuildFlowers(); // uses _flowerSeed internally

    setupGUI();

    // Add existing players
    for (const id of Object.keys(players)) {
      const pid = Number(id);
      playerManager.add(pid);
      const p = players[id];
      playerManager.updatePosition(pid, p.x, p.y, p.z, p.yaw);
    }

    // Start render loop
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
      // Own message — show toast (we don't have our own avatar)
      showToast(text);
    } else {
      playerManager.showChat(id, text);
    }
  },
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  if (grassMat) grassMat.uniforms.uTime.value = t;
  if (stemMat) stemMat.uniforms.uTime.value = t;
  if (flowerMat) flowerMat.uniforms.uTime.value = t;

  updateMovement(dt);
  playerManager.tick(dt);
  renderer.render(scene, camera);
}
