# F1/F2 provider integration sandbox — 14 November 2026

**State: INTEGRATION_STAGING / DRAFT / NOT VALIDATED FOR PRODUCTION.**

This branch combines the exact tree entries added/changed by PR #3 into the `main` baseline after precision merge #50 and roadmap merges #88/#89. This is a two-parent Git commit: parent 1 is the then-current `main` (`485db229900d4df0f18b34423fc55a8699db01f8`), parent 2 is the original PR #3 head (`eff900df6127730bea3ea06cbe891f799fbe1555`). No original PR head was rewritten. The only manually reconciled production file is `src/index.mjs`: it retains PR #3's validation/provider/house code and copies verbatim the merged PR #50 angle-normalization and signed-distance blocks. Original PR #3 tests are kept as exact blobs. Two new paths contain the integration-only regression and this report.

## Verification record
- Performed an isolated synthetic V8 execution of the combined source before staging: **10/10 targeted checks passed**, including precision at 359.99999999999994°, zodiac sign, signed shortest arc, final cusp house, explicit legacy house-name resolution, provider result/provenance, birth time, directional aspects, and rejection of geometric J2000.
- This V8 check is *not* a native `node --test` run, not the entire PR #3 suite and not a NASA/JPL astronomical accuracy check.
- The new `test/provider-precision-integration.test.mjs` persists integration regression cases for native Node replay.
- Commands for full checkout: `npm test`, then manually inspect TypeScript fixtures under `test/types/` with pinned NodeNext TypeScript configuration before any release. No GitHub Actions.
- Inspect source/license provenance, validate against the true Rust/WASM apparent Earth-centered ecliptic-of-date provider and test in external consumers before declaring F2 integrated.

## Scope / handoff
- Keep this staging PR **draft** pending a complete native Node test run and review; do not merge solely on a GitHub `mergeable` result.
- Original draft PR #3 remains available, and stacked PR #54 needs separate dependency reconciliation.
- No production backend, user records, DB, deployment, public publishing, or astronomical engine change.
