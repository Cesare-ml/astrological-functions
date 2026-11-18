# Regolo lots — astronomical facts adapter

Status: **IMPLEMENTED_ISOLATED**, 18 November 2026. This is a **caller-asserted
fact handshake**, not a live `VirgoStars-Ephemeris` integration and not
independently verified astronomy.

The opt-in ESM subpath
`astrological-functions/regolo-lots-astronomy-bridge` exposes
`calculateRegoloLotsFromAstronomicalFacts`. It calls the existing nine-kleroi
and 92 Arabic-part pure functions **only after** checking a supplied horizon
snapshot and a separately supplied new-Moon event. There is no Swiss
dependency, network call, birth-record storage, application change or automatic
fallback.

## Required source facts

1. An actual birth UTC instant with second precision and `Z`, a location
   (latitude, east longitude, elevation) and a **known birth time**.
2. Seven traditional natal planet longitudes and a real Ascendant with common
   chart identity. This first bridge only accepts the explicit `TROPICAL`
   profile; it does not infer or project sidereal coordinates.
3. `expectedEphemeris` with `engineId: VIRGOSTARS_EPHEMERIS` and exact pinned
   `engineVersion`, `kernelSetId` and `timeModelId`.
4. `sunHorizon` with exactly the same pin, UTC instant and observer, explicit
   `APPARENT_SUN_CENTER_TOPOCENTRIC` altitude, `horizonAltitudeDeg`, named
   `horizonModelId`, numeric `uncertaintyDeg` and an empty warning list.
   The caller's horizon model defines the chosen refraction/limb/obstruction
   convention. **No fixed -0.833° sunrise shortcut** is assumed.
5. `precedingNewMoon` must be either an explicit `UNAVAILABLE` reason or a
   matching pinned `LATEST_PRECEDING_NEW_MOON` event with UTC time no later
   than birth and at most 31 days earlier, apparent Earth-centered tropical
   ecliptic-of-date Moon longitude and no unresolved warnings.

## Sect and missing-data policy

Let `clearanceDeg = sunAltitudeDeg - horizonAltitudeDeg`:

- Clearance **greater than** the caller-declared `uncertaintyDeg` → `DAY`.
- Clearance **less than** its negative → `NIGHT`.
- Otherwise **`AMBIGUOUS_SECT` error**; kleroi/parts are not calculated.

If the new-Moon event is unavailable, all nine kleroi still calculate and
only the dependent Arabic parts report `UNAVAILABLE_MISSING_INPUT`. The
original Regolo new-Moon solver starts searching backward from the chart
instant, but its iterative astronomical correctness and selection of the
*latest* conjunction are **not** verified by this adapter. The 31-day test
is only a coarse temporal guard, not proof of the correct event. The bridge
also cannot verify that the natal angles and longitudes were genuinely
computed by the named engine; the result includes explicit caller-asserted
warnings to prevent that inference.

## Example (synthetic data, not actual ephemerides)

```js
import { calculateRegoloLotsFromAstronomicalFacts } from
  'astrological-functions/regolo-lots-astronomy-bridge';

const pin = {
  engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'synthetic-1',
  kernelSetId: 'synthetic-kernel', timeModelId: 'synthetic-time',
};
const observer = {latitudeDeg: 44.8, longitudeDegEast: 11.6, elevationMeters: 12};
const datetimeUtc = '2026-11-18T12:00:00Z';
const result = calculateRegoloLotsFromAstronomicalFacts({
  datetimeUtc, observer, expectedEphemeris: pin,
  natal: {
    birthTimeKnown: true, zodiac: 'TROPICAL', chartContextId: 'synthetic-001',
    ascendantLongitudeDeg: 350,
    planetsLongitudeDeg: {SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
      MARS: 160, JUPITER: 200, SATURN: 260},
  },
  sunHorizon: {...pin, datetimeUtc, observer,
    altitudeType: 'APPARENT_SUN_CENTER_TOPOCENTRIC',
    horizonModelId: 'SYNTHETIC', sunAltitudeDeg: 8,
    horizonAltitudeDeg: 0, uncertaintyDeg: 0.01, warnings: []},
  precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'},
});
// result.sect === 'DAY'; result.kleroi.kleroi.TYCHE.longitudeDeg === 60
// The two new-Moon-dependent Arabic parts remain explicitly unavailable.
```

## Remaining gates

- Implement a real pinned `VirgoStars-Ephemeris` producer for apparent
  topocentric Sun altitude, quantified uncertainty and corresponding horizon
  model. Independently compare horizon/sect outcomes, including sunrise,
  sunset, high latitudes and a horizon crossing.
- Deliver real apparent Sun–Moon conjunction timestamps and the correct
  lunar longitude at each event, with explicit latest-preceding selection and
  reference comparison. Do not substitute a current Moon longitude.
- Verify all seven natal planet coordinates, chart Ascendant, house cusps,
  zodiac transformations, source identity and end-to-end consumer agreements.
- Run strict NodeNext/Bundler TypeScript checks (fixture added but not run
  when `tsc` is unavailable), Desktop/Mobile/backend shadow parity and rights
  review. No production deployment, GitHub Actions or npm publication.

```sh
node --test test/regolo-lots-astronomy-bridge.test.mjs
# Requires an installed TypeScript checker; not part of npm test:
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/regolo-lots-astronomy-bridge.test.ts
```
