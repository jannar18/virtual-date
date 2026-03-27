#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;

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

void main() {
  vColor = petalColor;
  vPetalDist = petalDist;

  // Scale
  vec3 pos = position * flowerScale;

  // Random Y rotation per instance
  float c = cos(rotY);
  float s = sin(rotY);
  pos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);

  // Wind — matches stem shader, scaled by swayFactor for mid-stem flowers
  float windTime = uTime * 0.8;
  float swayX = snoise(vec2(offset.x * 0.04 + windTime * 0.2 + phase, offset.z * 0.04)) * uWindStrength * 0.4;
  float bob = sin(uTime * 1.5 + phase * 6.28) * 0.03;

  pos += offset;
  pos.x += swayX * swayFactor;
  pos.y += bob * swayFactor;

  vWorldPos = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
