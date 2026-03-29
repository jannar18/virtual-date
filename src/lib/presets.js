// Preset data and helpers — pure data, no THREE.js

export const PRESET_KEYS = [
  'petalCount','petalLength','petalWidth','centerSize',
  'singleStems','singleStemSpread','singleStemThickness','singleStemCurve',
  'singlePetalTilt','singleBellWidth','singleBellFlare',
  'bundleStems','bundleFlowersPerStem','bundleStemSpread',
  'bundleStemThickness','bundleStemCurve','bundleStemHeightMult',
  'bundlePetalCount','bundlePetalLength','bundlePetalWidth',
  'bundleBellWidth','bundleBellFlare','bundlePetalTilt','bundleCenterSize',
  'scaleMin','scaleMax','flowerCount','singlePct','bundlePct','clusterPct',
  'stemHeightMin','stemHeightMax',
  'primaryColor','secondaryColor','centerColor',
  'bundleColor','bundleCenterColor',
  'singleStemBaseColor','singleStemTipColor',
  'bundleStemBaseColor','bundleStemTipColor',
  'clusterStems','clusterBudsPerStem','clusterBudSpread',
  'clusterStemThickness','clusterStemCurve','clusterStemHeightMult',
  'clusterPetalCount','clusterPetalLength','clusterPetalWidth',
  'clusterBellWidth','clusterBellFlare','clusterPetalTilt','clusterCenterSize',
  'clusterColor','clusterCenterColor',
  'clusterStemBaseColor','clusterStemTipColor',
  'grassCount',
  'grassBaseColor','grassTipColor','grassHeight',
  'patchBaseColor','patchTipColor','patchHeight','groundColor',
  'windStrength',
  'celBands','celSoftness','ambientStrength',
  'outlineStrength','outlineThickness','colorSteps',
  'quantizeStrength','warmth','saturation','hazeStrength',
];

export const PRESETS = {
  'Desert Spring': {
    petalCount: 4, petalLength: 0.6, petalWidth: 1.0, centerSize: 0.1,
    singleStems: 1, singleStemSpread: 0.02, singleStemThickness: 0.65, singleStemCurve: 0.0,
    singlePetalTilt: 0.25, singleBellWidth: 0.05, singleBellFlare: 0.0,
    bundleStems: 6, bundleFlowersPerStem: 4, bundleStemSpread: 0.2,
    bundleStemThickness: 0.5, bundleStemCurve: 0.35, bundleStemHeightMult: 2.0,
    bundlePetalCount: 4, bundlePetalLength: 0.1, bundlePetalWidth: 1.1,
    bundleBellWidth: 0.2, bundleBellFlare: 0.05, bundlePetalTilt: 1.0, bundleCenterSize: 0.02,
    scaleMin: 0.1, scaleMax: 0.5, stemHeightMin: 0.1, stemHeightMax: 0.6,
    flowerCount: 10000, singlePct: 55, bundlePct: 45, clusterPct: 0, windStrength: 0.83,
    primaryColor: '#ffebfc', secondaryColor: '#ffda8a', centerColor: '#fff3a0',
    bundleColor: '#ffaf94', bundleCenterColor: '#ffe4a0',
    singleStemBaseColor: '#99bf80', singleStemTipColor: '#99bf80',
    bundleStemBaseColor: '#a6c7ae', bundleStemTipColor: '#a6c7ae',
    clusterColor: '#b49adb', clusterCenterColor: '#9a84c0',
    clusterStemBaseColor: '#99bf80', clusterStemTipColor: '#99bf80',
    grassCount: 80000,
    grassBaseColor: '#d8d97d', grassTipColor: '#f7ffb8', grassHeight: 0.7,
    patchBaseColor: '#9ed963', patchTipColor: '#e6e882', patchHeight: 0.7,
    groundColor: '#feffbd',
    outlineStrength: 0.4, outlineThickness: 1.0, colorSteps: 14,
    quantizeStrength: 0.15, warmth: 0.15, saturation: 1.2, hazeStrength: 0.1,
  },
  "Howl's Secret Garden": {
    petalCount: 5, petalLength: 0.15, petalWidth: 0.7, centerSize: 0.04,
    singleStems: 4, singleStemSpread: 0.06, singleStemThickness: 0.25, singleStemCurve: 0.0,
    singlePetalTilt: 0.0, singleBellWidth: 0.08, singleBellFlare: 0.0,
    bundleStems: 4, bundleFlowersPerStem: 4, bundleStemSpread: 0.12,
    bundleStemThickness: 0.3, bundleStemCurve: 0.2, bundleStemHeightMult: 1.8,
    bundlePetalCount: 1, bundlePetalLength: 0.12, bundlePetalWidth: 1.2,
    bundleBellWidth: 0.14, bundleBellFlare: 0.02, bundlePetalTilt: 0.85, bundleCenterSize: 0.03,
    clusterStems: 1, clusterBudsPerStem: 6, clusterBudSpread: 0.04,
    clusterStemThickness: 0.4, clusterStemCurve: 0.1, clusterStemHeightMult: 1.4,
    clusterPetalCount: 5, clusterPetalLength: 0.08, clusterPetalWidth: 0.55,
    clusterBellWidth: 0.06, clusterBellFlare: 0.01, clusterPetalTilt: 0.92, clusterCenterSize: 0.02,
    scaleMin: 0.1, scaleMax: 0.75, stemHeightMin: 0.2, stemHeightMax: 0.75,
    flowerCount: 210000, singlePct: 90, bundlePct: 8, clusterPct: 20, windStrength: 0.19,
    primaryColor: '#ffffff', secondaryColor: '#ffe5f0', centerColor: '#ffee70',
    bundleColor: '#ffc7d6', bundleCenterColor: '#f58fa8',
    clusterColor: '#b49adb', clusterCenterColor: '#9a84c0',
    singleStemBaseColor: '#5a9a48', singleStemTipColor: '#5a9a48',
    bundleStemBaseColor: '#9fc119', bundleStemTipColor: '#6a9a55',
    clusterStemBaseColor: '#71c261', clusterStemTipColor: '#71c261',
    grassCount: 600000,
    grassBaseColor: '#41a45a', grassTipColor: '#add978', grassHeight: 0.2,
    patchBaseColor: '#1d8724', patchTipColor: '#56a13a', patchHeight: 0.55,
    groundColor: '#d9ff42',
    outlineStrength: 0.4, outlineThickness: 1.0, colorSteps: 14,
    quantizeStrength: 0.15, warmth: 0.15, saturation: 1.2, hazeStrength: 0.1,
  },
  Daisy:       { petalCount: 8,  petalLength: 0.5,  petalWidth: 0.55, centerSize: 0.12, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Poppy:       { petalCount: 4,  petalLength: 0.55, petalWidth: 0.85, centerSize: 0.08, singlePetalTilt: 0.15, singleBellWidth: 0.28, singleBellFlare: 0.04 },
  Cosmos:      { petalCount: 8,  petalLength: 0.6,  petalWidth: 0.5,  centerSize: 0.10, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Buttercup:   { petalCount: 5,  petalLength: 0.35, petalWidth: 0.7,  centerSize: 0.15, singlePetalTilt: 0.1,  singleBellWidth: 0.20, singleBellFlare: 0.03 },
  'Wild Rose': { petalCount: 5,  petalLength: 0.5,  petalWidth: 0.75, centerSize: 0.10, singlePetalTilt: 0.0,  singleBellWidth: 0.25, singleBellFlare: 0.0 },
  Sunflower:   { petalCount: 10, petalLength: 0.55, petalWidth: 0.35, centerSize: 0.18, singlePetalTilt: 0.0,  singleBellWidth: 0.22, singleBellFlare: 0.0 },
};

const DEFAULT_PARAMS = {
  preset: "Howl's Secret Garden",

  petalCount: 5, petalLength: 0.15, petalWidth: 0.7, centerSize: 0.04,
  singleStems: 4, singleStemSpread: 0.06, singleStemThickness: 0.25, singleStemCurve: 0.0,
  singleBellWidth: 0.08, singleBellFlare: 0.0, singlePetalTilt: 0.0,

  bundleStems: 4, bundleFlowersPerStem: 4, bundleStemSpread: 0.12,
  bundleStemThickness: 0.3, bundleStemCurve: 0.2, bundleStemHeightMult: 1.8,
  bundlePetalCount: 1, bundlePetalLength: 0.12, bundlePetalWidth: 1.2,
  bundleBellWidth: 0.14, bundleBellFlare: 0.02, bundlePetalTilt: 0.85, bundleCenterSize: 0.03,

  clusterStems: 1, clusterBudsPerStem: 6, clusterBudSpread: 0.04,
  clusterStemThickness: 0.4, clusterStemCurve: 0.1, clusterStemHeightMult: 1.4,
  clusterPetalCount: 5, clusterPetalLength: 0.08, clusterPetalWidth: 0.55,
  clusterBellWidth: 0.06, clusterBellFlare: 0.01, clusterPetalTilt: 0.92, clusterCenterSize: 0.02,

  scaleMin: 0.1, scaleMax: 0.75,
  flowerCount: 180000, singlePct: 90, bundlePct: 8, clusterPct: 20,
  stemHeightMin: 0.2, stemHeightMax: 0.75,

  primaryColor: '#ffffff', secondaryColor: '#ffe5f0', centerColor: '#ffee70',
  bundleColor: '#ffc7d6', bundleCenterColor: '#f58fa8',
  clusterColor: '#b49adb', clusterCenterColor: '#9a84c0',

  singleStemBaseColor: '#5a9a48', singleStemTipColor: '#5a9a48',
  bundleStemBaseColor: '#9fc119', bundleStemTipColor: '#6a9a55',
  clusterStemBaseColor: '#71c261', clusterStemTipColor: '#71c261',

  grassCount: 5000,
  grassBaseColor: '#41a45a', grassTipColor: '#add978', grassHeight: 0.2,
  patchBaseColor: '#1d8724', patchTipColor: '#56a13a', patchHeight: 0.55,
  groundColor: '#d9ff42',

  windStrength: 0.19,
  celBands: 3.0, celSoftness: 0.08, ambientStrength: 0.65,
  outlineStrength: 0.4, outlineThickness: 1.0, colorSteps: 14,
  quantizeStrength: 0.15, warmth: 0.15, saturation: 1.2, hazeStrength: 0.1,
};

export function createDefaultParams() {
  return { ...DEFAULT_PARAMS };
}

export function applyPreset(params, presetName, presets = PRESETS) {
  const preset = presets[presetName];
  if (!preset) return { ...params };
  return { ...params, ...preset, preset: presetName };
}

export function createPresetSnapshot(params) {
  const snapshot = {};
  for (const k of PRESET_KEYS) {
    if (k in params) snapshot[k] = params[k];
  }
  return snapshot;
}
