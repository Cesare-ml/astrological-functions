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

## Constructor-time identity migration — committed 14 November 2026

The earlier **unapplied** status in this document describes a previous review
checkpoint. It is superseded by PR #81 integration commit
`b5331230e0a919d9a439544e7995a8a599e4e9a6`.

`makeTransitChunkPipelineRunner` on this integration branch now requires the
explicit `identity` object **at construction**, before any provider work, and
captures a frozen detached aspect/provenance snapshot. Subsequent chunk
requests must exactly match all pinned bodies, aspect, orientation, engine,
kernel and time-model fields. Missing constructor identity fails with
`INVALID_ARGUMENT`; invalid/getter-backed fields with
`INVALID_TRANSIT_IDENTITY`; valid but different later identities with
`INCOMPATIBLE_CHUNK_REQUEST`.

Ten runtime/type/test/manual consumer files were migrated **atomically**,
including the PR #21 smoke script and its TypeScript gate. A new negative
test checks constructor failure before callback execution.

Executed locally on a reconstructed F1/F2+F5 checkout: native Node 22.16.0
`npm test` **98/98 passed**; TypeScript 5.8.3 strict NodeNext and Bundler
consumer compilation passed. The exact PR #81 committed runner source,
declaration, three relevant integration/regression fixtures match local
Git blob SHA-1 bytes. Additional upstream tests and scripts were migrated
from their GitHub files.

Separately, **22/22** focused runtime tests were evaluated against exact
post-migration GitHub source and test bodies in V8 with ESM import bindings
reconstructed: 10 runner tests, 6 direct identity tests, 4 end-to-end PR #21
tests and 2 original manual smoke tests. **This was not native Node ESM**.

**Not yet synchronized:** PR #72 has since added runtime *actual-call* global
provider budgeting and a shared `snapshotTransitPinnedIdentity` implementation
for collector/runner. This branch deliberately preserves its earlier
conservative worst-case budget policy and independently hardened identity
parser. Both are valid experimental arrangements, but must be consolidated
under one documented contract and revalidated before merging. No production
authorization or scientific ephemeris certification follows from these tests.


## PR #81 live aggregate budget — true PR #21 scanner regression

Post-migration integration commit
`1b36ea6488708326771f2bfb497771ff06d59a4d` introduces the
**shared `snapshotTransitPinnedIdentity`** and the F5 runner's
**actual-call** global provider budget. It uses original immutable Git
blobs from PR #72 commit
`ed9b83614ddfd5a014657c6a0e7f206be35c3d2d`.
The direct-runner regression fixture was updated to expect
`INCOMPATIBLE_CHUNK_REQUEST` on invalid chunk identities while
construction-time identity validation remains `INVALID_TRANSIT_IDENTITY`.

The new integration test added at commit
`b1791a851de04e4017a092c382054f9e81fc29e0`
verifies the **actual PR #21 scanner/refiner**, not a replacement callback:
a window with a synthetic continuous unwrapped aspect residual
can be constructed with `maxTotalProviderCalls:1` despite much larger
per-chunk theoretical caps; after exactly one physical provider invocation,
the next point/enclosure call fails with `GLOBAL_PIPELINE_BUDGET`.
The underlying provider is not called a second time; retrying the
chunk fails with `PIPELINE_SEQUENCE_ERROR`.

**Verification on the exact final GitHub code at this commit**:
**48 of 48 focused synthetic V8 tests passed** across six original
test/script sources: 18 upstream runner tests, 11 upstream report
tests, 6 integration identity tests, 6 F1/F5 composition tests,
5 genuine PR #21 scanner/refiner integration tests, and 2 manual
PR #21 smoke tests. The runner, report and new test bytes were fetched
from the integration commit and checked by their Git blob SHAs.
The V8 harness rebounded ESM module imports and adapted Node assertions;
**this is not native Node `npm test`**.

Native full PR #81 `npm test`, the manual PR #21 test command and strict
NodeNext/Bundler compilation on an authenticated combined checkout are
still mandatory review gates. No actual astronomical validation, real
Rust/WASM provider, JPL/SPK numerical comparison, or licensed release
has been performed.

**Important staging boundary:** PR #72's newer opt-in `AbortSignal`
and `chunkTimeoutMs` API remain **unmerged** into PR #81. Future
cherry-picks must reconcile those features and test cancellation
before exposing them to production.
