# House cusp single-read boundary — 14 November 2026

**Status: IMPLEMENTED_ISOLATED.** Pure geometric house placement only. This patch does not calculate astronomical cusps, change house-system policy or modify the Rust/WASM ephemeris boundary.

## Reproduced check/use defect

The existing `locateLongitudeInHouses` checked the twelve numeric cusp slots, then constructed its working data with the caller-owned `cusps.map(normalize360)`. An overridden `.map` could replace all validated cusp values with unrelated values while still producing a valid-looking house result. Accessor-backed cusp slots were read repeatedly during shape validation and later during `.map`, allowing a first-read invalid cusp to become accepted or a previously validated boundary to change.

For example, equal-house cusp input `[0, 30, ..., 330]` has house 1 at 5 degrees. A custom `map` that substituted `[15, 45, ..., 345]` caused the original implementation to report house 12. The fix makes the validated input and used numeric snapshot identical.

## Scoped correction

After checking that input is exactly a twelve-element Array, read each **own** cusp slot once into a fresh ordinary array and reject nonfinite values before normalization. Compute twelve spans and their sum from that local snapshot without invoking `map` or `Symbol.species` hooks from the caller's array. Existing half-open comparisons, binary64 cusp predecessor ownership (merged PR #96), exact-cusp behavior, error codes and frozen result shape remain unchanged. This is a shallow snapshot: it does not promise atomicity across arbitrary proxies or other mutable application objects.

## Actual native validation

Local reconstruction based on exact `main` commit `e512da3b39fed87be50049e6d4f3788a6cf595d3`; source and test files used in the test runner are SHA-matched to GitHub, not a direct authenticated clone. Native **Node.js v22.16.0**:

- Before the patch, the five new targeted tests: **1 passed, 4 failed**, reproducing hostile `map`/species and getter check/use drift.
- After the patch, targeted tests: **5/5 passed**.
- Entire local `npm test` suite: **92/92 passed, zero failed, zero skipped** (87 tests from main + five new regressions, including the pre-existing house boundary sweep over 90,000 placements).
- `node --check` on modified runtime and regression file: **passed**.
- TypeScript **v5.8.3** strict NodeNext check across all five existing `test/types/*.ts` fixtures: **passed**.
- Verified Git blob SHA-1 of exact tested files: `src/index.mjs` = `6d2d5915837472f4a8f8232648f98e5e85ef2e15`, `test/house-cusp-input-snapshot.test.mjs` = `a2aa15b43e73810f2af646e48304a502782525b4`.

All numerical inputs are synthetic. No real JPL/Rust positions, external house cusp derivation, VirgoStars Desktop/Chart rollout, npm publication, GitHub Actions, production migration or visibility/license modification was performed.

## Provider integration gate

F2/F3 provider PR #104 also edits `src/index.mjs` and calls `locateLongitudeInHouses` downstream. **Before merging #104**, reconcile this main-derived cusp snapshot patch along with the already integrated #96, #103 and #105 binary64 and zodiac corrections; then rerun its complete native Node and strict TypeScript consumer tests on the true combined head. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the planned sole astronomical engine.
