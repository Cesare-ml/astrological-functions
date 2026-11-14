# Cross-aspect hardened snapshots on clean F2/F3 integration — 14 November 2026

**Status: DRAFT / INTEGRATION_STAGING / NOT RELEASED.**

## Why this branch exists

The newly prepared [PR #109](https://github.com/Cesare-ml/astrological-functions/pull/109) already reconciles the F2 provider and F3 house chain with current `main`, including [main PR #108](https://github.com/Cesare-ml/astrological-functions/pull/108) once-read validated cusp intervals. The older cross-aspect [PR #110](https://github.com/Cesare-ml/astrological-functions/pull/110) remains stacked on the pre-reconciliation chain #107 → #106 → #104 and has not yet landed on the cleaned #109 tree. Avoid merging its entire stale ancestry.

This branch builds **directly** on unchanged #109 commit `da2bff1820df2ae496004524c970d16aaf693a15`, preserves all files of that exact parent tree, and transplants **only** the private helper implementations `point`, `definition`, `snapshotAspectInputs` and the array-input setup inside `calculateCrossAspects` from the exact #110 root Git blob `84190e28551f8aacdabfcfee97fe4c1ccaae0f41`. The remaining implementation (starting from duplicate rule validation and through result emission) is byte-identical to #109's source `de57b5ac432890baab20e3b0940393a8fe3e8204`. The rest of the root module, including #108 cusp snapshot, F2 provider, #105 dodecatemoria and #103 decan policy, is preserved verbatim.

The original 13-case `test/cross-aspect-input-snapshot.test.mjs` Git blob `d0faa16ccd81dd43810db0af5cd5fcf6ba49c964` is reused **without modification**, checking getter single-read, first-read invalid rejection, caller iterator forgery, duplicate rule IDs, inherited-only slots and mutation of the caller array. Only original VirgoStars-owned experimental math, no astronomical backend or proprietary client data is involved.

## Verification carried out before writing

Fetched exact source from #109, the exact cross-aspect code block and exact new test from #110, and ten existing GitHub test files from the #109 branch. The stitched production source and **11 test files** yielded **39/39 PASS**, zero load errors under strict isolated V8 `node:test`/`assert`/ESM-import approximations. The 39 comprise 13 new regression callbacks, 21 original cross-aspect checks and **5 merged main #108 cusp snapshot checks**. Existing house and provider code was not altered by the transplant. No direct Node `npm test` or strict TypeScript compilation of this exact combined tree has been executed.

## Hard merge gates

This candidate must remain a **draft stacked on #109** until the latter's actual native Node full suite, NodeNext/Bundler TypeScript consumer fixtures, ESM import smoke, current-main comparison and security/license review complete. JPL/Rust/WASM apparent Earth-centered ecliptic-of-date data and numerical parity are independent scientific gates; no Swiss fallback. Do **not** merge the old #110 branch or close the stacked ancestor PRs automatically. No GitHub Actions, npm publication, deployed application edits, visibility change or production database access.
