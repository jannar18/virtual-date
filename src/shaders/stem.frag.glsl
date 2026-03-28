#include "noise.glsl"
#include "cel.glsl"

uniform float uTime;
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

float cloudShadow(vec2 pos, float t) {
  float drift = t * 0.4;
  float n1 = snoise(vec2(pos.x * 0.015 + drift, pos.y * 0.015 + drift * 0.3));
  float n2 = snoise(vec2(pos.x * 0.04 - drift * 0.5, pos.y * 0.04 + 20.0));
  float cloud = n1 * 0.65 + n2 * 0.35;
  return smoothstep(-0.1, 0.5, cloud);
}

void main() {
  vec3 color = mix(uStemBase, uStemTip, vHeight);

  // Cloud shadow
  float shadow = cloudShadow(vWorldPos.xz, uTime);
  color *= 1.0 - shadow * 0.25;

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
