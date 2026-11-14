# F1/F2/F3 house cusp ULP integration — 14 November 2026

Status: **DRAFT / INTEGRATION_STAGING / NOT RELEASED**.

Main commit `87bcb5c70af544672e442fc24c8bbced2ae10fe7` contains merged PR #96's ULP-safe cusp-side logic. The F2 provider and house-snapshot stack #92 → #94 → #97 still used an older `locateLongitudeInHouses` implementation that misclassified `29.999999999999996°` as starting a house at `30°`. This branch is directly stacked on unchanged PR #97 head `f95a3255440e00421ea21f1a26c077b4c2337dba`. The *only* runtime change transplants `locateLongitudeInHouses` verbatim from current main source blob `6af1b546681416383773d6d48b30b8a330469e1a`; the rest of `src/index.mjs` stays from #97 source blob `7673ef5847122822a2a2145721c976d24a1f9e00`.

Retains the **exact unchanged Git test blob** `350cbc027aea79de9de8d823d6e9f02a7d9a68bb` from merged PR #96 as `test/house-cusp-preboundary-ulp.test.mjs`, adds `test/provider-house-ulp-bridge.test.mjs` for provider→natal→house continuity at 30°/360° and the unknown-birth-time gate, and adds this evidence file.

Verification: exact stitched runtime with the seven #96 tests and six #97 getter snapshot tests: **13/13 passed** under strict JavaScript V8 `node:test`-like emulation, including **90,000 deterministic cusp observations**. New provider→house bridge preview: **3/3 passed** with the same V8 execution. These are **not native Node or TypeScript test results**. PR #96's reported native tests apply to its own main-derived code, not this combined tree.

Release gates: keep the PR as a draft stacked on #97; rerun native `npm test`, Node ESM consumer resolution and `tsc` NodeNext/Bundler on the exact combined checkout, reconcile other exports and recent `main` changes, and retain pinned Rust/WASM apparent-of-date/JPL accuracy and provenance as non-negotiable prerequisites. No Swiss fallback, GitHub Actions, npm publishing, deployment, DB or production changes.
