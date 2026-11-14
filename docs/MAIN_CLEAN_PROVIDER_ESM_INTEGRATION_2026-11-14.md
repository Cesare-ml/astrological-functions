# Clean integration onto current main — 14 November 2026

**Status: DRAFT / INTEGRATION_STAGING / NOT RELEASED.**

The older provider/house drafts #92 → #94 → #97 → #101 → #102 are stacked on stale main ancestry. PR #92 is currently conflict-marked against main. This clean compatibility candidate uses the direct first parent `7dd69398c81561274f46f39f396c7e5c6596aa57` and overlays the **exact 72 changed/new GitHub blobs** of final #102 head `34e87629e4432212479cafc7d7a8a63f2ffb7a6e` (67 new paths, 5 changed paths). No prior PR branch is rewritten.

The overlay is additive onto current main, not a replacement repo tree: **12 main-only files remain** (including scripts and tests for offline PR dependency audits and snapshot drift, new dodecatemoria/decan docs). Both modified shared docs CONTRACTS and VALIDATION are byte-for-byte extensions of their current main originals; staged math test updates mock provenance to respect the newly strict provider contract.

The code preserves the conditional **five-key private ESM export union**, the exact merged #96 cusp ULP algorithm and #98 safe dodecatemoria batch source. A new focused test `test/main-clean-provider-union.test.mjs` checks package exports, provider→decan→houses at the last binary64 Pisces longitude, 30° cusp predecessor, and the hardened batch override guard.

## Evidence and limitations

- Precise GitHub tree manifest checked before assembly: no source/test path deleted or replaced outside the five explicit overlapping paths.
- Previous #102 isolated evidence: byte-exact package manifest with placeholder modules passed **8/8 real Node 22.16.0 export resolution checks**, and isolated exact TypeScript declarations and a single union-consumer fixture passed **4/4 TypeScript 5.8.3 compiler modes**. Strict V8 replay of original main zodiac+batch source/tests passed **30/30** callbacks. These are **not native full-package tests**.
- This new clean integration branch still needs complete native `npm test`, all TypeScript consumer fixtures, actual runtime package imports in Node, and the documented scientific JPL/Rust WASM apparent-of-date accuracy gate. The authenticated GitHub clone is unavailable in the local container because GitHub DNS does not resolve.
- No GitHub Actions, npm publish, changes to deployed VirgoStars, Swiss Ephemeris fallback, private data, or source license/visibility changes.

Keep this candidate draft. Recompare future main updates and active parallel ESM staging PRs before merge. Do not merge or close the original stacked PRs until the complete native tests and independent review approve a consolidated path.

## Post-integration targeted regression execution

Confirmed via GitHub REST: PR #104 initially **mergeable=true, mergeable_state=clean**, with direct main base `7dd69398c81561274f46f39f396c7e5c6596aa57`, 74 changed paths, zero deleted main files and 119 total staged files.

Fetched exact GitHub `src/index.mjs` blob `a89f4a50a2c1a159b905180abe0257b15163192d` and ran the exact real test source from `test/math.test.mjs`, `tests/utc-validation.test.mjs`, and `test/house-cusp-preboundary-ulp.test.mjs` with strict JavaScript V8 replacements for the `node:test` and `node:assert/strict` module interfaces: **14/14 test callbacks passed**, zero load or runtime failures. This includes the deterministic 90,000 binary64 cusp-neighbor stress assertions.

Independently loaded all exact runtime modules (`src/index.mjs`, `src/dodecatemoria-methods.mjs`, `src/dodecatemoria-batch.mjs`, `src/zodiac-decan-facts.mjs`) with the exact manifest `2777e6b260cdd4cc64e8c285e366e17df8e12d9d`, then executed the three new `test/main-clean-provider-union.test.mjs` callbacks in strict V8 with only import/fs semantics substituted: **3/3 passed**. The exact test blob is `02f73948b459e98e9b57d168c74841dfe8e80c69`.

These **17 passing synthetic checks do not replace native Node package resolution or `npm test` on an authenticated complete checkout**, nor any TypeScript or scientific accuracy release gate. Keep the PR draft until those real validations run.
