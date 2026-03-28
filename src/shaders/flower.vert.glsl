#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;
uniform vec3 uCameraPos;

attribute vec3 offset;
attribute float flowerScale;
attribute float phase;
attribute float rotY;
attribute vec3 petalColor;
attribute float petalDist;
attribute float swayFactor; // 1.0 at stem tip, less for flowers lower on the stem

varying vec3 vColor;
varying float vPetalDist;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Distance LOD — XZ distance from instance to camera
  vec2 toCam = offset.xz - uCameraPos.xz;
  float dist = length(toCam);

  // Beyond 85u — collapse to degenerate triangle (hidden by fog)
  if (dist > 85.0) {
    vColor = petalColor;
    vPetalDist = petalDist;
    vNormal = vec3(0.0, 1.0, 0.0);
    vWorldPos = offset;
    gl_Position = vec4(0.0);
    return;
  }

  vColor = petalColor;
  vPetalDist = petalDist;

  // Scale
  vec3 pos = position * flowerScale;

  // Random Y rotation per instance
  float c = cos(rotY);
  float s = sin(rotY);
  pos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);

  // Rotate normal by same Y rotation
  vNormal = vec3(normal.x * c - normal.z * s, normal.y, normal.x * s + normal.z * c);

  // Wind LOD: full 0-25, fade 25-50, off 50+
  float windLOD = 1.0 - smoothstep(25.0, 50.0, dist);

  pos += offset;

  if (windLOD > 0.001) {
    // Wind sway — matches stem shader, scaled by swayFactor for mid-stem flowers
    float windTime = uTime * 0.8;
    float swayX = snoise(vec2(offset.x * 0.04 + windTime * 0.2 + phase, offset.z * 0.04)) * uWindStrength * 0.4 * windLOD;
    pos.x += swayX * swayFactor;
  }

  vWorldPos = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
