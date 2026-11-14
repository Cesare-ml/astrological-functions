# F5 cancellation, chunk deadlines and scoped provider bridge

**Integration status:** EXPERIMENTAL / DRAFT / PRIVATE  
**Date:** 14 November 2026  
**Source stack:** PR #70 → PR #77 → PR #81, with PR #21 transit candidates and
selected PR #72 F5 bridge commits. No production changes.

## Pinned source and scope

- PR #81 prior head: `9728c1a609d2b4f3e014300962feac99f5c4b826`.
- PR #72 feature snapshot: `89417810e50267cd1159c999e00d91cde0ce2f73`.
- `src/transit-chunk-pipeline-adapter.mjs` — exact upstream blob
  `ff144a1fa15a276f2c9d9b6e25569accbde1a19b`.
- `src/transit-chunk-pipeline-adapter.d.mts` — exact upstream blob
  `76207aa12c690f09626533cdbbd14e0709cd5b90`.
- `test/transit-chunk-pipeline-adapter.test.mjs` — exact upstream blob
  `c522ed8f19d45462d8ebf892cca5435ac122171e`.
- Updated upstream strict TS consumer and manual PR #21 typecheck script
  were also copied by exact Git blob references, without rewriting PR #72.
- PR #81 integration commit: `9dc8ea7e9ce4a541749a9331ccd79a0c67714965`.
- New `test/utc-f1-f5-pr21-cancellation.test.mjs` contains three synthetic
  tests that invoke the **real PR #21** candidate scanner/refiner,
  through strict Gregorian UTC F1→F5 adaptation and the bounded report
  collector. They do not synthesize a substitute pipeline.

## Behavior and fail-closed invariants

`makeTransitChunkPipelineRunner` continues to require the pinned aspect,
bodies and engine/kernel/time-model identity at construction. In addition:

1. Accepts optional `signal: AbortSignal` (external cancellation) and
   `chunkTimeoutMs: number` (1–86,400,000 ms **for each chunk**, not the whole
   window). Invalid values fail during construction.
2. A pre-aborted signal fails before provider work. Abort during a chunk
   rejects with `SEARCH_CANCELLED`, and timeout rejects with
   `CHUNK_TIMEOUT`. Neither produces a partial report or an invented event.
3. Each chunk owns a separate frozen provider facade and internal abort
   signal. Calls retained from an already completed chunk cannot borrow the
   next chunk's authority, even while that later chunk is running.
4. The existing `maxTotalProviderCalls` counts both point and interval
   enclosure requests across all chunks. A global budget violation stops
   waiting immediately with `GLOBAL_PIPELINE_BUDGET`, even if a broken
   pipeline catches that error and never resolves.
5. No timeout, cancellation or budget failure can be retried by reusing
   that runner. Any later call fails with `PIPELINE_SEQUENCE_ERROR`.
6. The underlying provider receives the internal abort signal **as an
   optional second positional argument**. Its first request argument stays
   identical to the experimental PR #21 contract.

**Critical caveat:** abort/timeout stops the caller from waiting; it does
**not** forcibly terminate a noncooperative Rust/WASM call, remote I/O, a
synchronous JavaScript loop, or other already-running computation. Providers
must independently check and honor the abort signal. A real CPU/IO deadline
would need worker/process isolation plus resource-lifecycle testing.

## Executed verification — exact integrated GitHub commit

Synthetic test cases evaluated using original GitHub source/test **bodies**
fetched by path and verified with the Git blob SHA-1 values:

| Focused group | Cases | Passed |
| --- | ---: | ---: |
| F5 report collector | 11 | 11 |
| F5 runner, including cancellation, timeout, stale callbacks, immediate global budget stop | 27 | 27 |
| PR #81 pinned identity hardening | 6 | 6 |
| F1→F5 civil UTC/report bridge | 6 | 6 |
| Real PR #21 synthetic scanner/refiner and global-call budget | 5 | 5 |
| Real PR #21 with pre-abort / pending-provider abort / chunk timeout | 3 | 3 |
| PR #72 manual real PR #21 smoke | 2 | 2 |
| **Total** | **60** | **60** |

**Execution limitation:** these 60 tests ran in a JavaScript V8 isolate
with ESM imports rebound to their exact sibling module functions, adapted
Node `node:assert/strict` methods, an `AbortSignal` event-emitter shim and
a real asynchronous timer. They are **not** 60 native Node.js ESM test runs,
a checked-out private repository `npm test`, a complete TypeScript
typecheck, an actual Rust/WASM ephemeris provider, or an independently verified
astronomical search. The PR #81 cancellation test itself is committed on
the integration branch and must be rerun natively.

## Required final integration gates

From an authenticated clone of the exact draft PR #81 head:

```sh
npm test
node --test test/utc-f1-f5-pr21-cancellation.test.mjs
node --test scripts/manual/transit-pr21-smoke.mjs
tsc --strict --noEmit --target es2022 --module NodeNext --moduleResolution NodeNext \
  scripts/manual/transit-pr21-typecheck.ts test/types/*.ts test/*.consumer.mts
tsc --strict --noEmit --target es2022 --module ESNext --moduleResolution Bundler \
  scripts/manual/transit-pr21-typecheck.ts test/types/*.ts test/*.consumer.mts
```

Then validate a **real** `VirgoStars-Ephemeris` Rust/WASM provider's
frame, time scales, pinned kernel identity, apparent-of-date numeric behavior,
all-time enclosures including retrograde/stationary/tangent cases,
cooperative cancellation, CPU/IO resource lifetime, reference JPL accuracy
and explicit safety/rollback thresholds. Scientific completeness remains
`NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE`, regardless of
synthetic test outcomes. No Swiss fallback.

This work does **not** authorize publication, repo-visibility or license
changes, GitHub Actions, merges onto `main`, deploys, or production release.
Keep VirgoStars credits and provenance visible.
