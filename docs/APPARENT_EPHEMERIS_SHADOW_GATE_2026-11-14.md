# Opt-in apparent-position shadow comparison — 2026-11-14

**Status:** isolated Node ESM integration utility, synthetic tests only. **No new astronomy algorithm, Swiss dependency, production hook, package export or real ephemeris parity result.**

`src/ephemeris-parity.mjs` exports `compareApparentEphemerisProviders`. Two independently configured providers expose `getGeocentricEcliptic({ datetimeUtc, bodyName, frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' })`. This is the same injected boundary used by `calculateNatalWithProvider` in `src/index.mjs`.

Both providers **must** return **six** numeric values: `longitudeDeg`, `latitudeDeg`, `distanceAu`, `longitudeSpeedDegPerDay`, `latitudeSpeedDegPerDay`, `distanceSpeedAuPerDay`, plus metadata `{center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',engineVersion,kernelSetId,timeModel}`. Every number must be finite, distance positive, longitude within `[0,360)` and latitude within `[-90,90]`. Missing or geometric J2000 data cause an error, never a fallback. The input UTC validator rejects impossible calendar dates such as February 30 and cannot represent leap-second `:60` timestamps; that limit must be addressed explicitly before claiming full time-scale compatibility.

Caller supplies *explicit, justified* nonnegative tolerances for **all six** output fields: `longitudeArcsec`, `latitudeArcsec`, `distanceAu`, `longitudeSpeedArcsecPerDay`, `latitudeSpeedArcsecPerDay`, `distanceSpeedAuPerDay`. The versioned result contract is `APPARENT_EPHEMERIS_PARITY_V2` and contains signed circular longitude and signed differences for the other five quantities, per-body PASS/FAIL. A PASS means **only that the two supplied providers agree within caller-chosen thresholds**; it is not scientific validation of either provider. The utility retains source metadata for audit and never reads databases, calls Swiss, downloads kernels or modifies production.

Example, with externally supplied providers (no implementation assumed):

```js
import { compareApparentEphemerisProviders } from './src/ephemeris-parity.mjs';
const report = await compareApparentEphemerisProviders({
  datetimeUtc: '2026-01-01T00:00:00Z',
  bodyNames: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
  referenceProvider, candidateProvider,
  // Not example numerical recommendations: establish independently justified budgets first.
  tolerances: approvedScienceBudget,
});
if (report.status !== 'PASS') throw new Error('Parity not established');
```

Field mapping for an external legacy adapter: Swiss `longitude`, `latitude`, `distance`, `longitudeSpeed`, `latitudeSpeed`, `distanceSpeed` map to the six fields above, preserving degrees, AU, degrees/day and AU/day and the actual correction flags. **Important:** VirgoStars legacy `getPianetiCase` additionally computes a *separately sampled* latitude-speed estimate; matching raw Swiss six-field speeds does not by itself certify that application-specific derived value.

The wrapper around the legacy backend remains **outside** this package; it must label actual Swiss settings honestly (no impersonation). The candidate may use VirgoStars-Ephemeris **only after** its apparent-of-date pipeline, stable Rust-backed JS/WASM bridge and independently verified kernel provenance exist. Current geometric SPK Type-2/3 states **cannot** satisfy this comparison. No public consumer or Astrolabio should be switched by this change.

Local isolated regression command (from repository root):

```sh
node --test test/ephemeris-parity.test.mjs
npm test
```

Twelve synthetic cases were executed against the fetched source/test logic in an isolated JavaScript V8 runtime on 2026-11-14 (12/12 passed), including rejection of impossible civil UTC dates that `Date.parse` otherwise normalizes silently and preservation of valid fractional seconds. The V8 harness used local substitutes for Node test/assert; **this is not a native `node --test` or `npm test` execution**. These tests use synthetic positions and mock providers only. Separate release gates: official NASA/JPL/NAIF matching vector validation; independent apparent correction & rate comparisons; UTC/UT1/TT/TDB and ΔT; lunar special points/Chiron; Vehlow/Placidus/Koch/Regiomontanus/Porphyry houses; representative natal and current-sky outputs; backend shadow/staging with rollback and Astrolabio QA. No use of private birth records in committed fixtures. Keep VirgoStars attribution requirements when a real Rust-backed adapter becomes deployable.
