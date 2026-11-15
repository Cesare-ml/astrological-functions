# Experimental whole-sign house cusps (F3)

Status: **IMPLEMENTED_ISOLATED**. This is astrological-method geometry from an already-provided Ascendant, not an astronomical calculation or release. There is no Swiss dependency and no derivation of an Ascendant, ayanamsa, observer or local time.

## API and exact convention

Direct source import (not a root package export):

~~~js
import { calculateWholeSignHouseCusps } from './src/whole-sign-house-cusps.mjs';
import { locateLongitudeInHouses } from './src/index.mjs';

const result = calculateWholeSignHouseCusps({
  ascendantLongitudeDeg: 345.5,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
});
// result.cuspsDeg: [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]
const placement = locateLongitudeInHouses(0, result.cuspsDeg);
// placement.house === 2
~~~

Whole-sign houses begin **at the start of the Ascendant's zodiac sign**, not at the Ascendant degree. Each successive sign begins the next house. This differs from **EQUAL_ASCENDANT** (separate PR #29), which starts house 1 at the exact Ascendant degree, and from Vehlow/legacy `egizia` and quadrant house systems. A longitude exactly on a cusp belongs to the house starting on that cusp using the existing forward-ordered locator.

## Input and provenance

- Explicit **birthTimeKnown: true** is mandatory; **false** raises **BIRTH_TIME_UNKNOWN**. Never invent house placements from an unknown birth time.
- Require a finite Ascendant longitude, actual UTC ISO calendar instant ending Z (at most three fractional-second digits), **ECLIPTIC_OF_DATE** frame and either tropical or sidereal longitude basis. Sidereal requires a nonblank, unpadded ayanamsa identifier of at most 128 characters; no implicit ayanamsa is calculated.
- A caller must guarantee all subsequent planetary coordinates use the **same zodiac basis and frame** as the supplied Ascendant. Neither that agreement nor the astronomical accuracy of the Ascendant is independently verified here. Do not relabel geometric J2000 as apparent-of-date.
- Output: frozen, detached **WholeSignHouseCusps / 0.1.0-experimental**, including twelve cusp degrees, Ascendant sign index (Aries=0 through Pisces=11), normalized Ascendant and status **CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED**.
- Malformed arguments throw **AstrologyError** with **INVALID_WHOLE_SIGN_INPUT**, **INVALID_ANGLE**, **INVALID_UTC**, **INVALID_FRAME**, **INVALID_ZODIAC** or **BIRTH_TIME_UNKNOWN**. Unknown fields reject rather than silently changing method semantics.

## Verification

Run in a complete Node.js 20+ checkout:

~~~sh
node --test test/whole-sign-house-cusps.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/whole-sign-house-cusps.test.ts
npm test
~~~

The synthetic tests cover the 0°/30°/360° boundaries, wrapped Pisces-to-Aries houses, all twelve signs, multi-turn angles, cusp ownership, immutable snapshots, birth-time availability and strict UTC/zodiac validation. They do **not** validate NASA/JPL or real Rust/WASM ephemerides, the true Ascendant, legacy compatibility, chart rendering or scientific predictive claims.

The experimental typed ESM source subpath is not yet a public package export. Integration with the equal-house alternative and versioned method-selection API requires coordinated review. No changes to production, publishing, GitHub Actions, licensing or repository visibility. VirgoStars project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
