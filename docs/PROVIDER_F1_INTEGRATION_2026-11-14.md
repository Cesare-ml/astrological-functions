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

## Additional synthetic test triage (same day)

The complete integration-branch set contains **36 `.test.mjs` files** with **120 registered test callbacks**. Read-only execution of their exact GitHub file contents in three 12-file JavaScript V8 batches, using a strict-mode `node:test`/assert approximation rather than native Node imports, found two inconsistent old test fixtures:

1. `test/house-cusp-set-contract.test.mjs` expected `INVALID_ANGLE` for a non-finite cusp. The PR #3 `validateHouseCuspSet` deliberately reports `INVALID_CUSPS`, consistent with its own shape/geometry checks. Fixed **only the assertion** in this staging branch.
2. `test/provider-provenance-consistency.test.mjs` attempted to test mixed missing/present provider provenance with a *partially specified* provider metadata object. The stricter F2 contract correctly rejects partial provenance as `INVALID_EPHEMERIS_RESULT` before comparing two bodies. Changed that fixture to test absent versus **complete** provenance in both orders, preserving the expected `INCONSISTENT_EPHEMERIS` cross-body failure.

One apparent failure involving a frozen property assignment in `test/natal-provenance-snapshot.test.mjs` was a **test-harness strict-mode artifact**, not a runtime defect: Node ESM is strict mode, while the initial `Function`-based shim was not. Re-running that test in strict mode restored the expected `TypeError`.

**Revalidated** the 11 registered callbacks across the three affected files against branch source blob `c674d65532df574a6e211e5994708c2b95dfab80`: **11/11 passed**, including the corrected fixtures. Together with the unchanged batch results (32/32 in batch 1; 52 other passes in batch 2; 33 other passes in batch 3), all **120 unique callbacks** have passing synthetic V8 evidence after the fixes. This remains **not** a native `npm test` execution: the shim can differ from Node's actual module loader, scheduling or strict assertions. Native Node and TypeScript checks remain hard blockers before this draft can be marked merge-ready.
