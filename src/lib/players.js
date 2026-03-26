import * as THREE from 'three';

// Generates a hue from player ID for avatar color
function colorFromId(id) {
  // Golden creamy light yellow — slight hue variation per player
  const hue = 0.12 + ((id * 137.508) % 30) / 360; // warm gold range (~43-73°)
  return new THREE.Color().setHSL(hue, 0.6, 0.72);
}

// Build the cloak body via LatheGeometry from a smooth silhouette curve
function createCloakGeometry() {
  // Profile points: x = radius, y = height (bottom to top)
  // Defines the right-side silhouette, lathed around Y axis
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.42, 0.0,  0),  // hem — wide flare
    new THREE.Vector3(0.40, 0.05, 0),  // slight inward curve above hem
    new THREE.Vector3(0.35, 0.15, 0),  // lower cloak
    new THREE.Vector3(0.28, 0.35, 0),  // mid cloak, tapering
    new THREE.Vector3(0.20, 0.55, 0),  // waist area
    new THREE.Vector3(0.16, 0.70, 0),  // chest narrows
    new THREE.Vector3(0.13, 0.80, 0),  // shoulders
    new THREE.Vector3(0.10, 0.88, 0),  // neck
    new THREE.Vector3(0.08, 0.92, 0),  // neck top
    new THREE.Vector3(0.17, 0.98, 0),  // hood flares out
    new THREE.Vector3(0.20, 1.08, 0),  // hood widest
    new THREE.Vector3(0.18, 1.18, 0),  // hood rounding
    new THREE.Vector3(0.10, 1.26, 0),  // hood top curve
    new THREE.Vector3(0.00, 1.30, 0),  // hood peak (center)
  ], false, 'catmullrom', 0.5);

  const pts = profile.getPoints(40);
  // LatheGeometry wants Vector2 (x=radius, y=height)
  const pts2d = pts.map(p => new THREE.Vector2(p.x, p.y));
  return new THREE.LatheGeometry(pts2d, 32);
}

// Build the cloak mesh, returning { mesh, geometry } so we can animate vertices
function createCloak(material) {
  const geo = createCloakGeometry();
  // Store original positions for hem animation
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
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

// Animate the lower vertices of the cloak for a wispy flowing effect
function animateCloakHem(mesh, time) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const { origX, origY, origZ } = geo.userData;

  for (let i = 0; i < pos.count; i++) {
    const oy = origY[i];
    // Only animate the bottom 30% of the cloak
    if (oy < 0.35) {
      const influence = 1.0 - oy / 0.35; // stronger at hem
      const ox = origX[i];
      const oz = origZ[i];
      const angle = Math.atan2(oz, ox);

      // Wispy wave — varies by angle around cloak and time
      const wave = Math.sin(angle * 3 + time * 2.5) * 0.04 * influence
                 + Math.sin(angle * 5 - time * 1.8) * 0.025 * influence;

      // Radial displacement (cloak billows outward)
      const radialWave = Math.sin(angle * 2 + time * 2) * 0.03 * influence;
      const r = Math.sqrt(ox * ox + oz * oz) + radialWave;

      pos.setX(i, Math.cos(angle) * r);
      pos.setY(i, oy + wave);
      pos.setZ(i, Math.sin(angle) * r);
    }
  }
  pos.needsUpdate = true;
}

// Create a wispy billboard sprite — bare dark text, no background
function createChatBubble(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const fontSize = 48;
  const padding = 8;
  const font = `300 ${fontSize}px Georgia, serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textW = metrics.width;

  canvas.width = textW + padding * 2;
  canvas.height = fontSize + padding * 2;

  // No background — just the text
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
  sprite.position.y = 3.6;

  return sprite;
}

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
  }

  add(id) {
    if (this.players.has(id)) return;

    const color = colorFromId(id);
    const group = new THREE.Group();

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0xf5e6b8,
      emissive: 0xd4b96a,
      emissiveIntensity: 0.15,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    // Cloak body — lathed silhouette, scaled up
    const cloak = createCloak(darkMat);
    cloak.scale.set(1.8, 1.8, 1.8);
    cloak.position.y = 0.55; // raise to sit on top of legs
    group.add(cloak);

    // Inner glow — faint uplight inside the cloak
    const innerGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0, 0.68, 0.4, 16, 1, true),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      })
    );
    innerGlow.position.y = 0.7;
    group.add(innerGlow);

    // Legs — visible below the cloak
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xe0cc8a,
      roughness: 0.8,
    });
    const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.13, 0.275, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.13, 0.275, 0);
    group.add(rightLeg);

    // Sunglasses — dark visor across the face
    const glassesMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.1,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    // Triangle lens shape
    const lensGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0.0, -0.06, 0,   // bottom center (point down)
     -0.12, 0.06, 0,   // top left
      0.12, 0.06, 0,   // top right
    ]);
    lensGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    lensGeo.computeVertexNormals();

    const leftLens = new THREE.Mesh(lensGeo, glassesMat);
    leftLens.position.set(-0.13, 2.55, 0.42);
    group.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo.clone(), glassesMat);
    rightLens.position.set(0.13, 2.55, 0.42);
    group.add(rightLens);

    // Top bar connecting the lenses
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.015, 0.015),
      glassesMat
    );
    bar.position.set(0, 2.61, 0.42);
    group.add(bar);

    // Halo — floating above the hood
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.025, 8, 32),
      glowMat
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 3.05;
    group.add(halo);

    // Subtle glow light from the hem
    const light = new THREE.PointLight(color, 1.0, 5);
    light.position.y = 0.6;
    group.add(light);

    group.position.set(0, 0, 0);
    this.scene.add(group);

    this.players.set(id, {
      group,
      cloak,
      leftLeg,
      rightLeg,
      targetPos: new THREE.Vector3(0, 0, 0),
      targetYaw: 0,
      prevPos: new THREE.Vector3(0, 0, 0),
    });
  }

  remove(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.group);
    p.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.players.delete(id);
  }

  showChat(id, text) {
    const p = this.players.get(id);
    if (!p) return;

    // Remove previous bubble
    if (p.chatSprite) {
      p.group.remove(p.chatSprite);
      p.chatSprite.material.map.dispose();
      p.chatSprite.material.dispose();
      p.chatSprite = null;
    }

    const sprite = createChatBubble(text);
    p.group.add(sprite);
    p.chatSprite = sprite;
  }

  updatePosition(id, x, y, z, yaw) {
    const p = this.players.get(id);
    if (!p) return;
    // y arrives as camera eye height (terrain + 1.7); place feet on ground
    p.targetPos.set(x, y - 1.7, z);
    p.targetYaw = yaw;
  }

  tick(dt) {
    const alpha = 1 - Math.exp(-10 * dt);
    const time = performance.now() / 1000;
    for (const [, p] of this.players) {
      p.group.position.lerp(p.targetPos, alpha);

      // Lerp yaw
      let dyaw = p.targetYaw - p.group.rotation.y;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      p.group.rotation.y += dyaw * alpha;

      // Subtle sway (offset, not accumulated)
      p.group.children[0].position.y = 0.55 + Math.sin(time * 1.8) * 0.02;

      // Animate cloak hem — wispy flowing effect
      animateCloakHem(p.cloak, time);

      // Leg stride — stronger when moving
      const dx = p.group.position.x - p.prevPos.x;
      const dz = p.group.position.z - p.prevPos.z;
      const speed = Math.sqrt(dx * dx + dz * dz);
      const moving = speed > 0.001 ? 1 : 0.15;
      const legSwing = Math.sin(time * 5) * 0.2 * moving;
      p.leftLeg.rotation.x = legSwing;
      p.rightLeg.rotation.x = -legSwing;

      p.prevPos.copy(p.group.position);
    }
  }
}
