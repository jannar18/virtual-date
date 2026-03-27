uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uOutlineStrength;
uniform float uOutlineThickness;
uniform float uColorSteps;
uniform float uQuantizeStrength;
uniform float uWarmth;
uniform float uSaturation;
uniform float uHazeStrength;
uniform vec3 uHazeColor;

varying vec2 vUv;

/* ── helpers ──────────────────────────────────────────── */

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

/* ── 1. Clean Sobel Outlines ─────────────────────────── */

float sobelEdge(vec2 uv) {
  vec2 px = uOutlineThickness / uResolution;

  float tl = luma(texture2D(tDiffuse, uv + vec2(-px.x,  px.y)).rgb);
  float tc = luma(texture2D(tDiffuse, uv + vec2( 0.0,   px.y)).rgb);
  float tr = luma(texture2D(tDiffuse, uv + vec2( px.x,  px.y)).rgb);
  float ml = luma(texture2D(tDiffuse, uv + vec2(-px.x,  0.0 )).rgb);
  float mr = luma(texture2D(tDiffuse, uv + vec2( px.x,  0.0 )).rgb);
  float bl = luma(texture2D(tDiffuse, uv + vec2(-px.x, -px.y)).rgb);
  float bc = luma(texture2D(tDiffuse, uv + vec2( 0.0,  -px.y)).rgb);
  float br = luma(texture2D(tDiffuse, uv + vec2( px.x, -px.y)).rgb);

  float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
  float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;

  return sqrt(gx*gx + gy*gy);
}

/* ── main ─────────────────────────────────────────────── */

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;

  /* 1. Clean ink outlines — warm brown, sharp threshold */
  float edge = sobelEdge(vUv);
  vec3 inkColor = vec3(0.28, 0.20, 0.14);
  float edgeMask = smoothstep(0.08, 0.25, edge);
  color = mix(color, inkColor, uOutlineStrength * edgeMask);

  /* 2. Gentle color quantization — painted feel without banding */
  vec3 quantized = floor(color * uColorSteps + 0.5) / uColorSteps;
  color = mix(color, quantized, uQuantizeStrength);

  /* 3. Warm color grading — boost greens slightly, warm highlights */
  float l = luma(color);
  vec3 grey = vec3(l);
  color = mix(grey, color, uSaturation);

  color.r += uWarmth * 0.05;
  color.g += uWarmth * 0.03;
  color.b -= uWarmth * 0.03;

  /* 4. Brightness lift — keep the painted look bright */
  color *= 1.06;

  /* 5. Soft atmospheric haze — sky-blue tint toward edges */
  float dist = length(vUv - 0.5) * 1.414;
  float hazeMask = dist * dist;
  color = mix(color, uHazeColor, uHazeStrength * hazeMask);

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}
