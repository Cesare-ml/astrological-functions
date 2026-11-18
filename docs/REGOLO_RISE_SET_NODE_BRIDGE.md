# Regolo lots — VirgoStars Node rise/set bridge (experimental)

Status: **IMPLEMENTED_ISOLATED**, 18 November 2026; tested against a synthetic
mock of the upstream Node method, **not** a loaded Rust native addon.

The opt-in entrypoint
`astrological-functions/regolo-lots-rise-set-bridge` provides
`calculateRegoloLotsFromVirgoStarsRiseSet(input)`. Unlike the separately
provided *caller-asserted Sun altitude* bridge, it actively calls the
**existing** `VirgoStars-Ephemeris` Node `Engine.riseTransUt` API to find the
most recent sunrise and sunset around a supplied birth instant. The API was
checked against upstream `bindings/node/index.d.ts`, `bindings/node/index.js`
and `docs/MVP2_HORIZON_EVENTS_2026-11-16.md` on `main` (18 November 2026).

## Astronomical convention and gates

- `ipl = 0` (Sun) and `rsmi = 1 | 256` (rise) or `2 | 256` (set), using the
  upstream `SE_BIT_DISC_CENTER` option. No `SE_BIT_NO_REFRACTION` is passed:
  this is the **apparent refracted centre** crossing the astronomical horizon,
  not the rising/setting *edge* of the solar disc.
- The upstream solver includes a topocentric observer, horizon refraction and
  declared pressure/temperature. `pressureHpa: 0` invokes upstream pressure
  estimation. This adapter does **not** calculate astronomical positions,
  local terrain obstruction, celestial limb size or solar altitude.
- The caller must explicitly provide an ISO UTC birth time, `UT1−UTC` seconds,
  observer latitude/longitude/elevation, atmospheric parameters, a
  `boundaryUncertaintySeconds` (1–300), known birth time and complete natal
  positions. UTC is converted to UT1 Julian date for the native API. Source
  engine version, DE441/kernel identity and time policy remain **caller
  assertions**, because `riseTransUt` returns only a Julian date or `null`,
  without authenticated binary/source metadata.
- The adapter looks backward 2.25 days and searches forward for solar rises
  and sets (maximum three days per native call). The **most recent** event
  decides the sect: rise → `DAY`, set → `NIGHT`. If either event is missing,
  the result is **`SECT_UNAVAILABLE`** (including high-latitude polar cases).
  At or within the caller-declared uncertainty of a rise or set it returns
  **`AMBIGUOUS_SECT`** rather than guessing. This intentionally excludes
  extreme or long-term polar daylight classifications.
- A separately sourced, exact latest-preceding new Moon is still needed for
  the dependent Arabic parts. If unavailable, specify
  `{availability:'UNAVAILABLE',reason:'NOT_COMPUTED'}` and only parts needing
  `NEW_MOON` become unavailable. **Current Moon longitude is never substituted.**
- `TROPICAL` is the only accepted zodiac in this bridge. Never mix a sidereal
  natal chart, different planet frame, or unverified Ascendant.

## Actual Node-binding-shaped example

```js
import { Engine } from 'virgostars-ephemeris'; // resolve via your own pinned Node dependency
import { calculateRegoloLotsFromVirgoStarsRiseSet } from
  'astrological-functions/regolo-lots-rise-set-bridge';

// Illustrative shape only: supply a real validated DE441 path, native addon,
// natal chart and UT1-UTC value from your own integration. Do not run as-is.
const engine = new Engine('/absolute/path/to/verified/de441.eph');
const result = calculateRegoloLotsFromVirgoStarsRiseSet({
  engine,
  datetimeUtc: '2026-11-18T12:00:00Z',
  ut1MinusUtcSeconds: 0, // DEMONSTRATION, not an observed DUT1 value
  observer: {latitudeDeg: 44.8, longitudeDegEast: 11.6, elevationMeters: 12},
  expectedEphemeris: {engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'must-pin-real-git-commit', kernelSetId: 'must-pin-real-kernel',
    timeModelId: 'must-pin-real-time-policy'},
  solarModel: {pressureHpa: 1013.25, temperatureC: 15,
    boundaryUncertaintySeconds: 120},
  natal: {birthTimeKnown: true, zodiac: 'TROPICAL',
    chartContextId: 'synthetic-natal-must-be-replaced', ascendantLongitudeDeg: 350,
    planetsLongitudeDeg: {SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
      MARS: 160, JUPITER: 200, SATURN: 260}},
  precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'},
});
// result.sect: 'DAY' | 'NIGHT'
// result.kleroi.kleroi: nine Regolo entries
// result.arabicParts.entries: 92 entries, possibly partly unavailable
```

The code above is an interface illustration, **not an actual numerical
ephemeris calculation or an import-path guarantee for the unpublished Rust
package**. In a real consumer import `Engine` from the separately verified
installed Node binding. The dependency must be resolved and its original
Git commit, native addon digest, DE441 kernel and time model pinned outside
this library.

## Verification and outstanding release gates

```sh
node --test test/regolo-lots-rise-set-bridge.test.mjs
# Separately installed TypeScript compiler is required:
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext \
  test/types/regolo-lots-rise-set-bridge.test.ts
```

The local mock tests exercise exact `riseTransUt` argument flags, day and
night, uncertainty boundaries, UT1 offset, polar/missing events, malformed
return values, source mismatches, sidereal rejection and 92-part availability.
They **do not** demonstrate a compiled real Rust addon or numeric accuracy.

Remaining work: verify the real addon and binary SHA-256, compare event times
and sect to independently sourced astronomy at several latitudes and horizon
crossings, validate leap-second/DUT1 provenance, establish a versioned
new-Moon event producer, check physical natal positions and Ascendant/house
provenance, run strict typechecking plus Desktop/Mobile/backend shadow tests.
No npm publication, production switch, GitHub Actions or automatic merge.
