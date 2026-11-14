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
