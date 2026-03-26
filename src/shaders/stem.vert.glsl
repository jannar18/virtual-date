#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;

attribute vec3 offset;
attribute float stemHeight;
attribute float phase;

varying float vHeight;
varying vec3 vWorldPos;

void main() {
  vHeight = position.y;  // 0 at base, 1 at tip

  vec3 pos = position;
  pos.x *= 0.4;          // thin the blade geometry into a stem
  pos.y *= stemHeight;

  // Wind — must match flower shader exactly
  float windTime = uTime * 0.8;
  float swayX = snoise(vec2(offset.x * 0.04 + windTime * 0.2 + phase, offset.z * 0.04)) * uWindStrength * 0.4;

  float sway = vHeight * vHeight;
  pos.x += swayX * sway;
  pos.y += sin(uTime * 1.5 + phase * 6.28) * 0.03 * sway;

  pos += offset;
  vWorldPos = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
