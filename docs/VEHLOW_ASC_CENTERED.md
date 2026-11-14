# Vehlow Ascendant-centred equal houses (experimental F3)

This module contains a **pure astrological geometric convention**, not a new astronomical solver. It produces twelve 30-degree house intervals with the Ascendant at the midpoint of house 1, unlike Equal Ascendant (Ascendant on cusp 1) and Whole Sign (house 1 begins at sign 0°).

The convention is documented by Astrodienst's public description of the Vehlow method, https://www.astro.com/faq/fq_fh_owhouse_f.htm. The implementation here is independently written and **does not copy, import, derive from, or call Swiss Ephemeris source**. Mathematical behavior still needs independent compatibility fixtures before claiming parity with any existing implementation.

## Explicit usage

```js
import { calculateVehlowHouseCusps } from 'astrological-functions/vehlow-houses';
const facts = calculateVehlowHouseCusps({
  profile: 'VEHLOW_ASC_CENTERED_V1',
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T22:30:00Z',
  ascendantDeg: 10,
  source: {
    engineVersion: 'SYNTHETIC_ENGINE', kernelSetId: 'SYNTHETIC_KERNEL',
    timeModel: 'SYNTHETIC_UTC', center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT', zodiac: 'TROPICAL',
    observerType: 'TOPOCENTRIC', observer: {latitudeDeg:44,longitudeDegEast:11},
  },
});
// facts.cuspsDeg = [355,25,55,85,115,145,175,205,235,265,295,325]
```

House 1 begins at `normalize360(ascendantDeg - 15)`; house `i+1` begins at `normalize360(cusp1 + 30*i)` for `i=0..11`. Exact cusp ownership follows the existing `locateLongitudeInHouses`: a longitude exactly at a cusp belongs to the house starting there. Longitude inputs must be finite and normalized to [0,360] (360 wraps to zero). The API requires known birth time and an explicitly selected versioned profile; there are no arbitrary house-system defaults.

## Legacy VirgoStars compatibility is **not established**

Legacy `egizia` in VirgoStars refers to Swiss house code **V** (Vehlow), but the historic `houses_pos` call may use a separate **P** mode and southern-hemisphere policy. The ascendant-centred geometry here **must not** automatically replace the legacy chart or claim per-body house-placement parity. Preserve separate explicit method profiles and compare controlled synthetic fixtures before building any adapter. No automatic austral rotation, no birth-time inference and no sidereal conversion are performed.

## Astronomical and release boundary

An external validated Rust/WASM VirgoStars Ephemeris provider must supply actual Ascendant coordinates. The input metadata is *caller-asserted*; `validation: 'CALLER_ASSERTED_ASCENDANT_NOT_INDEPENDENTLY_VERIFIED'` is mandatory. A real calendar instant, versioned engine/kernel/time model, apparent geocentric ecliptic-of-date convention and a topocentric observer are required by this experimental input contract; observer calculations themselves remain upstream. Geographic poles are rejected. The routine performs no Swiss call, star or sunrise calculations, private database access, interpretation, AI or production migration. Its private package subpath is `astrological-functions/vehlow-houses`.

## Repeatable checks

```sh
node --test test/vehlow-houses.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/vehlow-houses.test.ts
npm test
```

Full authenticated repository tests and independent real-kernel/legacy comparisons are still outstanding. Publication requires provenance/license review and preserved VirgoStars project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
