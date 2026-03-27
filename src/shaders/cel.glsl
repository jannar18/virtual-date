float celShade(float NdotL, float bands, float softness) {
  float scaled = NdotL * bands;
  float stepped = floor(scaled) + smoothstep(0.0, softness, fract(scaled));
  return stepped / bands;
}
