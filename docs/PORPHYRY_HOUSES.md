# Porphyry houses — geometric quadrant trisection (F3 experimental)

`calculatePorphyryHouseCusps` computes **twelve house cusps** from an explicitly supplied Ascendant and Midheaven in the **same tropical ecliptic-of-date coordinate convention**. It performs traditional Porphyry *astrological house geometry*, not astronomical calculation of the Ascendant, Midheaven, sidereal time, obliquity, observer horizon or solar events.

```
import {calculatePorphyryHouseCusps} from '../src/porphyry-houses.mjs';

const facts = calculatePorphyryHouseCusps({
  datetimeUtc:'2026-11-12T20:30:00Z',
  ascendantDeg:10,
  midheavenDeg:285,
  source: {
    engineVersion:'SYNTHETIC_PROVIDER',
    kernelSetId:'SYNTHETIC_KERNEL',
    timeModel:'SYNTHETIC_UTC',
    frame:'ECLIPTIC_OF_DATE',
    zodiac:'TROPICAL',
    observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:44,longitudeDegEast:11},
  },
});
// cusps 1/4/7/10: ASC 10°, IC 105°, DSC 190°, MC 285°
// quadrant spans 95° / 85° / 95° / 85°
```

## Definition and exact cusp rules

- The four anchor axes, in the direction of increasing zodiac longitude, are ASC → IC → DSC → MC → ASC. Opposite anchors are derived by adding exactly 180° to ASC and MC.
- Each of the four **forward ecliptic longitude arcs** is divided into three equal pieces, yielding 12 cusps. This is **not** equal-house or Placidus. Nonuniform quadrants produce nonuniform house sizes.
- The arrays are zero-indexed, with `cuspsDeg[0]` for house 1, `[3]` for house 4, `[6]` for house 7, and `[9]` for house 10. Longitudes are normalized to [0°, 360°). Use the already existing `locateLongitudeInHouses` utility to place any planet; an exact cusp belongs to the house that **starts** at the cusp.
- A source yielding inverted, coincident or nearly half-circle quadrants (≤1e-9° or ≥180°−1e-9°) is rejected rather than reordering axes or inventing a house system. It is the upstream astronomical provider's responsibility to report when geographic and numerical conditions make Ascendant/MC unreliable.
- Geographic poles ±90° are explicitly rejected because a unique geographic eastern horizon may not be defined there. No fallback to Vehlow, Equal, Placidus, Koch or an arbitrary 0° house cusp is permitted.

## Strict provider boundary

A valid result requires: actual ISO UTC with seconds (maximum three fractional digits), finite Ascendant/MC longitudes, a named engine/kernel/time model, `ECLIPTIC_OF_DATE`, `TROPICAL`, `TOPOCENTRIC`, and finite valid coordinates. The source metadata are **caller assertions**. The resulting `validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'` must be preserved to consumers until real Rust/WASM Ephemeris angles are independently validated. This module does not prove JPL accuracy or a configured apparent/true horizon model.

Sidereal house charts are intentionally **not** silently supported: a caller must explicitly apply a separately validated zodiac/ayanamsa transformation to the house cusps (and choose a documented versioned policy). The older VirgoStars “egizia” label maps to a different legacy Vehlow context and must **not** be silently treated as Porphyry.

The module has no dependency on Swiss Ephemeris, personal records, interpretations, UI or production. `package.json` exports are not changed pending consolidation of other open PRs. All fixtures are synthetic.

## Reproduce

```
node --test test/porphyry-houses.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/porphyry-houses.test.ts
npm test
```

Real astronomical validation, high-latitude method compatibility, full repository test suite and legal/attribution review must happen before release. Preserve [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris) credits.
