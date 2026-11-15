# Solar event snapshot adapter — experimental F5 handshake

Status: **IMPLEMENTED_ISOLATED**, 13 November 2026. This is a **candidate TypeScript/ESM consumer contract**, not an existing interface of the Rust VirgoStars Ephemeris engine. The upstream Ephemeris [proposed API contracts](https://github.com/Cesare-ml/VirgoStars-Ephemeris/blob/main/docs/API_CONTRACTS.md) list `findRiseSet` only as a later proposal; no compatible validated Rust event API or consumer bindings were established by this change.

## Responsibility boundary

- **VirgoStars Ephemeris (future)**: astronomically derive local sunrise, sunset and next sunrise for a specified observer using a documented target/frame/solar-limb/horizon/refraction algorithm, kernel, time scale and range. Independently validate against matched astronomical reference data.
- **Astrological Functions (this experimental adapter)**: validate a caller-supplied candidate snapshot, keep its metadata explicitly marked unverified, then delegate unequal symbolic hour division to the existing `buildPlanetaryHours` implementation.
- **Application**: calculate the **local civil weekday at sunrise** using a specified timezone and civil calendar; do not substitute the UTC weekday. Enforce provenance/trust and legal/credit policies at its own integration boundary.

No direct Rust call, fake solar calculation, geographic timezone inference, network access, file I/O, user account data, Swiss dependency or personalized interpretation is added.

## Candidate input schema

```js
import { preparePlanetaryHoursFromSolarEvents } from '../src/planetary-hours-solar-adapter.mjs';

const result = preparePlanetaryHoursFromSolarEvents({
  weekday: 'SUNDAY', // asserted local civil weekday at sunrise
  observer: {
    latitudeDeg: 44.8, longitudeDegEast: 11.9, elevationMeters: 12,
  },
  model: {
    horizonDefinitionId: 'GEOMETRIC_CENTER_MINUS_0_833',
    refractionModelId: 'NONE',
    eventAlgorithmId: 'SYNTHETIC_TEST_ONLY',
  },
  source: {
    engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: '0.0.0-test',
    kernelSetId: 'SYNTHETIC',
    timeModelId: 'UTC_SYNTHETIC',
    evidence: 'CALLER_ASSERTED_NOT_VERIFIED',
  },
  events: {
    availability: 'AVAILABLE',
    sunriseUtc: '2026-11-15T06:00:00Z',
    sunsetUtc: '2026-11-15T18:00:00Z',
    nextSunriseUtc: '2026-11-16T06:00:00Z',
  },
});
```

**Important:** The example's source and events are **synthetic**. Identifiers are not authenticated signatures and the adapter cannot determine whether VirgoStars, a mock, or another caller actually produced them. Setting `engineId` is never evidence of scientific validation or trustworthy provenance. The returned result explicitly contains `scientificEvidence: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED'`, and its nested schedule retains `sunEventsEvidence: 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED'`.

All five top-level keys are mandatory; nested observer, model, source and event records must have exactly their declared own enumerable string fields, with ordinary/null prototypes. Observer values must be finite, with latitude within ±90°, east longitude within ±180° and elevation between -500 m and 10,000 m (experimental interface policy, **not a scientific validity bound**). All model/source IDs are bounded ASCII identifiers. Event shape is a strict discriminated union. `AVAILABLE` requires three UTC instants; the underlying scheduler verifies strict chronology and divides into 12+12 hours. `UNAVAILABLE` requires `reason: 'POLAR_DAY' | 'POLAR_NIGHT' | 'SUN_EVENTS_UNAVAILABLE'` and **no** timestamps or fabricated hours.

The result and its copied observer, model, source and nested schedule are frozen; mutating the input later does not change the result. `SolarEventAdapterError` marks invalid input/observer/model/source/event records; the delegated `PlanetaryHoursError` handles weekday, UTC date and sun-event chronology errors.

## Known gaps before real integration

1. Review this **candidate** event snapshot shape against the actual future Rust/WASM binding, with stable event capability, observer convention, solar-limb/horizon/refraction details and date/time scale IDs. This handshake does **not** imply that an upstream `getSolarEvents` or `findRiseSet` method ships today.
2. Independently validate authentic solar events and polar behavior, using pinned ephemeris kernels, observer coordinates and matched external reference settings; specify tolerances. Synthetic examples cannot establish scientific accuracy.
3. Define the owning application's IANA timezone, civil-calendar date and local weekday verification, including DST and crossings of UTC midnight. This adapter does not validate the asserted weekday.
4. Decide how to authenticate/match producer metadata and reject untrusted clients. Currently all provenance is an **assertion**, and no attested/verified mode is supported.
5. Review package exports, end-to-end consumer tests, licenses, provenance/privacy and mandatory VirgoStars credits before any release or integration into the real VirgoStars application.

## Validation and test receipts

- Strict-mode isolated V8 execution of the actual Github `.mjs` code with minimal `node:test` / `node:assert` shims on 13 Nov 2026: **10/10 adapter test cases passed**. This is **not** a native Node.js `npm test` or astronomical comparison.
- Native TypeScript **5.8.3**: `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/planetary-hours-solar-adapter.test.ts` **passed**, in a locally reconstructed declaration + fixture workspace. All three declaration/fixture files used matched GitHub blob hashes exactly.
- The prior PR #38 reported 28/28 native Node.js tests in a separate reconstruction *before this new module was added*. **Do not count the new 10 V8 cases as an executed native 38/38 suite.** A full authenticated checkout and native `npm test` are still required before merging.

Experimental direct-file import only; `package.json`, `src/index.mjs`, production routes and any upstream Ephemeris code are unchanged. No GitHub Actions, package publication, merge, deploy, visibility or license changes.

VirgoStars project: https://www.virgostars.it/
