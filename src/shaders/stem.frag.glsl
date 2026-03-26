uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;

varying float vHeight;
varying vec3 vWorldPos;

void main() {
  // Dark green at base, lighter at top
  vec3 baseCol = vec3(0.15, 0.35, 0.1);
  vec3 tipCol  = vec3(0.25, 0.50, 0.15);
  vec3 color = mix(baseCol, tipCol, vHeight);

  // Distance fog
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  float fogFactor = smoothstep(uFogNear, uFogFar, depth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
