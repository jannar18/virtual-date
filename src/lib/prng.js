// Mulberry32 seeded PRNG — deterministic random for identical flower placement
let _state = 0;

function mulberry32() {
  _state |= 0;
  _state = (_state + 0x6d2b79f5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function resetToSeed(seed) {
  _state = seed | 0;
}

export function seededRandom() {
  return mulberry32();
}
