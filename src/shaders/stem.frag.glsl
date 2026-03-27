uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform vec3 uStemBase;
uniform vec3 uStemTip;

varying float vHeight;
varying vec3 vWorldPos;

void main() {
  vec3 color = mix(uStemBase, uStemTip, vHeight);

  // Distance fog
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  float fogFactor = smoothstep(uFogNear, uFogFar, depth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
