# Experimental equal-house cusp geometry (F3)

`src/equal-house-cusps.mjs` implements **EQUAL_ASCENDANT** houses: start house 1 at the caller-provided ascendant longitude, then add 30° for every next house cusp. It is **not** a whole-sign chart (which starts house 1 at the beginning of the ascendant's zodiac sign), a quadrant house system, or the legacy `egizia`/Vehlow convention. It neither derives the ascendant nor projects the zodiac; those astronomical inputs belong upstream.

## Direct source import (not a public package export)

```js
import { calculateEqualHouseCusps } from './src/equal-house-cusps.mjs';

const result = calculateEqualHouseCusps({
  ascendantLongitudeDeg: 345,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
});
// result.cuspsDeg === [345,15,45,75,105,135,165,195,225,255,285,315]
// Pass result.cuspsDeg to locateLongitudeInHouses(longitudeDeg, cuspsDeg)
```

The result records a versioned `EqualHouseCusps` contract, fixed `EQUAL_ASCENDANT` method, input instant and basis, normalized ascendant, frozen twelve-cusp array and a `CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED` provenance status. The method preserves zodiac basis, **does not convert between tropical/sidereal**, and **does not calculate or validate an ayanamsa**. Sidereal callers must provide a nonempty identifier for their already-converted positions. The instant is strictly UTC (up to millisecond precision), and the frame must be `ECLIPTIC_OF_DATE`. The caller must guarantee that ascendant, future planet longitudes, date, zodiac, frame and provider provenance agree; this module cannot independently check those assertions. It cannot run from unsupported geometric J2000 ephemeris data by interpreting them as apparent-of-date facts.

Input validation fails closed with `AstrologyError` codes `INVALID_EQUAL_HOUSE_INPUT`, `INVALID_ANGLE`, `INVALID_UTC`, `INVALID_FRAME` or `INVALID_ZODIAC`, rather than guessing missing options. Caller input objects and the returned result are detached; result and nested structures are frozen. Longitude is taken modulo 360° and a point **exactly on a cusp** belongs to the house beginning at that cusp under the existing `locateLongitudeInHouses` geometric placement rule.

## Validation commands

```sh
node --test test/equal-house-cusps.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/equal-house-cusps.test.ts
npm test
```

Tests use synthetic input only. They do not establish scientific accuracy of ascendant calculations, JPL parity, legacy VirgoStars parity, real Rust/WASM integration or production readiness. No `package.json`, shared API, published version, real charts or application code changes are included in this slice. A package subpath/export and integration with F3 house profiles require a later coordinated review. Keep public release and outbound licensing gated; VirgoStars project attribution obligations remain subject to explicit owner licensing decisions.
