#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;
uniform float uHeightScale;
uniform vec3 uCameraPos;

attribute vec3 offset;
attribute float bladeScale;
attribute float phase;

varying float vHeight;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Distance LOD — XZ distance from instance to camera
  vec2 toCam = offset.xz - uCameraPos.xz;
  float dist = length(toCam);

  // Beyond 85u — collapse to degenerate triangle (hidden by fog)
  if (dist > 85.0) {
    vHeight = 0.0;
    vWorldPos = offset;
    vNormal = vec3(0.0, 1.0, 0.0);
    gl_Position = vec4(0.0);
    return;
  }

  vHeight = position.y;  // blade mesh: y goes 0→1

  // Scale the blade
  vec3 pos = position;
  pos.y *= bladeScale * uHeightScale;

  // Wind LOD: full 0-25, fade 25-50, off 50+
  float windLOD = 1.0 - smoothstep(25.0, 50.0, dist);

  if (windLOD > 0.001) {
    // Wind sway — stronger at tip, matched to flower/stem intensity
    float windTime = uTime * 0.8;
    float windX = snoise(vec2(offset.x * 0.05 + windTime * 0.3, offset.z * 0.05)) * uWindStrength * 0.5 * windLOD;
    float windZ = snoise(vec2(offset.z * 0.05 + windTime * 0.25 + 100.0, offset.x * 0.05)) * uWindStrength * 0.3 * windLOD;

    float sway = vHeight * vHeight; // quadratic — base stays put
    pos.x += windX * sway;
    pos.z += windZ * sway;

    // Synthetic normal from wind displacement
    vNormal = normalize(vec3(-windX * 0.3, 1.0, -windZ * 0.3));
  } else {
    vNormal = vec3(0.0, 1.0, 0.0);
  }

  // Place on terrain
  pos += offset;
  vWorldPos = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
