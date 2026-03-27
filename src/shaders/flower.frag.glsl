#include "cel.glsl"

uniform vec3 uCenterColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform vec3 uLightDir;
uniform float uCelBands;
uniform float uCelSoftness;
uniform float uAmbientStrength;

varying vec3 vColor;
varying float vPetalDist;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Center color fading to petal color
  float centerMix = 1.0 - smoothstep(0.0, 0.35, vPetalDist);
  vec3 color = mix(vColor, uCenterColor, centerMix * 0.85);

  // Subtle darkening toward petal tips
  color *= 0.85 + 0.15 * (1.0 - vPetalDist);

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
