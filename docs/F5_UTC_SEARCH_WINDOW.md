# F5 — strict UTC event-search window (experimental)

`validateUtcSearchWindow` is a small, dependency-free **civil-time input gate** for future bounded event-search functions. It has no access to astronomical coordinates, kernels, accounts, databases or Swiss Ephemeris. It is not wired into production or the existing F5 draft pipelines.

## Contract

```js
import { validateUtcSearchWindow } from './src/utc-search-window.mjs';

const window = validateUtcSearchWindow({
  startUtc: '2026-11-14T00:00:00Z',
  endUtc: '2026-11-15T00:00:00Z',
  maxDurationMs: 86_400_000,
});
// window.durationMs === 86_400_000
```

- Both inputs are real ISO-8601 **UTC (`Z`) civil instants**, with four-digit years, seconds, and optional 1–3 fractional digits; impossible dates, offsets, leap seconds and precision beyond milliseconds are rejected rather than normalized.
- `endUtc` must be strictly later than `startUtc`. A positive safe-integer `maxDurationMs` is **mandatory**; a window at the limit is accepted. No hidden search horizon, timezone, observer, zodiac, delta-T or ephemeris behavior is inferred.
- On success, the caller gets an immutable `{startUtc,endUtc,startEpochMs,endEpochMs,durationMs,maxDurationMs}` snapshot. On failure, `AstrologyError` has `INVALID_ARGUMENT`, `INVALID_UTC`, `INVALID_INTERVAL_LIMIT`, `INVALID_INTERVAL`, or `INTERVAL_TOO_LONG`.
- Millisecond epoch arithmetic follows **ECMAScript UTC civil-time**: it does not model leap seconds, TT/TDB, Julian days, UT1, or ephemeris precision. It **does not** establish that a continuous path has zero or one event inside the interval. Search algorithms must independently bound iteration, roots and non-convergence.

## Isolation / verification

This draft branch adds four **isolated** civil-UTC modules, their `.d.mts` contracts, four Node runtime test suites, four strict TS consumer fixtures and this note. The package stays `private`, with **no package export-map change** (future typed ESM entrypoint integration requires explicit coordination with parallel draft PRs).

Manual checks on a complete checkout:

```sh
node --test test/utc-search-window.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/utc-search-window.test.ts
```

These are synthetic validation checks only. A real VirgoStars Ephemeris Rust/WASM source and scientific comparison remain separate gates. Keep VirgoStars project credits and the current legal/publication review before any public release.


## Bounded, deterministic partitioning

The follow-up `splitUtcSearchWindow` helper partitions one already-specified UTC range into immutable **half-open** chunks. It delegates to the strict `validateUtcSearchWindow` input gate; it does not solve for astronomical events.

```js
import { splitUtcSearchWindow } from './src/utc-search-window-chunks.mjs';

const plan = splitUtcSearchWindow({
  startUtc: '2026-11-14T00:00:00Z',
  endUtc: '2026-11-15T00:00:00Z',
  maxDurationMs: 86_400_000,
  chunkDurationMs: 3_600_000,
  maxChunks: 24,
});
// plan.chunks.length === 24; each chunk covers one hour.
```

- `chunkDurationMs` must be a positive safe integer; `maxChunks` must be an explicit positive integer at most **4,096**. A query needing more than its declared `maxChunks` raises `TOO_MANY_CHUNKS` **before allocating chunks**; invalid limits raise `INVALID_CHUNK_DURATION` or `INVALID_CHUNK_LIMIT`.
- Every chunk contains `{index,startUtc,endUtc,startEpochMs,endEpochMs,durationMs}`. Dates are canonicalized to millisecond-precision UTC. There are no zero-length tails, gaps, overlaps, or duplicated millisecond slots. The plan, snapshot, chunks array, and individual chunks are frozen.
- Each chunk represents a half-open interval `[startEpochMs, endEpochMs)`, including the first instant and excluding its end. **The overall end instant is not included.** Downstream search algorithms must explicitly decide whether to test the terminal instant, deduplicate exact hits at boundaries, and handle convergence/continuity assumptions.
- This bounds **the number of partitions**, not the CPU time, astronomical lookups or number of roots in a partition. The search engine must retain separate iteration, time, cancellation, provider-provenance and scientific-validation limits.

Manual isolated checks:

```sh
node --test test/utc-search-window-chunks.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/utc-search-window-chunks.test.ts
```

**Verification (2026-11-14):** 5/5 Node 22.16.0 synthetic chunk tests passed; TypeScript 5.8.3 strict NodeNext check passed in a dependency-only local fixture. The four new source/test Git blobs matched local Git object hashes. The fixture substituted only the existing unchanged `AstrologyError` dependency from `src/index.mjs`, not the complete private checkout; consequently these results **do not certify** the full `npm test` suite or scientific ephemeris parity.


## Reconcile event candidates from adjacent UTC chunks

`reconcileUtcChunkEventHits` is a **post-processing contract** for results returned by a separate event solver. It accepts a complete set of chunk-indexed, candidate-hit arrays and makes the half-open ownership rule enforceable without computing planetary coordinates, roots, ingress directions or stations.

```js
import { reconcileUtcChunkEventHits } from './src/utc-chunk-event-reconciliation.mjs';

const merged = reconcileUtcChunkEventHits({
  windowInput: {
    startUtc: '2026-11-14T00:00:00Z',
    endUtc: '2026-11-14T01:00:00Z',
    maxDurationMs: 3_600_000,
    chunkDurationMs: 1_800_000,
    maxChunks: 2,
  },
  chunkResults: [
    { chunkIndex: 0, hits: [{ eventKey: 'SUN_INGRESS', instantUtc: '2026-11-14T00:30:00Z' }] },
    { chunkIndex: 1, hits: [{ eventKey: 'SUN_INGRESS', instantUtc: '2026-11-14T00:30:00.000Z' }] },
  ],
  maxInputHits: 20,
});
// merged.rawHitCount === 2; merged.duplicateCount === 1;
// merged.hits[0].ownerChunkIndex === 1;
```

- Each reported chunk may contain hits **at its own inclusive end** because a bracket/root solver can evaluate both ends. The reconciler assigns these boundary hits to the **next** half-open chunk, even when that next chunk reports no copy. A hit at the overall `endUtc` is **rejected**: the top-level interval remains half-open.
- The only deduplication key is the caller's nonempty, trimmed `eventKey` plus **the exact UTC millisecond**. Different event keys at the same time are preserved (for example, an ingress and a station); timestamps with `.5Z` and `.500Z` are considered identical. No tolerance window merges near-but-distinct events, and no physical event identity is inferred.
- A solver/consumer **must** assign stable event keys that distinguish event kind, participants, direction and other relevant identities. This module does not validate the meaning of those keys or prove the event actually occurred. It only accepts minimal `{eventKey,instantUtc}` candidate records; all extra properties are rejected so provenance or astronomical metadata cannot be silently discarded.
- `chunkResults` must supply **one record per chunk**, including empty arrays; records can arrive in any order. Duplicate/missing/out-of-range indices, impossible event timestamps, or candidate hits outside their chunk's *closed* envelope raise typed `AstrologyError` codes. The result is sorted and frozen, with `chunkCount`, `rawHitCount`, `duplicateCount`, canonical hit timestamps and `ownerChunkIndex`.
- The caller must declare `maxInputHits` between 1 and 16,384, and the reconciler rejects excess candidates before processing them. This prevents unbounded accumulation **inside the function**, but does not restrict a caller that has already allocated a large array. An actual solver must still bound CPU, memory, iteration, provider calls, convergence and error propagation.

### Local isolated verification — 14 November 2026

```sh
node --test test/utc-search-window.test.mjs test/utc-search-window-chunks.test.mjs test/utc-chunk-event-reconciliation.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/utc-chunk-event-reconciliation.test.ts
```

**Results:** 18/18 focused Node 22.16.0 tests passed and the three TS 5.8.3 strict NodeNext consumer fixtures passed in a local **dependency-only fixture** that substitutes the existing main `AstrologyError` class. All new GitHub source/test blobs were matched with local `git hash-object`. No full private-repository checkout tests, real Rust/WASM astronomical integration, JPL validation, chart application or production integration was performed.


## Sequential injected-provider candidate scan (isolated F5)

`scanUtcChunkCandidatesWithProvider` is a narrow integration boundary for a **caller-owned** asynchronous event candidate provider. It composes the previously reviewed UTC validation, bounded chunk planner and exact-millisecond boundary reconciliation. It does **not** provide astronomical event detection or import a real ephemeris.

```js
import { scanUtcChunkCandidatesWithProvider } from './src/utc-chunk-provider-runner.mjs';

const result = await scanUtcChunkCandidatesWithProvider({
  windowInput: {
    startUtc: '2026-11-14T00:00:00Z',
    endUtc: '2026-11-14T01:00:00Z',
    maxDurationMs: 3_600_000,
    chunkDurationMs: 1_800_000,
    maxChunks: 2,
  },
  maxInputHits: 20,
  provider: {
    async scanChunk(request) {
      // Synthetic fixture ONLY. Real events require an independently validated solver.
      return request.chunkIndex === 0
        ? [{ eventKey: 'MOCK_EVENT', instantUtc: '2026-11-14T00:30:00Z' }]
        : [{ eventKey: 'MOCK_EVENT', instantUtc: '2026-11-14T00:30:00.000Z' }];
    },
  },
});
// result.providerCallCount === 2
// result.rawHitCount === 2; result.duplicateCount === 1
```

The provider receives **one frozen request for each chunk**, sequentially and in chronological order: `{chunkIndex,startUtc,endUtc,startEpochMs,endEpochMs}`. Closed-right-edge candidate hits are allowed for each individual chunk, except the entire search's rightmost instant, which is excluded. Candidate identity is the caller's nonempty `eventKey` plus the UTC millisecond. Results include the existing immutable reconciliation facts and `providerCallCount`.

The runner copies the five window fields **before the first await**. It snapshots each candidate's **own data properties** immediately after the corresponding provider call; it rejects additional properties, accessors, invalid or out-of-bounds UTC instants, and over-budget results **before calling the next chunk**. Missing/invalid providers, invalid bounds and absent caps fail before any provider call. A rejected provider call propagates its exception; it never silently becomes an empty event list.

**Limits and scientific gates:** `maxChunks` bounds the number of sequential provider requests (hard ceiling 4,096), and `maxInputHits` bounds total accepted raw candidates (1–16,384). The runner has **no wall-clock timeout or cancellation**; these must be imposed externally before production use. The provider controls its own CPU, memory, kernel metadata, body selection, frame, time model and event completeness. The runner does not inspect or assert scientific provenance and does not prove roots, stations, ingresses or any physical events. The existing draft transit F5 pipelines (#14/#17/#21) are **not** integrated or modified here.

### Isolated verification (2026-11-14)

```sh
node --test test/utc-chunk-provider-runner.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/utc-chunk-provider-runner.test.ts
```

On Node **22.16.0**, **11/11 synthetic runtime tests passed**. TypeScript **5.8.3** passed strict NodeNext checking against locally reconstructed declaration dependencies. All four new source/test GitHub file SHA-1 blob IDs were checked against the exact locally tested files. The private repository **was not cloned**; the isolated fixture used a matching standalone `AstrologyError` class and reconstructed dependent UTC modules. This is **not** a verified full-repository `npm test`, native Rust/WASM integration, JPL comparison or release acceptance.
