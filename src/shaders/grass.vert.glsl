#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;
uniform float uHeightScale;

attribute vec3 offset;
attribute float bladeScale;
attribute float phase;

varying float vHeight;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vHeight = position.y;  // blade mesh: y goes 0→1

  // Scale the blade
  vec3 pos = position;
  pos.y *= bladeScale * uHeightScale;

  // Wind sway — stronger at tip
  float windTime = uTime * 1.2;
  float windX = snoise(vec2(offset.x * 0.05 + windTime * 0.3, offset.z * 0.05)) * uWindStrength;
  float windZ = snoise(vec2(offset.z * 0.05 + windTime * 0.25 + 100.0, offset.x * 0.05)) * uWindStrength * 0.6;

  // Gust layer
  float gust = snoise(vec2(offset.x * 0.01 + windTime * 0.15, offset.z * 0.01 + windTime * 0.1));
  windX += gust * uWindStrength * 0.8;

  float sway = vHeight * vHeight; // quadratic — base stays put
  pos.x += windX * sway;
  pos.z += windZ * sway;

  // Synthetic normal from wind displacement
  vNormal = normalize(vec3(-windX * 0.3, 1.0, -windZ * 0.3));

  // Place on terrain
  pos += offset;
  vWorldPos = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
