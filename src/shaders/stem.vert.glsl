#include "noise.glsl"

uniform float uTime;
uniform float uWindStrength;

attribute vec3 offset;
attribute float stemHeight;
attribute float phase;
attribute float stemThickness;
attribute float stemCurve;

varying float vHeight;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vHeight = position.y;  // 0 at base, 1 at tip

  vec3 pos = position;
  pos.x *= stemThickness;  // stem width
  pos.y *= stemHeight;

  // Static stem curve (arch outward using phase as direction)
  float curveH = vHeight * vHeight;
  pos.x += cos(phase) * stemCurve * curveH;
  pos.z += sin(phase) * stemCurve * curveH;

  // Wind — must match flower shader exactly
  float windTime = uTime * 0.8;
  float swayX = snoise(vec2(offset.x * 0.04 + windTime * 0.2 + phase, offset.z * 0.04)) * uWindStrength * 0.4;

  float sway = vHeight * vHeight;
  pos.x += swayX * sway;
  pos.y += sin(uTime * 1.5 + phase * 6.28) * 0.03 * sway;

  // Synthetic normal from wind/curve displacement
  vNormal = normalize(vec3(-swayX * 0.3, 1.0, -sin(phase) * stemCurve * 0.3));

  pos += offset;
  vWorldPos = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
