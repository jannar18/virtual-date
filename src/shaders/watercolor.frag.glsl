uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uEdgeStrength;
uniform float uPosterize;
uniform float uGrain;
uniform float uBleed;
uniform float uWarmth;
uniform float uSaturation;
uniform float uVignette;

varying vec2 vUv;

/* ── helpers ──────────────────────────────────────────── */

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// hash-based noise, stable per-pixel
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/* ── 1. Soft Edge Detection (Sobel on luminance) ─────── */

float sobelEdge(vec2 uv) {
  vec2 px = 1.0 / uResolution;

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
  vec2 px = 1.0 / uResolution;
  vec3 color = texture2D(tDiffuse, vUv).rgb;

  /* 4. Soft Color Bleeding — sample neighbors first so
        posterization and edges operate on the bled result */
  vec2 off = px * uBleed;
  vec3 n  = texture2D(tDiffuse, vUv + vec2( 0.0,  off.y)).rgb;
  vec3 s  = texture2D(tDiffuse, vUv + vec2( 0.0, -off.y)).rgb;
  vec3 e  = texture2D(tDiffuse, vUv + vec2( off.x, 0.0 )).rgb;
  vec3 w  = texture2D(tDiffuse, vUv + vec2(-off.x, 0.0 )).rgb;
  vec3 bled = color * 0.5 + (n + s + e + w) * 0.125;
  color = mix(color, bled, step(0.001, uBleed));

  /* 1. Soft Edge Detection */
  float edge = sobelEdge(vUv);
  // warm brown edge tint (not black)
  vec3 edgeColor = vec3(0.25, 0.18, 0.12);
  color *= mix(vec3(1.0), edgeColor, uEdgeStrength * smoothstep(0.05, 0.4, edge));

  /* 2. Gentle Posterization */
  float levels = 10.0;
  vec3 posterized = floor(color * levels + 0.5) / levels;
  color = mix(color, posterized, uPosterize);

  /* 3. Paper Grain Texture */
  float noise = hash(gl_FragCoord.xy * 0.7);
  color *= 1.0 - uGrain * noise;

  /* 5. Warm Color Grading */
  // Convert to HSL-like space for saturation
  float lum = luma(color);
  vec3 grey = vec3(lum);
  color = mix(grey, color, uSaturation);

  // Warmth: boost reds/yellows, soften blues
  color.r += uWarmth * 0.06;
  color.g += uWarmth * 0.02;
  color.b -= uWarmth * 0.04;

  /* 6. Brightness lift — compensate for cumulative darkening */
  color *= 1.08;

  /* 7. Vignette */
  float dist = length(vUv - 0.5) * 1.414; // 0 at center, ~1 at corners
  float vig = 1.0 - uVignette * dist * dist;
  color *= vig;

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}
