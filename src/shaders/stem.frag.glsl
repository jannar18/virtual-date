#include "cel.glsl"

uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform vec3 uStemBase;
uniform vec3 uStemTip;
uniform vec3 uLightDir;
uniform float uCelBands;
uniform float uCelSoftness;
uniform float uAmbientStrength;

varying float vHeight;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 color = mix(uStemBase, uStemTip, vHeight);

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
