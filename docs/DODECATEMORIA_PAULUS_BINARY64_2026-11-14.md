# Dodecatemoria 13-fold binary64 boundary precision — 14 November 2026

**Status: IMPLEMENTED_ISOLATED.** A small numerical correction to the existing original VirgoStars-owned dodecatemoria math. No astronomy source, JPL kernel, Swiss binding, UI, database, real person data, package export or TypeScript contract is changed.

## Problem reproduced in main

The original `dodecatemoriaLongitude` computed `normalize360(longitude * 13)`. JavaScript binary64 multiplication can round values immediately before an internal 13-fold wrap to exact multiples of 360, making a result that mathematically belongs in **29°59… Pisces appear as exactly 0° Aries** in the projected zodiac. Concrete double-precision examples:

| Source longitude | Original 13-fold | Corrected 13-fold |
| --- | --- | --- |
| 138.46153846153845° | 0° | 359.9999999999999° |
| 193.84615384615384° | 0° | 359.9999999999999° |
| 249.23076923076923° | 0° | 359.99999999999994° |
| 276.9230769230769° | 0° | 359.9999999999998° |

The immediately representable value before 360° also loses accuracy under direct multiplication; `Number.MAX_VALUE` and some other **finite** numeric inputs overflow to Infinity when multiplied by 13 and are rejected despite `normalize360` accepting them.

## Fix

The modulus identity `(13 * (30 * sign + withinSign)) mod 360 = (30 * sign + 13 * withinSign) mod 360` allows normalization **before** multiplying. A sign-local calculation prevents the large intermediate multiply. In the upper half of a sign we subtract the scaled gap from the next 30-degree cusp to retain sub-ULP predecessor identity; in the lower half we multiply the small within-sign offset directly.

This keeps both historical conventions explicitly versioned: `PAULUS_13_V1` delegates to the corrected root helper; `TWELVE_EQUAL_PARTS_V1` and its separate formula remain untouched. The `DodecatemoriaBatchFacts` output schema and existing input validation remain unchanged.

## Native and independent mathematical validation

Local directory reconstructed from authentic GitHub SHA-matched files at baseline `7dd69398c81561274f46f39f396c7e5c6596aa57` (contains merged PR #93). Node.js **v22.16.0** and TypeScript **v5.8.3**:

- Pre-fix original `src/index.mjs`: **0/4** initial focused tests passed; the four internal wrap examples also failed on the original implementation.
- Patched `node --test test/dodecatemoria-modular-precision.test.mjs`: **5/5 passed**.
- Combined local `npm test`: **83/83 passed, 0 failed, 0 skipped**. This includes 66 baseline application-independent Node tests, 12 SHA-pinned PR snapshot tests from merged #93, and five new seam/overflow tests.
- Strict `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict test/types/*.ts`: **passed** for five existing TypeScript fixtures.
- `node --check` on modified module and added test: **passed**.
- Cross-check: **20,072 synthetic double values** evaluated in actual Node against Python `Decimal.from_float` at precision 90: maximum absolute discrepancy **5.684341886080802e-14 degrees**; zero corrected cases exceeded 1e-12 degrees, versus four catastrophic near-360 wrap errors in the original function. This is a **numerical software reference**, not observed astronomy or JPL reference validation.

Git blobs of native-tested code:
- `src/index.mjs`: `f7c9cc190d6032af4850a0f7e9edd6f0fc456f3a`
- `test/dodecatemoria-modular-precision.test.mjs`: `04eab3fe09aabf094efeb6d7e473cdac9f38a6c0`

**Integration caution:** several stacked provider PRs (#92/#94 and descendants) also modify `src/index.mjs`. Before merging those, reconcile this numerical change against the provider branch, run the combined complete native suite, and preserve the binary64 boundary tests. This isolated code does not authorize an unattended merge or production release. The package stays private. No GitHub Actions, npm publication, licensing/visibility change or real Rust/WASM/JPL testing was performed. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the planned sole astronomical engine.
