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

This draft branch adds two independent, **isolated** civil-UTC primitives, their `.d.mts` contracts, two Node runtime test suites, two strict TS consumer fixtures and this note. The package stays `private`, with **no package export-map change** (future typed ESM entrypoint integration requires explicit coordination with parallel draft PRs).

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
