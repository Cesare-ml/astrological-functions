# Cross-aspect caller snapshot and invariant validation — 14 November 2026

**Status: DRAFT / NOT RELEASED.** Branch stacked on draft #107 → #106 → #104. Pure symbolic geometric aspects only; no astronomical positions calculated.

## Reproduction on old source

The former `point` helper read `longitudeDeg` three times while checking and publishing a point. `definition` read its `angleDeg` up to five times. Adversarial getters could pass validation with 0° and silently change to 90° during final aspect calculation. The `Array.from` calls on source, target and rules also trusted caller-owned `Symbol.iterator`: an array storing NaN or an invalid rule could claim to contain a valid synthetic point via its iterator, bypassing validation of its actual entries.

## Fix

Read point name, type and longitude, and rule ID, exact angle and max orb each **once** in original validation order. Keep original type/range restrictions, frozen results, orb tolerance and error codes. A small shared `snapshotAspectInputs` helper walks each own indexed array slot in captured-length order; it never executes caller iterators, `.map` or `Symbol.species`. Sparse/inherited-only slots fail with `INVALID_POINT` or `INVALID_ASPECT`.

New `test/cross-aspect-input-snapshot.test.mjs` comprises 13 deterministic synthetic tests for changing getters, duplicate rules, forged iterators on all three collections, inherited slots, and mutation while consuming an element. Existing cross-aspect regression suite must also be run.

## Validation and merge gates

Patch development was guarded by a strict V8 exact-source preview. Neither V8 nor the mock adapter establishes native Node `npm test` or real JPL/Rust scientific accuracy. Require full native Node/TS checks, current-main and parent reconciliation, licensing/security review, and explicit integration approval. No GitHub Actions, package publication, live routes or production changes.
