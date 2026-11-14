# UTC/F5 integration: event reconciliation hardening and upstream divergence

**14 November 2026 — experimental, private, draft only**

This is a focused synchronization of an isolated, source-compatible change from
F5 draft PR #72 into the larger draft PR #81 integration branch. It is **not**
a complete merge of all updated PR #72 changes.

## Reconciliation update included

The following two PR #72 files were adopted byte-for-byte on PR #81:

| File | Verified Git blob SHA-1 |
| --- | --- |
| `src/utc-chunk-event-reconciliation.mjs` | `09e60b9f7d4ab6ec07774f3bac8f094b5e5b5cef` |
| `test/utc-chunk-event-reconciliation.test.mjs` | `7a7e061cf4c318b90d2bdd719e8dcd1eebe6de1d` |

The code snapshots own data-property descriptors for chunk indices, hit arrays,
event keys and instants. It refuses accessor getter fields, hidden/symbol
extra fields, missing inputs, and invalid UTC/candidate fields, without running
caller-defined getters. Stable hit deduplication continues to use exact
event-key + epoch millisecond and half-open chunk ownership. Five new upstream
test cases confirm the rejection behavior and boundary deduplication.

**Native local reconstructed UTC/F5 checkout:** Node.js 22.16.0
`npm test`: **97/97 passed, 0 failed**.
TypeScript 5.8.3 strict **NodeNext** and **ESNext/Bundler** consumer fixtures:
both passed without diagnostics. The exact source and test bytes used locally
matched the GitHub SHA-1 values above.

The reconstructed checkout does **not** include the entire PR #21 transit
source test suite; these results do not establish a native full-stack PR #81
pass. Previously executed 6 synthetic PR #21 V8 scenarios are separate
evidence and are not new native results.

## Remaining reconciliation conflict with PR #72

PR #72 continued developing after PR #81's original pinned snapshot. Its
current experimental pipeline runner now **requires an explicit pinned
`identity` object at construction time** and shares
`snapshotTransitPinnedIdentity` with the report collector. That is a
breaking contract change versus the isolated PR #81 runner, which captures
the first validated chunk request's identity and rejects changes in later
requests. In addition, PR #72 updated its runner types, report validator,
manual PR #21 integration scripts, and associated tests.

**Do not blindly copy the whole PR #72 tree over PR #81.** Before a future
stack consolidation:

1. Choose the explicit constructor-time identity contract as the future
   versioned interface (preferred for earlier fail-closed checking).
2. Update **every** runner caller in `test/`, `scripts/manual/` and
   downstream example code to pass the pinned identity explicitly.
3. Integrate the shared getter-free identity snapshot implementation and
   its TypeScript declarations, without duplicating validators.
4. Run native `npm test` for the complete PR #21 + PR #72 + PR #70
   integration and strict NodeNext/Bundler checks.
5. Run `node scripts/manual/transit-pr21-smoke.mjs` and the manual typed
   gate against the actual combined PR #21 source.
6. Verify real Rust/WASM/JPL ephemeris accuracy, continuous enclosures,
   time-model / frame provenance, station/tangency behavior, license and
   publication gates separately.

The present PR #81 branch intentionally leaves this breaking runner migration
**unapplied**, to avoid silently invalidating tested consumers while other
draft branches advance concurrently. No GitHub Actions, merge to `main`,
release, license change, package publication, or production integration.

Astrological computations must continue to obtain actual astronomical facts
only from [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

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

## Completion: common F5 identity validator + real aggregate call budget (14 November 2026)

This integration branch now **supersedes** earlier statements that the shared
validator and live global-call budget are merely planned. The following
independent, self-contained source and test modules were adopted **without
changes** from pinned PR #72 snapshot
`ed9b83614ddfd5a014657c6a0e7f206be35c3d2d`:

- `src/transit-chunk-candidate-reports.mjs` / `.d.mts`
- `src/transit-chunk-pipeline-adapter.mjs` / `.d.mts`
- `test/transit-chunk-candidate-reports.test.mjs`
- `test/transit-chunk-pipeline-adapter.test.mjs`
- `test/types/transit-chunk-pipeline-adapter.test.ts`

The collector and runner now share `snapshotTransitPinnedIdentity`, which
snapshots the same own data properties with one frozen provenance record.
The runner still verifies each incoming UTC chunk's identity and rejects
mismatches; it no longer duplicates an independent identity validator.

The runner checks a mandatory `maxTotalProviderCalls` in 1..1,000,000 and
reserves each real point **or enclosure** provider invocation **before**
starting it, across all chunks. Once exhausted, it fails closed with
`GLOBAL_PIPELINE_BUDGET`. It rejects any later chunks and will not accept a
successful-looking result from a callback that caught the budget failure.
The caller can request a budget smaller than an extremely pessimistic
worst-case preallocation. The per-chunk scanner/refiner retain separate
limits. It remains **a count budget**, not a CPU/memory/time bound.

A targeted PR #81 regression fixture now expects
`INCOMPATIBLE_CHUNK_REQUEST` for malformed direct chunk requests, while
constructor-time invalid identity retains `INVALID_TRANSIT_IDENTITY`.

**Executed gate:** 47/47 synthetic V8 tests passed when running original
GitHub module bodies for both F1/F2 and F5, including PR #21 source and
the original PR #72 29 focused collector/runner tests plus PR #81
identity, F1/F5 and PR21 end-to-end/manual smoke tests. The source/test
blobs referenced above were read directly from GitHub and kept byte-identical.
This is **not** a complete authenticated native `npm test`; the V8 test
harness rebound ESM imports and adapted assertion helpers.

**Still excluded:** PR #72's later opt-in cancellation and per-chunk wall-clock
timeout work. Those introduce more state and must be integrated in a
separate, independently validated increment. Do not infer that `AbortSignal`
or `chunkTimeoutMs` are implemented in this PR #81 snapshot.

Real Rust/WASM/JPL ephemeris accuracy, all-time enclosure provenance,
reference kernel/time-model validation, native NodeNext/Bundler complete
checkout, source licensing and release approval remain explicit blockers.
