import * as THREE from 'three';
import { gltfLoader } from './loader.js';

// ─── Config ──────────────────────────────────────────────
const AVATAR_SCALE = 1.5;
const WIZARD_MODEL = '/wizard.glb';
const WIZARD_SCALE = 1.8;
const WIZARD_Y_OFFSET = 1.3;

// ─── Color helpers ───────────────────────────────────────
// Teal-green for new procedural avatar
function cloakColorFromId(id) {
  const baseHue = 0.46;
  const hueShift = ((id * 137.508) % 15) / 360;
  return new THREE.Color().setHSL(baseHue + hueShift, 0.38, 0.45);
}

// Golden for original avatar
function goldColorFromId(id) {
  const hue = 0.12 + ((id * 137.508) % 30) / 360;
  return new THREE.Color().setHSL(hue, 0.6, 0.72);
}

// ─── Sparkle texture (shared) ────────────────────────────
let _sparkleTex = null;
function getSparkleTexture() {
  if (_sparkleTex) return _sparkleTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,230,1.0)');
  g.addColorStop(0.15, 'rgba(255,250,200,0.8)');
  g.addColorStop(0.45, 'rgba(255,240,170,0.25)');
  g.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _sparkleTex = new THREE.CanvasTexture(canvas);
  return _sparkleTex;
}

// ═════════════════════════════════════════════════════════
// ORIGINAL AVATAR — gold cloak, sunglasses, halo, flowing hem
// ═════════════════════════════════════════════════════════

function createCloakGeometry() {
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.42, 0.0,  0),
    new THREE.Vector3(0.40, 0.05, 0),
    new THREE.Vector3(0.35, 0.15, 0),
    new THREE.Vector3(0.28, 0.35, 0),
    new THREE.Vector3(0.20, 0.55, 0),
    new THREE.Vector3(0.16, 0.70, 0),
    new THREE.Vector3(0.13, 0.80, 0),
    new THREE.Vector3(0.10, 0.88, 0),
    new THREE.Vector3(0.08, 0.92, 0),
    new THREE.Vector3(0.17, 0.98, 0),
    new THREE.Vector3(0.20, 1.08, 0),
    new THREE.Vector3(0.18, 1.18, 0),
    new THREE.Vector3(0.10, 1.26, 0),
    new THREE.Vector3(0.00, 1.30, 0),
  ], false, 'catmullrom', 0.5);
  const pts = profile.getPoints(40).map(p => new THREE.Vector2(p.x, p.y));
  return new THREE.LatheGeometry(pts, 32);
}

function createCloak(material) {
  const geo = createCloakGeometry();
  const pos = geo.attributes.position;
  const origY = new Float32Array(pos.count);
  const origX = new Float32Array(pos.count);
  const origZ = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    origX[i] = pos.getX(i);
    origY[i] = pos.getY(i);
    origZ[i] = pos.getZ(i);
  }
  geo.userData = { origX, origY, origZ };
  return new THREE.Mesh(geo, material);
}

function animateCloakHem(mesh, time) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const { origX, origY, origZ } = geo.userData;
  for (let i = 0; i < pos.count; i++) {
    const oy = origY[i];
    if (oy < 0.35) {
      const influence = 1.0 - oy / 0.35;
      const ox = origX[i];
      const oz = origZ[i];
      const angle = Math.atan2(oz, ox);
      const wave = Math.sin(angle * 3 + time * 2.5) * 0.04 * influence
                 + Math.sin(angle * 5 - time * 1.8) * 0.025 * influence;
      const radialWave = Math.sin(angle * 2 + time * 2) * 0.03 * influence;
      const r = Math.sqrt(ox * ox + oz * oz) + radialWave;
      pos.setX(i, Math.cos(angle) * r);
      pos.setY(i, oy + wave);
      pos.setZ(i, Math.sin(angle) * r);
    }
  }
  pos.needsUpdate = true;
}

function createOriginalAvatar(id) {
  const color = goldColorFromId(id);
  const group = new THREE.Group();

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x4da6ff, emissive: 0x2b8de6, emissiveIntensity: 0.2,
    roughness: 0.7, side: THREE.DoubleSide,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.5,
    transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });

  // Cloak
  const cloak = createCloak(darkMat);
  cloak.scale.set(1.8, 1.8, 1.8);
  cloak.position.y = 0.55;
  group.add(cloak);

  // Inner glow
  const innerGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0, 0.68, 0.4, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.15, side: THREE.BackSide,
    })
  );
  innerGlow.position.y = 0.7;
  group.add(innerGlow);

  // Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0xe8d5b7, roughness: 0.6 });
  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.13, 0.275, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.13, 0.275, 0);
  group.add(rightLeg);

  // Sunglasses
  const glassesMat = new THREE.MeshStandardMaterial({
    color: 0x050508, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide,
  });
  const lensGeo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0.0, -0.06, 0, -0.12, 0.06, 0, 0.12, 0.06, 0,
  ]);
  lensGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  lensGeo.computeVertexNormals();
  const leftLens = new THREE.Mesh(lensGeo, glassesMat);
  leftLens.position.set(-0.13, 2.55, 0.42);
  group.add(leftLens);
  const rightLens = new THREE.Mesh(lensGeo.clone(), glassesMat);
  rightLens.position.set(0.13, 2.55, 0.42);
  group.add(rightLens);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.015, 0.015), glassesMat);
  bar.position.set(0, 2.61, 0.42);
  group.add(bar);

  // Halo
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 8, 32), glowMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.05;
  group.add(halo);

  // Glow light
  const light = new THREE.PointLight(color, 1.0, 5);
  light.position.y = 0.6;
  group.add(light);

  return {
    avatar: group, sparkle: null, type: 'original',
    cloak, leftLeg, rightLeg,
  };
}

// ═════════════════════════════════════════════════════════
// NEW PROCEDURAL AVATAR — teal Ghibli style
// ═════════════════════════════════════════════════════════

function createProceduralAvatar(cloakColor) {
  const avatar = new THREE.Group();

  // Cloak body + hood
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.30, 0.00, 0),
    new THREE.Vector3(0.28, 0.05, 0),
    new THREE.Vector3(0.25, 0.15, 0),
    new THREE.Vector3(0.21, 0.28, 0),
    new THREE.Vector3(0.17, 0.40, 0),
    new THREE.Vector3(0.14, 0.48, 0),
    new THREE.Vector3(0.12, 0.53, 0),
    new THREE.Vector3(0.18, 0.60, 0),
    new THREE.Vector3(0.23, 0.70, 0),
    new THREE.Vector3(0.22, 0.80, 0),
    new THREE.Vector3(0.16, 0.87, 0),
    new THREE.Vector3(0.07, 0.93, 0),
    new THREE.Vector3(0.02, 0.97, 0),
    new THREE.Vector3(0.00, 1.00, 0),
  ], false, 'catmullrom', 0.5);

  const pts = profile.getPoints(40).map(p => new THREE.Vector2(p.x, p.y));
  const cloakMat = new THREE.MeshStandardMaterial({
    color: cloakColor, roughness: 0.92, side: THREE.DoubleSide,
  });
  avatar.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), cloakMat));

  // Face
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xe8d5b7, roughness: 0.3 })
  );
  face.position.set(0, 0.70, 0.10);
  avatar.add(face);

  // Eyes (Ghibli-style layered)
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const scleraGeo = new THREE.SphereGeometry(0.038, 14, 14);
  const irisGeo = new THREE.SphereGeometry(0.028, 12, 12);
  const pupilGeo = new THREE.SphereGeometry(0.016, 10, 10);
  const hlGeo = new THREE.SphereGeometry(0.010, 8, 8);
  const hlSmGeo = new THREE.SphereGeometry(0.006, 6, 6);
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.4 });
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,
  });
  for (const side of [-1, 1]) {
    const x = side * 0.06;
    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.position.set(x, 0.72, 0.22);
    sclera.scale.set(1, 1.15, 0.7);
    avatar.add(sclera);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(x, 0.72, 0.255);
    avatar.add(iris);
    const pupil = new THREE.Mesh(pupilGeo, darkMat);
    pupil.position.set(x, 0.72, 0.27);
    avatar.add(pupil);
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(x + side * 0.012, 0.735, 0.285);
    avatar.add(hl);
    const hlSm = new THREE.Mesh(hlSmGeo, hlMat);
    hlSm.position.set(x - side * 0.008, 0.71, 0.282);
    avatar.add(hlSm);
  }

  // Mouth
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.005, 4, 12, Math.PI), darkMat
  );
  mouth.position.set(0, 0.66, 0.25);
  mouth.rotation.x = Math.PI / 2;
  avatar.add(mouth);

  // Rosy cheeks
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xf5a0a0, transparent: true, opacity: 0.5, roughness: 0.6,
  });
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), cheekMat);
    cheek.position.set(side * 0.09, 0.69, 0.22);
    avatar.add(cheek);
  }

  // Cloaked arms
  const armGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.30, 10);
  const armMat = new THREE.MeshStandardMaterial({
    color: cloakColor, roughness: 0.92, side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(side * 0.20, 0.38, 0.04);
    arm.rotation.z = side * -0.5;
    arm.rotation.x = -0.25;
    avatar.add(arm);
  }

  // Feet
  const footGeo = new THREE.SphereGeometry(0.045, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x3a3535, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(side * 0.09, 0.0, 0.02);
    avatar.add(foot);
  }

  // Satchel bag
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x3d4155, roughness: 0.7 });
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), bagMat);
  bag.position.set(0.16, 0.22, 0.04);
  avatar.add(bag);
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.50, 6), bagMat);
  strap.position.set(0.05, 0.47, 0.10);
  strap.rotation.z = -0.35;
  avatar.add(strap);

  // Sparkle
  const sparkle = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getSparkleTexture(), transparent: true,
    blending: THREE.AdditiveBlending, depthTest: false,
  }));
  sparkle.scale.set(0.15, 0.15, 1);
  sparkle.position.set(-0.28, 0.50, 0.12);
  avatar.add(sparkle);

  avatar.scale.setScalar(AVATAR_SCALE);
  avatar.rotation.y = 0;
  return { avatar, sparkle, type: 'procedural' };
}

// ═════════════════════════════════════════════════════════
// WIZARD AVATAR — GLB model + sunglasses + halo
// ═════════════════════════════════════════════════════════

function createWizardAvatar(template, id) {
  const color = goldColorFromId(id);
  const group = new THREE.Group();

  // GLB model
  const model = template.clone();
  model.scale.setScalar(WIZARD_SCALE);
  model.position.y = WIZARD_Y_OFFSET;

  // Brighten materials
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const mat = child.material;
      if (mat.color) {
        const hsl = {};
        mat.color.getHSL(hsl);
        mat.color.setHSL(hsl.h, Math.min(hsl.s * 1.3, 1.0), Math.min(hsl.l * 1.8, 1.0));
      }
      if (mat.emissive) mat.emissive.setScalar(0.25);
    }
  });
  group.add(model);

  // Sunglasses (positioned for wizard model head)
  const glassesMat = new THREE.MeshStandardMaterial({
    color: 0x050508, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide,
  });
  const lensGeo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0.0, -0.17, 0, -0.266, 0.17, 0, 0.266, 0.17, 0,
  ]);
  lensGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  lensGeo.computeVertexNormals();
  const leftLens = new THREE.Mesh(lensGeo, glassesMat);
  leftLens.position.set(-0.266, 2.0, 0.85);
  group.add(leftLens);
  const rightLens = new THREE.Mesh(lensGeo.clone(), glassesMat);
  rightLens.position.set(0.266, 2.0, 0.85);
  group.add(rightLens);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.03, 0.03), glassesMat);
  bar.position.set(0, 2.10, 0.85);
  group.add(bar);

  // Halo
  const glowMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.5,
    transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 32), glowMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 3.15, 0.2);
  group.add(halo);

  // Glow light
  const light = new THREE.PointLight(color, 1.0, 5);
  light.position.y = 0.6;
  group.add(light);

  return { avatar: group, sparkle: null, type: 'wizard', model };
}

// ─── Chat bubble ─────────────────────────────────────────
function createChatBubble(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 48;
  const padding = 8;
  const font = `300 ${fontSize}px Georgia, serif`;
  ctx.font = font;
  const textW = ctx.measureText(text).width;
  canvas.width = textW + padding * 2;
  canvas.height = fontSize + padding * 2;
  ctx.font = font;
  ctx.fillStyle = 'rgba(30, 20, 15, 0.7)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const scale = canvas.width / 200;
  sprite.scale.set(scale, (canvas.height / canvas.width) * scale, 1);
  sprite.position.y = 1.8;
  return sprite;
}

// Chat bubble for original avatar (taller, needs higher placement)
function createChatBubbleOriginal(text) {
  const sprite = createChatBubble(text);
  sprite.position.y = 3.6;
  return sprite;
}

// ─── PlayerManager ───────────────────────────────────────
export class PlayerManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.players = new Map();
    this.wizardTemplate = null;
    this._modelsReady = false;
    this._pendingAdds = [];
    this._loadModels();
  }

  _loadModels() {
    gltfLoader.load(WIZARD_MODEL, (gltf) => {
      this.wizardTemplate = gltf.scene;
      this._modelsReady = true;
      this._flushPendingAdds();
    }, undefined, (err) => {
      console.warn(`Failed to load wizard model:`, err);
      this._modelsReady = true; // allow fallback to original
      this._flushPendingAdds();
    });
  }

  _flushPendingAdds() {
    for (const pending of this._pendingAdds) {
      this._createPlayer(pending.id);
      if (pending.pos) {
        this.updatePosition(pending.id, pending.pos.x, pending.pos.y, pending.pos.z, pending.pos.yaw);
      }
    }
    this._pendingAdds = [];
  }

  _createPlayer(id) {
    if (this.players.has(id)) return;

    // Use wizard GLB with sunglasses + halo if loaded, fallback to original
    const result = this.wizardTemplate
      ? createWizardAvatar(this.wizardTemplate, id)
      : createOriginalAvatar(id);

    const group = new THREE.Group();
    group.add(result.avatar);
    this.scene.add(group);

    this.players.set(id, {
      group,
      avatar: result.avatar,
      sparkle: result.sparkle,
      model: result.model || null,
      cloak: result.cloak || null,
      leftLeg: result.leftLeg || null,
      rightLeg: result.rightLeg || null,
      type: result.type,
      targetPos: new THREE.Vector3(),
      targetYaw: 0,
      prevPos: new THREE.Vector3(),
      needsFaceCamera: true,
    });
  }

  add(id) {
    if (this.players.has(id)) return;
    if (this._modelsReady) {
      this._createPlayer(id);
    } else {
      this._pendingAdds.push({ id });
    }
  }

  remove(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.group);
    p.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    this.players.delete(id);
  }

  showChat(id, text) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.chatSprite) {
      p.group.remove(p.chatSprite);
      p.chatSprite.material.map.dispose();
      p.chatSprite.material.dispose();
      p.chatSprite = null;
    }
    const sprite = p.type === 'original'
      ? createChatBubbleOriginal(text)
      : createChatBubble(text);
    p.group.add(sprite);
    p.chatSprite = sprite;
  }

  updatePosition(id, x, y, z, yaw) {
    const p = this.players.get(id);
    if (!p) {
      // Buffer position for players still waiting on model load
      const pending = this._pendingAdds.find(e => e.id === id);
      if (pending) pending.pos = { x, y, z, yaw };
      return;
    }
    p.targetPos.set(x, y - 1.7, z);
    p.targetYaw = yaw;

    // On first position update, snap into place facing the local camera
    if (p.needsFaceCamera) {
      p.needsFaceCamera = false;
      p.group.position.copy(p.targetPos);
      const cam = this.camera.position;
      p.group.rotation.y = Math.atan2(cam.x - x, cam.z - z);
      p.targetYaw = p.group.rotation.y;
      p.prevPos.copy(p.targetPos);
    }
  }

  tick(dt) {
    const alpha = 1 - Math.exp(-10 * dt);
    const time = performance.now() / 1000;

    for (const [, p] of this.players) {
      // Smooth position & yaw
      p.group.position.lerp(p.targetPos, alpha);
      let dyaw = p.targetYaw - p.group.rotation.y;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      p.group.rotation.y += dyaw * alpha;

      if (p.type === 'original') {
        // Subtle sway
        p.avatar.children[0].position.y = 0.55 + Math.sin(time * 1.8) * 0.02;
        // Flowing hem
        animateCloakHem(p.cloak, time);
        // Leg stride
        const dx = p.group.position.x - p.prevPos.x;
        const dz = p.group.position.z - p.prevPos.z;
        const speed = Math.sqrt(dx * dx + dz * dz);
        const moving = speed > 0.001 ? 1 : 0.15;
        const legSwing = Math.sin(time * 5) * 0.2 * moving;
        p.leftLeg.rotation.x = legSwing;
        p.rightLeg.rotation.x = -legSwing;
      } else if (p.type === 'procedural') {
        p.avatar.position.y = Math.sin(time * 1.8) * 0.02;
        const pulse = 0.12 + Math.sin(time * 3.5) * 0.04;
        p.sparkle.scale.set(pulse, pulse, 1);
        p.sparkle.material.opacity = 0.6 + Math.sin(time * 4.2) * 0.3;
      } else if (p.type === 'wizard') {
        p.model.position.y = WIZARD_Y_OFFSET + Math.sin(time * 1.8) * 0.02;
      }

      p.prevPos.copy(p.group.position);
    }
  }
}
