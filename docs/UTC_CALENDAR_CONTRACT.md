# Experimental strict UTC calendar-input boundary (F1/F2)

**Status:** isolated validation utility, NOT a public package export or production replacement.

`src/utc-calendar-contract.mjs` and its paired `.d.mts` define an explicit civil-time
input for consumers preparing a future `EphemerisProvider` request:

```js
import { parseUtcGregorianInstant } from '../src/utc-calendar-contract.mjs';

const validated = parseUtcGregorianInstant({
  datetimeUtc: '2026-11-14T12:00:00.123456789Z',
  calendar: 'PROLEPTIC_GREGORIAN',
  timeScale: 'UTC',
});
// validated.nanosecond === 123456789; validated.year === 2026
```

The contract deliberately requires `Z` (no local time or silent offset
conversion), a four-digit year from 0001 to 9999, a **proleptic Gregorian**
calendar, valid civil days including the 400-year leap rule, and 00–23 hours.
Fractional seconds may have 1–9 digits and are retained exactly as integer
nanoseconds and original text, without `Date.parse()` rollover. Leap second
`:60` is rejected because no versioned leap-second policy is pinned.
Errors carry `INVALID_UTC_INPUT`, `UNSUPPORTED_CALENDAR`, or
`UNSUPPORTED_TIME_SCALE` codes; successful results are frozen.

This is **not** a UTC-to-TT/TDB conversion, timezone database, historical Julian
calendar conversion, numerical JD, ΔT model or evidence of ephemeris accuracy.
The parser's proleptic calendar rule is an *explicit convention*, not a claim
that historical users employed it. BCE/astronomical year zero requires a
separate versioned representation and cannot be silently inferred.

## Validation

```sh
node --test test/utc-calendar-contract.test.mjs
npm test
```

The module is intentionally **not wired into `src/index.mjs` or `package.json`**:
the open provider contract PR #3 and concurrent typed ESM exports must be
reconciled first. When integrated, callers must opt into this contract and
regress legacy accepted strings deliberately; do not turn it into an implicit
breaking change. Keep Rust VirgoStars Ephemeris as the sole astronomy engine:
https://github.com/Cesare-ml/VirgoStars-Ephemeris.

No publication, deployment, GitHub Actions or license change is implied.

For the typed NodeNext ESM consumer fixture (TypeScript must be available):

```sh
tsc --noEmit --strict --target es2022 --module NodeNext --moduleResolution NodeNext test/utc-calendar-contract.consumer.mts
```

The declaration file uses `.d.mts` intentionally: NodeNext resolves declarations
for `.mjs` imports through `.d.mts`, not a sibling `.d.ts`.
