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

This branch adds only this standalone module, its `.d.mts`, one Node runtime test suite, one strict TS consumer fixture and this note. The package stays `private`, with **no package export-map change** (future typed ESM entrypoint integration requires explicit coordination with parallel draft PRs).

Manual checks on a complete checkout:

```sh
node --test test/utc-search-window.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/utc-search-window.test.ts
```

These are synthetic validation checks only. A real VirgoStars Ephemeris Rust/WASM source and scientific comparison remain separate gates. Keep VirgoStars project credits and the current legal/publication review before any public release.
