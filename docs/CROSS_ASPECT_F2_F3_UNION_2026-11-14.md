# F2/F3 cross-aspect input union — 14 November 2026

**DRAFT / experimental / not production:** clean stacked integration on PR #109, separate from original PRs #110 (on #107) and #111 (on #109). No automatic merge; no main branch changes.

## Exact consolidated source
The unmodified original PR #109 source is Git blob `de57b5ac432890baab20e3b0940393a8fe3e8204`. This branch transplants only these two audited sections from the original PR #110 source blob `84190e28551f8aacdabfcfee97fe4c1ccaae0f41`:

1. `point` and `definition` copy each accessor-backed primitive once before validation and publishing the same value, preventing read-after-validate semantic drift. `snapshotAspectInputs` reads only dense, own indexed array elements; no caller-controlled iterator, `.map()` or `Symbol.species` is invoked.
2. `calculateCrossAspects` replaces exactly three `Array.from` input captures with `snapshotAspectInputs`, preserving previously validated directions, exact angle/orb rules, frozen output, and errors `INVALID_POINT`/`INVALID_ASPECT`.

The provider F2, natal house F3, main #108 cusp snapshot, #105 dodecatemoria precision, #103 zodiac policy, #98 batch hardening, and `private:true` typed ESM package map are **untouched**. No imports or declarations changed.

## Test evidence and limitations
- Two real regression files copied as exact GitHub blobs:
  - PR #110 `test/cross-aspect-input-snapshot.test.mjs` = `d0faa16ccd81dd43810db0af5cd5fcf6ba49c964` (13 adversarial tests).
  - PR #111 `test/cross-aspect-single-read.test.mjs` = `3d8421233851d48df9c52e5711ec0dd3da797f1b` (8 property-getter tests).
- **46/46 isolated V8 test callbacks passed** on the exact #109+two-section composite JS source. These covered ten existing cross-aspect/provider-regression test files from #109 plus all 21 new cases from #110/#111. Node `node:test`, `node:assert/strict` and import interfaces were adapted to local registration/assert helpers: this is **not a native full `npm test`**.
- The parent PR #109 has a manual read-only gate `node scripts/verify-provider-integration.mjs` that must be invoked after an authenticated complete branch checkout. It enumerates and runs all Node tests, strict NodeNext/Bundler TypeScript fixtures and fails on incomplete checkout.

## Merge gate
Do NOT merge this or parent PR #109 into main until native full test/consumer checks, Rust/WASM/JPL apparent-geocentric-of-date source validation, licensing/credits/privacy review and downstream rollback plans are completed. Do not close original #110/#111 until this integration has been fully validated and the live PR dependency graph rechecked. No GitHub Actions, publishing, deployment, Swiss code, license or repo-visibility changes.

[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended astronomy engine.
