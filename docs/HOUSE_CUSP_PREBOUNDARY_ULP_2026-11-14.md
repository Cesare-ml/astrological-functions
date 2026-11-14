# House cusp ownership at binary64 boundaries — integration note

**14 November 2026 · isolated pure mathematical correction.** This patch integrates the fix from draft PR #62 on a clean main-derived branch. Its original prerequisite, PR #50, was already squash-merged into main. It does not modify ephemerides, house producers, Rust/WASM, chart rendering, packaging, releases, GitHub Actions or deployed applications.

## Reproduction

At a first cusp of 30°, a point at 29.999999999999996° belongs to **house 12**, whereas a point at exactly 30° belongs to **house 1**. The old calculation normalized the tiny negative difference `lon - cusp`, which could round to 0° after adding 360° and incorrectly assign the point to house 1.

The fix selects a **half-open interval first**, by directly comparing normalized longitudes:
- Unwrapped interval: `start <= lon && lon < end`.
- Aries-wrapping interval: `lon >= start || lon < end`.

Only after selecting the correct interval does it calculate a nonnegative `distanceFromCuspDeg`. It uses no arbitrary tolerance and retains the existing frozen result shape. Dense, finite twelve-cusp inputs are required; malformed cusps raise `INVALID_CUSPS`, while invalid planet longitudes keep `INVALID_ANGLE`.

## Verification using exact GitHub blob files

The original main source `src/index.mjs` (`78a494e5aca0e9d9e4423f88d9401c50046fd570`) assigns 29.999999999999996° to house 1 when cusp 1 is 30°. The corrected source (`6af1b546681416383773d6d48b30b8a330469e1a`) assigns it to house 12. **Both hashes were reproduced locally using `git hash-object`.**

The exact regression file (`350cbc027aea79de9de8d823d6e9f02a7d9a68bb`) was run with **native Node.js 22.16.0**. It passed **7/7** tests including 2,500 deterministic nonuniform twelve-house configurations and **90,000 predecessor/exact/successor checks**. Combined native Node tests from exact GitHub source/test blobs:

```sh
node --test test/math.test.mjs test/angle-normalization-precision.test.mjs test/house-cusp-preboundary-ulp.test.mjs
# 19 tests passed, zero failed (4 existing math, 8 precision, 7 cusp regression)
```

All four tested files (corrected source, main math, precision, and new regression) matched GitHub blob SHA-1s. This is **not** a claim of a complete full-repository `npm test`, a real chart comparison, scientific JPL parity or downstream VirgoStars Desktop regression. Integrating this patch requires review of conflicting house-method and source-provenance branches.

No implicit house method, astronomical source data, package export or production status is changed. VirgoStars credits and licensed-source review remain required for later distribution.
