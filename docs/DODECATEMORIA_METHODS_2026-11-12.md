# Dodecatemoria conventions — isolated F1 opt-in prototype

**Status:** IMPLEMENTED_ISOLATED (draft PR only); no integration with production, npm package root, or a validated astronomical provider.

## Why this exists

Historical treatments use the word *dodecatemoria* for related, non-identical computations. Making the convention explicit prevents a consumer from incorrectly treating one method as a universally interchangeable result. This isolated new module reuses existing experimental pure functions and leaves `dodecatemoriaLongitude(longitudeDeg)` unchanged.

Supported explicit methods:

| Identifier | Equation | Example for Aries 11° |
| --- | --- | --- |
| `PAULUS_13_V1` | `normalize360(13 × absoluteLongitudeDeg)`; equivalently `normalize360(signStartDeg + 13 × degreesWithinSign)` | Leo 23° (143° absolute) |
| `TWELVE_EQUAL_PARTS_V1` | `normalize360(signStartDeg + 12 × degreesWithinSign)` | Leo 12° (132° absolute) |

For the twelve-equal-parts method, each 2.5° segment starts a new part, numbered **0–11**. At exactly 2.5° the new segment owns the boundary. `partIndex` is `null` for the 13-fold method, which must not be presented as a twelve-equal-segment index.

These are **astrological conventions**, not astronomical reference-frame conversions. The function takes a longitude **already projected** into the caller-declared `TROPICAL` or `SIDEREAL` zodiac. It does not derive an ayanamsa, ecliptic coordinates, timestamp, observer or ephemeris precision. The result records its selected zodiac, chosen versioned method, source sign and transformed longitude. It makes no interpretive claims.

## Safe usage

```js
import { calculateDodecatemoriaFacts } from './src/dodecatemoria-methods.mjs';

const result = calculateDodecatemoriaFacts({
  longitudeDeg: 11,
  zodiac: 'TROPICAL',
  method: 'PAULUS_13_V1',
});
// result.projectedLongitudeDeg === 143
```

No default method or zodiac is supplied. Invalid longitude, method and zodiac are rejected using `AstrologyError`. All returned facts are frozen plain objects. The new module is intentionally **not** added to the root `package.json` exports yet: consumer-facing package integration requires coordinated review of the in-flight packaging PRs.

## Verification

- `node --test test/dodecatemoria-methods.test.mjs`
- `tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/dodecatemoria-methods.ts`
- In the local isolated mirror (Node.js 22.16.0 / TypeScript 5.8.3), all 7 runtime tests passed, including wrap-around, exact 2.5° boundaries, explicit conventions, compatibility with the existing helper and fail-closed inputs. These are synthetic mathematical tests, **not** real ephemeris tests or a run of the full GitHub repository suite.

## Research references (method distinction, not copied code)

- Greenbaum & Jones, *P.Berl. 9825: An elaborate horoscope for 319 CE*: https://archive.nyu.edu/bitstream/2451/49543/4/Greenbaum%20and%20Jones%202017%20PBerl%209825%20ISAW%20Papers.pdf
- Skyscript, *Dodekatemoria* glossary: https://www.skyscript.co.uk/glossary/dodekatemoria/

All code here is newly implemented, with no Swiss Ephemeris or external datasets.
