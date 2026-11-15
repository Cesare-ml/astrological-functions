# House-cusp single-read / caller-array isolation — 14 November 2026

**Status: DRAFT / UNRELEASED.** Directly stacked on [PR #106](https://github.com/Cesare-ml/astrological-functions/pull/106), which itself depends on the clean-main provider integration [#104](https://github.com/Cesare-ml/astrological-functions/pull/104).

## Defect reproduced

The original public `locateLongitudeInHouses` in exact Git source `c4e1772d8472403901bac08f7f6bab2e7b69f187` checks each indexed cusp up to three times (type, finiteness, and `cusps.map`). With a mutable first cusp returning `0` and then `15`, the function mistakenly places longitude `5°` in house **12** instead of **1**, with **three getter reads**. A caller-owned `cusps.map` can replace all validated values with fabricated cusps; a caller-owned `Symbol.iterator` can likewise change which cusps `validateHouseCuspSet` captures through `Array.from`.

## Fix and scope

Introduce one internal `snapshotHouseCusps` helper shared by `locateLongitudeInHouses` and `validateHouseCuspSet`. It requires a dense 12-element array with **own** indexed slots; it reads each cusp once, checks number/finite on the same primitive, normalizes with existing `normalize360`, and stores it in a trusted native array. No user `.map`, `Symbol.iterator`, subclass `Symbol.species`, or second getter read is used. The existing direct half-open interval geometry, ULP-precise 30°/360° seam ownership, nonuniform cusp geometry checks, provenance validation, house metadata, birth-time requirements, and error codes are preserved.

New `test/house-cusp-caller-array-snapshot.test.mjs`: 11 synthetic adversarial and regression tests (changing valid getter, first-read invalid, forged `.map`, forged iterator in direct placement and cusp validation, one-read validation, invalid validation first read, inherited sparse slots, frozen/detached snapshot, house context end-to-end, and exact binary64 pre-cusp boundary).

## Verification and gates

Pre-commit V8 source replay verifies the fixed 5° house 1 assignment with **one** getter read, zero map/iterator calls, rejection of invalid and inherited cusps. Added regression suite and existing tests must be executed against final GitHub blobs after commit. These synthetic checks are **not native Node `npm test`**, and astronomy is delegated to the pinned Rust/WASM/JPL provider. Native Node/TypeScript suite, licensing/security review, current-main drift and independent merge approval are mandatory. No GitHub Actions, npm publication, Swiss fallback or production deployment.

## Post-commit exact-source regression replay

The branch's exact GitHub `src/index.mjs` blob `3b8485020f3071365d3f3a8403a972752dfc59bf` and **21 actual GitHub test files** were loaded in two focused batches of strict JavaScript V8 callbacks with the Node `node:test`, `node:assert/strict`, and ESM import wrappers substituted:

- First nine test files: **52/52 passed**, including the 11 new cusp-array tests, cusp context/provenance, sparse and frozen snapshots, plus original `test/house-cusp-preboundary-ulp.test.mjs` with its deterministic **90,000** cusp predecessor/exact/successor observations.
- Next twelve files: **59/59 passed**, including house policy, birth-time refusal, external provider-to-house composition, numeric precision, body-identifier single-read and async body-list mutation regression.
- Combined: **111/111 passed, zero load failures, zero callback failures**.

The code bodies and test callbacks were fetched exactly from this GitHub commit; however, the sandbox directly invoked them rather than running the real `node --test` runner, and package self-import resolution was simulated. **These are not native Node `npm test` results.** The complete native JS test suite, strict NodeNext/Bundler TypeScript consumer fixtures, integration with current `main`, actual Rust/WASM JPL data and scientific parity remain release and merge blockers.
