#include "cel.glsl"

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform vec3 uLightDir;
uniform float uCelBands;
uniform float uCelSoftness;
uniform float uAmbientStrength;

varying float vHeight;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Gradient from base to tip
  vec3 color = mix(uBaseColor, uTipColor, vHeight);

  // Subtle variation
  color *= 0.9 + 0.1 * fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);

  // Cel-shaded lighting
  float NdotL = max(dot(normalize(vNormal), uLightDir), 0.0);
  float lit = celShade(NdotL, uCelBands, uCelSoftness);
  color *= uAmbientStrength + (1.0 - uAmbientStrength) * lit;

  // Distance fog
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  float fogFactor = smoothstep(uFogNear, uFogFar, depth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
