# Membership and intersection of half-open civil UTC intervals

**Status: isolated experimental utility; NOT exported from the private package.**

`src/utc-calendar-window-sets.mjs` composes strict calendar parsing and half-open
interval construction from PR #70. It introduces two pure operations:

- `containsUtcGregorianInstant(interval, instant)`: whether a validated instant
  belongs to a `[start, end)` interval, including `start` and excluding `end`.
- `intersectUtcGregorianIntervals(left, right)`: maximal half-open overlap,
  or `null` when windows are disjoint **or only touch at a boundary**.
  Successful results are immutable detached snapshots, with fractional-second
  ordering to one nanosecond.

All inputs require explicit `PROLEPTIC_GREGORIAN` and `UTC` with an ISO-8601
`Z` timestamp. No offset conversion, leap-second or historical calendar
assumptions are made. An invalid interval or instant throws the underlying
`UtcInputError`, instead of returning a false membership or fake empty window.

These **civil UTC order predicates do not calculate elapsed SI seconds**,
UTC-to-TT/TDB, Julian days, longitude, or the time of an astronomical event.
They do not integrate, duplicate or replace the separate F5 search-window
chunking prototype in PR #72. Future consumers must reconcile these choices
before implementing a shared event-search API.

## Manual tests (no GitHub Actions)

```sh
node --test test/utc-calendar-contract.test.mjs test/utc-calendar-intervals.test.mjs test/utc-calendar-window-sets.test.mjs
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/utc-calendar-contract.consumer.mts test/utc-calendar-intervals.consumer.mts test/utc-calendar-window-sets.consumer.mts
tsc --noEmit --strict --target es2022 --module ESNext --moduleResolution Bundler test/utc-calendar-contract.consumer.mts test/utc-calendar-intervals.consumer.mts test/utc-calendar-window-sets.consumer.mts
```

The complete private checkout, provider PR #3, parallel F5 PR #72, upstream
Rust/WASM with real NASA/JPL kernels, astronomy accuracy, licensing and
production integrations are **separate unverified gates**. Preserve the
VirgoStars attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
Do not merge or release before review, and do not turn on GitHub Actions.
