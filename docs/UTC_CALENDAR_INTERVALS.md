# UTC civil ordering and half-open search intervals (isolated experiment)

Use `src/utc-calendar-intervals.mjs` alongside the explicit
`src/utc-calendar-contract.mjs` parser to validate deterministic, *civil*
UTC order for a future event-search request. These modules are intentionally
**not public package exports**, do not perform astronomy and do not change
existing VirgoStars calculations or the in-development provider interface.

```js
import {
  compareUtcGregorianInstants, createUtcGregorianInterval,
} from '../src/utc-calendar-intervals.mjs';

const start = {
  datetimeUtc: '2026-11-14T12:00:00.000000001Z',
  calendar: 'PROLEPTIC_GREGORIAN', timeScale: 'UTC',
};
const end = { ...start, datetimeUtc: '2026-11-14T12:00:00.000000002Z' };
compareUtcGregorianInstants(start, end); // -1
const window = createUtcGregorianInterval({ start, end });
// window.boundary === 'START_INCLUSIVE_END_EXCLUSIVE'
```

- Both inputs are validated using the same strict proleptic Gregorian UTC
  contract. Comparison returns exactly `-1`, `0`, or `1` by year, month, day,
  hour, minute, second and integer nanosecond.
- Different textual precision can describe the same instant: `.1Z` equals
  `.100000000Z` and `.000Z` equals no fractional digits.
- An interval must have `start < end`; equality and reversal fail with
  `UtcInputError.code === 'INVALID_UTC_INTERVAL'`. A malformed or unsupported
  endpoint retains its parser's typed error.
- Return snapshots, including nested endpoints, are frozen and detached from
  caller-owned objects; the chosen boundary convention is `[start, end)`.
- **Ordering is not duration.** Neither the comparator nor the interval
  supplies an SI-second duration, leap-second model, UTC/TT/TDB conversion,
  historical timezone interpretation, Julian day, or JPL accuracy. UTC `:60`
  is rejected by the underlying parser until a versioned policy is introduced.

## Exact local verification commands

```sh
node --check src/utc-calendar-intervals.mjs
node --test test/utc-calendar-contract.test.mjs test/utc-calendar-intervals.test.mjs
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/utc-calendar-contract.consumer.mts test/utc-calendar-intervals.consumer.mts
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler test/utc-calendar-contract.consumer.mts test/utc-calendar-intervals.consumer.mts
```

The local synthetic validation does **not** establish that the full authenticated
checkout's `npm test`, the stacked PR #3 provider integration or any real
Rust/WASM/JPL astronomical test passed. Reconcile export-map work before making
these functions importable through the package root. The independent
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the only source of astronomy. No GitHub Actions, merge, release,
deployment, license decision or repository visibility change is implied.
