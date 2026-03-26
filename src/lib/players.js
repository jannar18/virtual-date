import * as THREE from 'three';

// Generates a hue from player ID for avatar color
function colorFromId(id) {
  const hue = ((id * 137.508) % 360) / 360; // golden angle distribution
  return new THREE.Color().setHSL(hue, 0.8, 0.6);
}

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // id → { group, targetPos, targetYaw }
  }

  add(id) {
    if (this.players.has(id)) return;

    const color = colorFromId(id);
    const group = new THREE.Group();

    // Glowing sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
      })
    );
    group.add(sphere);

    // Point light for glow effect
    const light = new THREE.PointLight(color, 1.5, 8);
    light.position.y = 0;
    group.add(light);

    group.position.set(0, 3, 0);
    this.scene.add(group);

    this.players.set(id, {
      group,
      targetPos: new THREE.Vector3(0, 3, 0),
      targetYaw: 0,
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

  updatePosition(id, x, y, z, yaw) {
    const p = this.players.get(id);
    if (!p) return;
    p.targetPos.set(x, y, z);
    p.targetYaw = yaw;
  }

  tick(dt) {
    const alpha = 1 - Math.exp(-10 * dt);
    for (const [, p] of this.players) {
      p.group.position.lerp(p.targetPos, alpha);
      // Lerp yaw
      let dyaw = p.targetYaw - p.group.rotation.y;
      // Wrap to [-PI, PI]
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      p.group.rotation.y += dyaw * alpha;
    }
  }
}
