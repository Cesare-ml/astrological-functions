# F1/F2 ↔ F5: lossless UTC millisecond input boundary

**Status:** isolated, opt-in compatibility candidate for PR #70 and PR #72.
It is **not** a public package export and does not change the existing
`EphemerisProvider` contract or live astrological calculations.

## Why this adapter exists

PR #70 deliberately represents civil UTC instants with up to **nine fractional
digits** (nanoseconds), while PR #72's `validateUtcSearchWindow` and
`splitUtcSearchWindow` accept **at most three fractional digits** and compute
bounded elapsed milliseconds using ECMAScript `Date`.

Never truncate, round, or silently widen the F5 contract. A 1-nanosecond
difference matters to the half-open boundary and cannot be described using
F5's current epoch-millisecond convention.

`src/utc-f5-millisecond-adapter.mjs` exports the standalone
`toF5MillisecondWindowInput({ interval, maxDurationMs })` helper. Both UTC
endpoints are strictly validated by the independent PR #70 Gregorian contract.
Every endpoint **must** be an exact multiple of one millisecond. The helper
then produces an immutable `{startUtc,endUtc,maxDurationMs}` snapshot in
`YYYY-MM-DDTHH:mm:ss.SSSZ` form, which PR #72 accepts.

```js
import { toF5MillisecondWindowInput } from '../src/utc-f5-millisecond-adapter.mjs';

// Representative input from a future F1/F2 consumer:
const input = toF5MillisecondWindowInput({
  interval: {
    start: {datetimeUtc: '2024-02-29T23:59:59.999000000Z',
      calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC'},
    end: {datetimeUtc: '2024-03-01T00:00:00Z',
      calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC'},
  },
  maxDurationMs: 1,
});
// input.startUtc === '2024-02-29T23:59:59.999Z';
// input.endUtc === '2024-03-01T00:00:00.000Z';
```

## Fail-closed requirements

- `UNSUPPORTED_UTC_PRECISION`: an endpoint has nonzero fractional
  nanoseconds below the millisecond. The adapter never changes the instant.
- `INVALID_INTERVAL_LIMIT`: missing/nonpositive/non-safe-integer
  `maxDurationMs`; the input bound is mandatory.
- All PR #70 errors for calendar, time scale, malformed UTC or
  empty/inverted intervals propagate unchanged.
- This adapter **does not compute or enforce duration**. The F5 validator
  must still be called on its result, where `INTERVAL_TOO_LONG` remains
  possible. Passing the adapter is not a guarantee that F5 will accept
  the requested search duration.
- `[start,end)` remains the semantic convention; no endpoint is
  automatically treated as an astronomical event hit.
- No Julian day, leap-second, TT/TDB/UT1, observer, ephemeris, astronomical
  kernel, timezone, or solar position is inferred.

## Manual verification

```sh
node --test test/utc-f5-millisecond-adapter.test.mjs
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/utc-f5-millisecond-adapter.consumer.mts
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler test/utc-f5-millisecond-adapter.consumer.mts
```

The focused synthetic tests cover nanosecond-loss rejection, leap day
boundaries, explicit duration limits, type errors and immutable outputs.
An additional local **cross-branch fixture** executed a byte-identical copy
of PR #72's `src/utc-search-window.mjs` with the unchanged main
`AstrologyError` class shape, verifying acceptance at years 0001 and 9999,
a 2024 leap-day transition, and a fractional 2026 endpoint. This fixture
is **not** an authenticated full checkout or stacked-branch merge test.

Before merging PR #70 and #72, run the **full** `npm test` and typed consumer
compilation on a reconciled branch, examine F5 event candidate ownership and
any changed F5 inputs, and verify real Rust/WASM/NASA-JPL integration separately.
No publication, license, GitHub Actions, deployment or production changes
are authorized. VirgoStars attribution:
https://github.com/Cesare-ml/VirgoStars-Ephemeris
