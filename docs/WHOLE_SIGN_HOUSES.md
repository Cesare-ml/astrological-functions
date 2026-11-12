# Experimental Whole Sign house cusps (F3)

`src/whole-sign-house-cusps.mjs` exposes the pure, astronomical-data-free `calculateWholeSignHouseCusps` function. **It is not `EQUAL_ASCENDANT`, Vehlow / legacy `egizia`, or a quadrant house calculation.** House 1 starts at the beginning of the ascendant's zodiac sign, with houses 2–12 covering the following signs. At an exact cusp, the point belongs to the house starting there (the existing `locateLongitudeInHouses` rule).

```js
import { calculateWholeSignHouseCusps } from './src/whole-sign-house-cusps.mjs';
import { locateLongitudeInHouses } from './src/index.mjs';
const r = calculateWholeSignHouseCusps({
  ascendantLongitudeDeg: 345,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
});
// r.cuspsDeg = [330,0,30,60,90,120,150,180,210,240,270,300]
// locateLongitudeInHouses(0, r.cuspsDeg).house === 2
```

The ascendant must have been computed upstream by a separately validated provider for the same instant, location, frame, and already-selected tropical or named sidereal zodiac. This method does **not** calculate the ascendant, ayanamsa, precession, houses astronomy or planetary positions. `birthTimeKnown:true` is an explicit fail-closed assertion; unknown times cannot produce a specific whole-sign house assignment. `provenanceStatus` is `CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED` and does not certify the source data. The result and nested cusp/basis objects are immutable. Longitude input is normalized modulo 360.

`datetimeUtc` must be a real UTC ISO instant (no offset, with seconds and at most millisecond precision). Only the asserted `ECLIPTIC_OF_DATE` frame is accepted. The caller must explicitly pass a compatible zodiac basis; a sidereal basis needs a named `ayanamsaId`. The function **does not** project or compare tropical and sidereal coordinates. Invalid input fails with `AstrologyError` codes instead of choosing defaults. This experimental isolated module is not exported through `package.json` and must be directly source-imported until packaging and cross-PR review.

Local checks:

```sh
node --test test/whole-sign-house-cusps.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/whole-sign-house-cusps.test.ts
npm test
```

All tests use synthetic longitudes. No validation against astronomical reference kernels, actual Rust/WASM integration, historical charts or production behavior is implied. Do not publish, merge or deploy until review; maintain VirgoStars credits and follow the unresolved outbound licensing gate.
