# F2 natal body identifier single-read snapshot — 14 November 2026

**State: IMPLEMENTED_ISOLATED / DRAFT / NOT RELEASED.**

This focused fix builds on draft [#104](https://github.com/Cesare-ml/astrological-functions/pull/104), which consolidates F2 provider, F3 houses and typed ESM subpaths. No astronomical calculations or shipping/deployment changes.

## Reproduced validation/use drift

Original GitHub runtime `src/index.mjs` blob `a89f4a50a2c1a159b905180abe0257b15163192d` validated caller-controlled `bodyNames` using `Array.from(bodyNames)`, then `new Set(bodyNames)`, then used `[...bodyNames]` to snapshot the identifiers requested from an asynchronously injected ephemeris provider.

The three separate iterator/index reads are not equivalent for a mutable caller:
- An array with a custom `Symbol.iterator` yielded `Sun` on the first read, `Moon` thereafter. The runtime **validated Sun but requested Moon**, and the iterator ran three times.
- An indexed accessor yielded `Sun`, then `Moon`, then `Mars`. The runtime **validated Sun but requested Mars**, and read the same index three times.
- An accessor that returns an initially duplicate or invalid identifier can change value on subsequent reads; the runtime should reject the *first* value rather than request an unvalidated later value.

## Narrow fix

The patched runtime `src/index.mjs` blob `cb9274d6a92154f95acb05b48854cb69c3e93997` captures `bodyNames.length` once, enforces 1..32 bounded entries, checks every indexed element is an own slot, then validates each identifier **exactly once**, detects duplicates from those same primitives, and freezes a private native array before accessing the provider callable or awaiting any response.

The provider method pinning, apparent geocentric/ecliptic-of-date requirements, date/coordinate validation, provenance checks, null-prototype/frozen chart map and typed error codes are unchanged. No explicit changes to TypeScript types or package entrypoints: the public `NatalInput.bodyNames: readonly string[]` contract still applies.

## Regression evidence

- Added `test/provider-body-identifier-single-read.test.mjs` (Git blob `23059420442a54c3f1bf67f25e23a1e6ec0928f6`): **8** synthetic cases covering mutable iterator, alternating indexed getter, first-read duplicate, first-read invalid name, inherited array slot, throwing custom iterator, array mutation during an await, and the 32/33 identifier bound.
- Replayed the exact GitHub patched runtime and **16 fetched provider/math test files** using strict V8 JavaScript test/assert and import approximations: **57/57 test callbacks passed**, zero load failures. The original 2-case async body-list snapshot test also passed.
- Independent preview before write demonstrated that the patched function ignores forged iterators (`0` iterator calls) and reads the alternating name getter only **once**, while correctly rejecting duplicate/inherited inputs before contacting the provider.
- **Not run:** native `node --test` or full `npm test` on this exact branch, strict TypeScript consumer compilation, downstream VirgoStars/Rust/JPL scientific parity or release review. The local GitHub clone is currently DNS-blocked. Do **not** call this release validated.

## Integration order and concurrent changes

This fix must be reviewed on top of draft #104, not merged straight to stale `main`. During review, `main` advanced with [#105](https://github.com/Cesare-ml/astrological-functions/pull/105), changing the **separate** 13-fold dodecatemoria root math. Reconcile that already-merged numeric change independently and re-run combined native tests before any final merge; do not let a provider-root update overwrite #105. Existing parallel ESM/UTC work also requires a current-main check.

No GitHub Actions, npm publishing, deployment, production routes, Swiss fallback, sensitive data, or private repository visibility changes.
