# F2/F3 cross-aspect indexed-input reconciliation — 14 November 2026

**Status: DRAFT / STACKED INTEGRATION.** This integrates the iterator/array protection independently developed in PR #110 onto the **newer, main-reconciled** F2/F3 stack (PR #109 -> #111). It does not introduce a second astronomy engine, change aspect mathematics, or alter the public package export/type contracts.

## Why this integration exists

The earlier PR #110 hardens both field snapshots and untrusted input arrays, but targets an older multi-PR ancestry (#107 -> #106 -> #104). PR #111 already provides and tests the field snapshots on the modern F2/F3 candidate #109. To avoid copying older source files over merged #96/#103/#105/#108 corrections, **this branch inherits #111 unchanged** and adds only the missing array-iteration gate:

- Copy own dense indexed elements from each caller array (`sourcePoints`, `targetPoints`, `aspectDefinitions`); never invoke the array's mutable `Symbol.iterator`, `map`, or `Symbol.species`.
- Reuse the already-snapshotting `point` and `definition` validators from #111; same `INVALID_POINT` and `INVALID_ASPECT` codes, same ordering, exact angles, orb bounds and immutable output.
- Reuse the **exact 13-case regression test Git blob** from PR #110 (`d0faa16ccd81dd43810db0af5cd5fcf6ba49c964`). The earlier eight #111 getter regressions remain untouched.

## Executed verification

1. **Native Node.js v22.16.0**, local main-based adapter with exact #111 `point`/`definition`/`calculateCrossAspects` logic plus the same indexed input loop:
   - 13 tests from PR #110 + 8 existing #111 tests: **21/21 passed**;
   - full reconstructed main-based `npm test`: **113/113 passed**, zero skipped/failures;
   - strict TypeScript 5.8.3 NodeNext on five baseline `test/types/*.ts` fixtures: passed;
   - `node --check` on modified JS: passed.
2. **Actual full F2/F3 runtime source**, byte-matched to the PR #111 GitHub blob before the change (`89afd65fc5a4a65a735a0dc16b7107a36b9f415a`), with only this bounded snapshot helper applied: isolated V8 execution confirmed all three untrusted array positions reject forged iterator data with canonical error codes, **without calling their iterators (3/3)**.

**Limits:** the native 113/113 suite is from a reconstructed **main-based adapter**, **not the entire #109/#111/#112 provider branch**; F2/F3 adds many provider tests and 14 TypeScript fixtures requiring separate complete native execution on the actual combined head. The V8 checks are not equivalent to native Node ESM self-import tests, and none of these synthetic facts validates real Rust/JPL ephemeris accuracy or downstream production behavior.

**Merge gate:** leave this PR draft/stacked; before any integration into main, reconcile #109 + #111 + this gate in dependency order, run the full native Node suite and strict TypeScript NodeNext/Bundler external-consumer tests for the exact consolidated tree; review licensing/privacy/credits. Do not merge obsolete PR #110's entire old tree on top of current main, enable GitHub Actions, publish npm, change licensing or deploy. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the planned Rust astronomical engine.
