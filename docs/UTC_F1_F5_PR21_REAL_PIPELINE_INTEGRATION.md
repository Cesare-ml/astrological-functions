# UTC F1/F2 + F5 + real PR #21 candidate pipeline — integration gate

**Status:** experimental integration branch, private/draft, not scientific validation.

## Precisely pinned inputs

- PR #77 integration head: `27c4d8d65517bf93f0101016afee3779f58a3d8f`.
- PR #21 transit pipeline head: `4f4a345b13b9ddedb65e9acccde182baa99fe51a`.
- Two-parent integration commit: `452c061d1ce8cfe44177157bb818b8d10f11fcc2`.
- The tree includes all 21 original PR #21 changed file blobs on top of #77.
  The sole shared-path difference was `package.json`: it retains the
  private package root and opts in to the `./transits` typed ESM subpath
  exactly as on PR #21, without modifying source logic or other exports.
  Coordinate future export-map unification with PR #69.

## What is newly connected

`test/utc-f1-f5-pr21-real-stack.test.mjs` now exercises the **real**
`prepareTransitAspectEventCandidates` from PR #21 (rather than a fabricated
report callback), through the PR #72 `makeTransitChunkPipelineRunner` and
`collectTransitChunkCandidateReports`, using PR #70's lossless civil UTC
nanosecond-to-millisecond adapter.

Test cases:

1. One conditional sign-change candidate on a synthetic, continuous,
   monotone unwrapped residual. No fabricated certified hit is returned.
2. A one-nanosecond fraction below F5 precision raises
   `UNSUPPORTED_UTC_PRECISION` before any time is rounded.
3. A synthetic squared residual retains unresolved tangency/coverage
   uncertainty and does not imply event absence.
4. The F5 explicit duration limit rejects a too-long request before the
   astronomical callback is invoked.

The two **already existing** PR #72 manual `transit-pr21-smoke.mjs` scenarios
(one sign-change candidate and one tangency) were also executed.

## Precisely scoped execution evidence (14 November 2026)

All ten runtime dependencies used by the new test, and the manual smoke script,
were read from the **actual combined integration branch** through GitHub.
Their module bodies were executed in a fresh V8 JavaScript isolate after
binding the ESM import/export declarations to their exact sibling dependency
functions. `AstrologyError` was instantiated with the exact unchanged
constructor shape from `main`:

- PR #72 original manual smoke tests: **2/2 passed** in V8.
- New F1/F5/PR21 end-to-end tests: **4/4 passed** in V8.
- No production module logic was edited for these checks.

**Important:** This was **not** an authenticated native Node.js checkout and
`npm test`, nor a real Rust/WASM/JPL kernel accuracy verification. The test
source has been committed to the branch and must now run natively against the
actual ES-module imports on a checked-out repository. The previously reported
87/87 native tests belong to the earlier local reconstruction of PR #77,
**not** to this expanded PR #21 stack. Do not claim 87+6 native passes.

## Native commands to run before merging

```sh
npm test
node --test scripts/manual/transit-pr21-smoke.mjs
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext scripts/manual/transit-pr21-typecheck.ts test/types/*.ts test/*.consumer.mts
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler scripts/manual/transit-pr21-typecheck.ts test/types/*.ts test/*.consumer.mts
```

Do not include the manual smoke script in real astronomical correctness claims.
The provider in all of these tests reports **synthetic residual functions**
and **caller-asserted** interval enclosures. No independent verification of
continuous unwrapped correctness, station coverage, numerical error,
root uniqueness/completeness, UTC↔TT/TDB, kernel identity or ephemeris
physical accuracy has occurred.

The runner does not implement timeouts/cancellation or a real
`VirgoStars-Ephemeris` provider: those remain review blockers for
production. No release, dependency on Swiss code, GitHub Actions, publishing,
public-license decision or merge to `main` is authorized.

See [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Increment — pin direct F5 chunk identity and provenance (14 November 2026)

The original `makeTransitChunkPipelineRunner` already pinned the UTC window,
the provider's methods and the scanner/refinement settings. A consumer calling
the runner directly (without the enclosing report collector) could still
silently change `skyBodyName`, `natalBodyName`, `aspectId`, angle,
orientation, or `engineVersion`/`kernelSetId`/`timeModel` between chunks.

The integration branch now takes an **immutable detached identity snapshot**
on the first valid request and requires all later chunk requests to match it
exactly. Mismatches throw `INCOMPATIBLE_CHUNK_IDENTITY` *before* invoking the
pipeline, without moving the expected chunk index. Malformed or missing fields
throw `INVALID_TRANSIT_IDENTITY`. The validator reads property **data
descriptors** rather than invoking a supplied JavaScript getter, and forwards
only the validated frozen data to the pipeline.

This is an **intentional hardening delta in PR #81**, not an upstream change
to the independently active PR #72 branch. Coordinate the change explicitly
before reconciling the two branches; do not silently overwrite newer upstream
versions.

**Native local evidence:** the five new
`test/transit-chunk-pipeline-identity.test.mjs` cases failed 5/5 against
the unmodified upstream adapter and passed 5/5 with the fix. Existing 10
adapter tests also passed, then the local reconstructed F1/F2 and F5 Node.js
fixture ran `npm test` **92/92 passes** on Node.js 22.16.0. Strict TypeScript
5.8.3 consumer checks passed in both NodeNext and Bundler modes.

The GitHub blob SHA-1 identities of the changed source and new regression test
match **exactly** the locally tested files:
- `src/transit-chunk-pipeline-adapter.mjs`:
  `ee7cae1bfa1d8bcfc77329e49cd9959680597b52`
- `test/transit-chunk-pipeline-identity.test.mjs`:
  `fab4f346aed7f6a8492781bf12aa68461db8a3b8`

This **92/92 subset is not the complete PR #81/PR #21 checkout**: the
local fixture uses the earlier F1/F2/F5 sources, not the stacked PR #21
source test suite or manual PR #21 smoke gate. The previously executed
V8-bound original PR #21 sources (six isolated smoke/end-to-end tests)
are also **not** native full-suite proof. Run the entire combined checkout,
including `scripts/manual/transit-pr21-smoke.mjs` and the TypeScript manual
gate, before merging. There is no real Rust/WASM/JPL astronomical
validation, provider assurance, license sign-off or production approval.
