## Critical Code Review
- **Date:** 2026-03-27 18:30 EST
- **Model:** Claude Opus 4.6 (claude-opus-4-6)
- **Branch:** main (3 commits ahead of origin)
- **Latest Commit:** adfd138 Add procedural ground texture and update Howl's Secret Garden preset
- **Linear Story:** N/A (direct main commits)
- **Review Type:** Critical/Adversarial
---

## The Ugly Truth

These 3 commits add cel-shaded lighting, a Ghibli-style post-processing pass, a procedural ground texture, and a 3D cottage model to the flower field. The shader work is competent — the cel.glsl helper is clean, the Sobel-based ink outlines are well-implemented, and the synthetic normals are a reasonable hack for non-lit instanced geometry. The artistic direction is clear and the reference image (Howl's Secret Garden) is well-targeted.

**But there are real problems.** An 83MB GLB with zero error handling or loading feedback. A ground texture that uses `Math.random()` in a codebase that is explicitly seeded for multiplayer consistency. A GUI ambient slider that says 0.45 while the shaders say 0.65. And the entire cel-shading system is invisible to the preset and network sync systems — it's a client-local island in an otherwise synchronized world.

None of these will crash the app on the happy path. All of them will bite you.

## What Will Break

1. **Ground texture divergence across clients.** `createGroundTexture()` (main.js:266-337) calls `Math.random()` ~7,280 times. Every player sees a different ground pattern. Every page refresh produces a different texture. The rest of the codebase uses `seededRandom()` precisely to prevent this.

2. **Ambient slider jumps on first touch.** `ambientCtrl` initializes with `{ ambient: 0.45 }` (main.js:1453) but all shader materials set `uAmbientStrength: 0.65` (main.js:421, 513, etc.). The GUI displays 0.45; the scene renders at 0.65. The moment someone drags the ambient slider, the scene darkens from 0.65 to wherever the slider is — a visible pop.

3. **Post-processing is blurry on Retina/HiDPI.** The resize handler calls `composer.setSize(w, h)` with CSS pixel dimensions (main.js:1189), but the renderer draws at `w * pixelRatio`. The EffectComposer render targets are at half resolution on a 2x display. The Sobel outline thickness is also wrong because `uResolution` receives CSS pixels, not framebuffer pixels.

4. **Cottage loads silently fail.** `loader.load('/cottage.glb', onSuccess)` has no error or progress callbacks (main.js:1493). If the file is missing (it's untracked — anyone cloning gets no cottage), there's no error message, no fallback, nothing. Just a scene missing a major element with no indication why.

## What's Missing

- **Error callback on GLTFLoader.load** — at minimum `(err) => console.warn('Cottage load failed:', err)`
- **Cel-shading params in PRESET_KEYS** — `celBands`, `celSoftness`, `ambientStrength` are not saved/loaded with presets and not synced over the network
- **Loading indicator for 83MB asset** — users on slower connections will stare at an empty scene element for 10+ seconds
- **Pixel ratio handling in post-processing** — `composer.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio())` and same for `uResolution`

## The Nits

- `watercolorFrag` is imported (main.js:16) but never used — `ghibliFrag` replaced it. Dead import.
- `watercolor.frag.glsl` still exists as a file but is dead code (only `watercolor.vert.glsl` is used as the Ghibli pass vertex shader)
- Cottage material manipulation `hsl.s * 5.0` and `hsl.l * 5.0` (main.js:1507) will clamp nearly everything to `(1.0, 1.0)` — you're losing all tonal variation in the original model materials. A 1.5-2x boost would preserve some of the original shading.
- `presets.json` and `public/` are untracked — `presets.json` should be committed or .gitignored; `cottage.glb` (83MB) needs git-lfs or a download script
- The Style GUI folder controls (outlines, quantize, warmth, haze) don't sync across players, which is inconsistent with every other GUI control syncing via the network system

---

## Numbered Issues

### Blockers

*(None that prevent the happy path from working. But a couple of these Important issues are close.)*

### Important

**1. `Math.random()` in `createGroundTexture()` breaks multiplayer consistency**
- File: `src/main.js:266-337`
- Every loop in this function uses `Math.random()`. The rest of the codebase uses `seededRandom()` for deterministic placement. Players see different ground textures.
- Fix: Pass the seed through and use `seededRandom()`, or call `createGroundTexture()` after `resetToSeed()`.
- **Status:** ✅ Confirmed — direct `Math.random()` calls visible in source, no seed dependency

**2. Ambient GUI/shader value mismatch (0.45 vs 0.65)**
- File: `src/main.js:1453` (GUI) vs `src/main.js:421,513` (shader uniforms)
- GUI object: `{ ambient: 0.45 }`. Shader uniform: `uAmbientStrength: { value: 0.65 }`.
- First slider interaction causes a visible brightness pop.
- Fix: Set `ambientCtrl` to `{ ambient: 0.65 }` to match the shader default.
- **Status:** ✅ Confirmed — values directly observable in source

**3. Post-processing resolution ignores pixel ratio**
- File: `src/main.js:228,1189-1190`
- `uResolution` is set from `window.innerWidth/Height` (CSS pixels). `composer.setSize()` receives CSS pixels. On a 2x display, the post-processing render targets are at half the framebuffer resolution.
- This makes outlines 2x thicker than intended on Retina, and the overall output is blurry.
- Fix: Multiply by `renderer.getPixelRatio()` for both `uResolution` and `composer.setSize()`.
- **Status:** ✅ Confirmed — standard Three.js EffectComposer foot-gun, pixel ratio not accounted for

**4. `loadCottage()` has no error handling for an 83MB network request**
- File: `src/main.js:1491-1515`
- No error callback, no progress callback, no loading indicator.
- If the fetch fails (404, timeout, CORS), the user gets nothing — no error in the UI, potentially an uncaught promise rejection.
- Also: the file is in untracked `public/` — anyone cloning the repo won't have it.
- Fix: Add error callback, consider a loading progress bar, document the GLB dependency.
- **Status:** ✅ Confirmed — `loader.load()` called with only 2 args (url, onLoad)

**5. Cel-shading parameters are disconnected from preset/network system**
- File: `src/main.js:1449-1454` (GUI), `src/main.js:32-56` (PRESET_KEYS)
- `celBands`, `celSoftness`, `ambientStrength` exist as local GUI controller objects, not in `params`, not in `PRESET_KEYS`, not synced over network.
- Switching presets doesn't change cel-shading. Other players don't see cel-shading changes. Saving presets doesn't capture cel values.
- Fix: Add these to `params` and `PRESET_KEYS`, update `setCelUniformOnAll` in `applyRemoteParams`.
- **Status:** ✅ Confirmed — params absent from PRESET_KEYS array and params object

### Potential

**6. Dead import: `watercolorFrag`**
- File: `src/main.js:16`
- Imported but never referenced after the switch to `ghibliFrag`. Tree-shaking may or may not eliminate it depending on build config.
- **Status:** ✅ Confirmed — grep shows no usage beyond the import statement

**7. Cottage material 5x boost destroys tonal variation**
- File: `src/main.js:1507`
- `Math.min(hsl.s * 5.0, 1.0)` and `Math.min(hsl.l * 5.0, 1.0)` — any material with saturation > 0.2 or lightness > 0.2 clamps to 1.0. The cottage becomes uniformly bright and saturated.
- This might be intentional for the current model, but it's brittle — swap in a different GLB and it'll look wrong.
- **Status:** ❓ Likely — depends on the specific model's material values, but 5x is aggressive

**8. 83MB binary in untracked `public/`**
- `public/cottage.glb` is not committed and not in `.gitignore`. This is a deployment/onboarding gap. New clones break silently (see #4).
- **Status:** ✅ Confirmed — `git status` shows `public/` as untracked

**9. `presets.json` untracked**
- Server-side presets file sitting in the repo root, not committed, not gitignored. Easy to accidentally lose.
- **Status:** ⬇️ Real but lower priority — server regenerates this from client saves

---

## Closing

**Would I mass deploy this to 100k users?** No.

The Math.random() ground texture (#1) is a consistency bug in a multiplayer app. The HiDPI post-processing issue (#3) means every Retina Mac and modern phone sees degraded visuals. The ambient value mismatch (#2) is a user-facing glitch waiting to happen. And the 83MB cottage with no error handling (#4) is a loading experience problem.

None of these are catastrophic. The shaders are solid, the architecture is coherent, and the artistic direction is strong. But these are the kind of issues that make the difference between "cool prototype" and "reliable product." Fix #1 through #4 before sharing this widely. #5 is a design decision about whether cel-shading should be per-client or synced — decide and implement accordingly.

The code is 80% of the way there. The last 20% is the boring part that prevents 3am pages.
