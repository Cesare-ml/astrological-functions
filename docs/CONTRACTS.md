# Contracts — functions ↔ ephemeris ↔ consumers (proposal)

Status: **DESIGNED**, subject to scientific validation and consumer needs. This document describes a public-facing design idea, **not implemented package exports**.

## Primary principle

`astrological-functions` depends on the validated, pinned release of `virgostars-ephemeris`. Keep an injected provider interface so unit tests can run without astronomical data, and so implementation does not expose file reading or Swiss details.

```ts
interface EphemerisProvider {
  version: string;
  getGeocentricEcliptic(input: {
    datetimeUtc: string; // timezone explicit, validated
    bodyId: string;
    kernelSetId: string;
    reference: "OF_DATE";
    corrections: "GEOMETRIC" | "APPARENT";
  }): Promise<{
    longitudeDeg: number; latitudeDeg: number;
    longitudeSpeedDegPerDay?: number;
    distanceAu: number;
    metadata: { engineVersion: string; kernelSetId: string; frame: string; corrections: string; };
  }>;
  getHouseAstronomy?(input: {
    datetimeUtc: string; latitudeDeg: number; longitudeDegEast: number;
  }): Promise<{ armcDeg: number; obliquityDeg: number; ascendantDeg: number; mcDeg: number }>;
}
```

`getHouseAstronomy` is a **design decision candidate**: the current preferred boundary is for the ephemeris to supply astronomy primitives (sidereal time, true obliquity, geometric angle inputs), and the functions package to implement house algorithms; no one should assume every house method requires exactly these four inputs.

## Canonical calculation options (proposal)

```ts
type AstrologyOptions = {
  zodiac: { type: "TROPICAL" | "SIDEREAL"; ayanamsaId?: string };
  houseSystem: "VEHLOW" | "PLACIDUS" | "KOCH" | "REGIOMONTANUS" | "PORPHYRY";
  birthTimeKnown: boolean;
  southernHemispherePolicy: "NONE" | "VIRGOSTARS_LEGACY_AUSTRAL_INVERSION";
  aspectSetId: string;
  calculationProfile: "CANONICAL_V1" | "VIRGOSTARS_LEGACY_V1";
};
```

A UTC instant and geographic latitude/longitude are separate from location label or user account. Any sidereal option requires a declared, versioned ayanamsa. Ephemeris validity and correction models propagate unchanged into the result.

## Canonical result metadata (proposal)

```json
{
  "contract": "NatalChartResult",
  "contractVersion": "PROPOSED_1",
  "calculationProfile": "CANONICAL_V1",
  "methodVersion": "TO_BE_SET",
  "ephemeris": {
    "engineVersion": "TO_BE_SET",
    "kernelSetId": "TO_BE_SET",
    "timeModel": "TO_BE_SET",
    "corrections": "TO_BE_SET"
  },
  "warnings": []
}
```

This is a **shape proposal, not a real result**. Existing VirgoStars `NatalChartResult v0.2.0` remains an active isolated legacy application contract. Build adapters rather than silently changing fields.

## Independent functions (candidate)

- `normalize360`, `signedAngularDistance`, `angularSeparation`
- `calculateAspects` with named angles, orb limits, phase/parallel criteria
- `calculateHouseCusps`, `locateLongitudeInHouses` with named house policy
- `calculateNatalChart`, `calculateSynastry`, `calculateTransitToNatal`
- `findSolarReturn`, `findLunarReturn`, `findIngress`, `findAspectHits`
- `classifySynodicPhase`, `calculatePlanetaryHours`

## Direction and semantic contracts

- `A_TO_B` is not interchangeable with `B_TO_A` for overlays, even if an aspect angle is symmetric.
- `SKY_TO_NATAL` is distinct from natal-to-sky; no implicit current-city rising sign if only geocentric transit aspects are supported.
- `longitudeSpeed` direct/retrograde/stationary `!=` `synodicMotion` D1/R2/R3/D4.
- `birthTimeKnown=false`: house-based facts must be unavailable or flagged, not invented.
- `VIRGOSTARS_LEGACY_V1` preserves legacy `egizia`/Vehlow label and southern-hemisphere rotation **only** when explicitly requested, with separate tests.
- House cusp exactly on boundary requires a deterministic documented rule; no silent rounding.
- Output "interpretation keys" may be stable identifiers, but **no prose or statistical claim of astrological causation** inside numeric contracts.

## Consumer compatibility

Stage API changes as versioned pure functions; route production via backend compatibility layer. Renderer uses positions and aspect facts provided; backend separately enriches with any private knowledge.


## Ephemeris E3 dependency — 9 November 2026

`virgostars-ephemeris` now has experimental `projectGeometricJ2000` and `solveOneWayLightTime`. They provide an **approximate mean ecliptic J2000 geometric projection** and a **light-time-only retarded vector**, respectively. Neither satisfies `EphemerisProvider.getGeocentricEcliptic` for `APPARENT/ECLIPTIC_OF_DATE`. Do NOT relax `calculateNatalWithProvider`'s current metadata checks or reinterpret these as the positions of a real tropical natal chart.

The dependent milestone is [Ephemeris E3 issue #4](https://github.com/Cesare-ml/virgostars-ephemeris/issues/4), itself blocked on official real-kernel validation [issue #3](https://github.com/Cesare-ml/virgostars-ephemeris/issues/3). `astrological-functions` remains on a mock ephemeris until both precision and semantics are demonstrated. No code or production behavior changes implied.


## IAU 2006 mean precession available upstream — 2026-11-09

The public Ephemeris PR #1 now includes independent IAU 2006 P03 bias+precession and geometric **MEAN_ECLIPTIC_OF_DATE** projection. Its numerical matrix/mean obliquity formulas were tested against ERFA conformance reference values: **5/5 new tests passed** on Node 22, maximum observed absolute matrix-element error ~1.1e-16; see [IAU 2006 benchmark](https://github.com/Cesare-ml/VirgoStars-Ephemeris/blob/docs/astrology-engines-foundation-20261109/docs/IAU2006_MEAN_PRECESSION.md).

This is **not** true/apparent ecliptic of date. It intentionally omits nutation, aberration, and date-frame rates. **Do not change** `calculateNatalWithProvider` to accept `MEAN_ECLIPTIC_OF_DATE/GEOMETRIC` as `ECLIPTIC_OF_DATE/APPARENT`. The public Ephemeris SPK parser still awaits genuine NASA DE440s scientific validation; the 5 new precession tests do not close that gate. All production integration remains deferred.


## Ephemeris IAU 2000B true-of-date capability — 9 November 2026

The public ephemeris PR #1 adds a complete IAU 2000B 77-term nutation series, including ERFA/BSD numerical data attribution, and `GEOMETRIC/TRUE_ECLIPTIC_OF_DATE` projection in an explicit approximate IAU 2006/2000B combination. Independent JS mathematical checks against ERFA `nut00b` and `num00b` passed at approximately 1e-20 radians and 5.6e-17 matrix-element residuals. Five new Node cases were added but were not rerun with the full test suite.

This still **does not satisfy** `calculateNatalWithProvider` (which requires Earth-centered `APPARENT/ECLIPTIC_OF_DATE` with consistent reference model, light time and aberration). Do not infer longitudinal motion or station state from `velocityKmPerSec:null`. Maintain the strict rejection in the adapter until the upstream real NASA kernel, apparent correction and rate validation gates (#3 and #4) pass.

## Isolated provider boundary checkpoint — 2026-11-10

The experimental runtime `calculateNatalWithProvider` still requests only
`APPARENT/ECLIPTIC_OF_DATE` Earth-centered states. The new
`src/ephemeris-provider.d.ts` records the current TypeScript boundary for a
future Rust/WASM adapter; it is **not** a claim that upstream already implements
that interface. The existing JavaScript runtime rejects provider latitude
outside [-90, 90] and nonfinite supplied longitude speed rather than silently
turning a malformed speed into an unavailable value. Missing/null speed remains
unavailable (null). These checks do not establish astronomical accuracy.
House computation remains unavailable. Preserve visible project attribution:
[VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## UTC calendar validation checkpoint — 2026-11-10

The experimental `calculateNatalWithProvider` entry point now rejects calendar
rollovers that JavaScript `Date.parse` may normalize (such as February 30 or
24:00), before making any ephemeris call. It requires explicit UTC `Z`,
valid calendar/clock fields, and retains fractional-second inputs. Leap-day
cases are covered by synthetic-provider regression tests in
`tests/utc-validation.test.mjs`. This is input-contract hardening, **not**
scientific validation or a claim of a real Rust/WASM provider. The actual
astronomical engine remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris),
subject to its separate apparent-of-date validation gates.

## Body-name map safety — 2026-11-10

The isolated natal result stores body names in a null-prototype, frozen lookup
object. This preserves arbitrary provider body identifiers such as `__proto__`,
`constructor`, and `toString` as ordinary own properties, without prototype
mutation or accidental inherited lookups. The result remains JSON serializable;
consumers must not assume `result.bodies` inherits `Object.prototype`.
This is a structural boundary hardening, not astronomical validation.
The Rust/WASM ephemeris remains the sole future astronomy engine; visible
[VirgoStars project credit](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
is retained.

## Asynchronous natal input stability — 2026-11-10

The experimental natal assembler snapshots the validated `bodyNames` array before
awaiting provider calls. A caller mutating the original array during an async
request cannot silently change the requested body set, call order, or result
keys. This protects the TypeScript/Rust-WASM provider boundary without adding
astronomical calculations. The snapshot does **not** make the provider itself
immutable or establish scientific accuracy. A synthetic regression test lives
in `test/body-list-snapshot.test.mjs`; native Node execution is still required.
The sole planned astronomical backend remains
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Readonly body-list contract — 2026-11-10

`NatalInput.bodyNames` accepts a TypeScript `readonly string[]` and a frozen JavaScript array. The natal assembler copies and freezes the validated list before the first asynchronous provider request; it never mutates the caller's array. This is defensive input ownership only, not a new astronomical capability. The synthetic regression in `test/body-list-snapshot.test.mjs` covers frozen input and asynchronous mutation. Native `npm test` and TypeScript compilation have not been run in this connector-only change. Rust via [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole planned astronomy engine.


## Immutable provider request objects — 10 November 2026

The isolated `calculateNatalWithProvider` prototype passes a fresh, frozen request object to `getGeocentricEcliptic` for each body. This prevents a provider adapter from accidentally rewriting the requested body, UTC instant, `APPARENT` correction mode or `ECLIPTIC_OF_DATE` frame in place. Providers should treat requests as read-only and construct a separate object for any internal transformation. The synthetic regression is `test/provider-request-immutability.test.mjs`; this does **not** establish compatibility with a real Rust/WASM adapter or scientific accuracy. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended astronomical engine.

## Immutable natal warning records — 10 November 2026

The isolated natal assembler freezes each warning object as well as the warning array, so consumers cannot accidentally rewrite the `houses_unavailable` code in a shared result. `test/natal-warning-immutability.test.mjs` provides a synthetic regression. This is an API integrity guarantee only; house calculations remain unavailable and no astronomical accuracy is implied. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole planned Rust astronomy engine.

## Per-chart ephemeris provenance consistency — 2026-11-10

The experimental natal assembler rejects mixing planetary results from different
`engineVersion`, `kernelSetId` or `timeModel` metadata in one result. Each
optional field must be a nonempty string when present; missing/null and
present values cannot be mixed across bodies. Providers that omit all three
fields for all bodies (including existing synthetic mocks) remain compatible.
Matching is exact, without normalization or implicit fallback. The rejection
code is `INCONSISTENT_EPHEMERIS`; malformed populated values yield
`INVALID_EPHEMERIS_RESULT`. This is a provenance/contract safeguard, **not**
a proof of astronomical accuracy or a requirement that a real Rust/WASM
adapter is already available. Synthetic coverage is in
`test/provider-provenance-consistency.test.mjs`.
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the sole planned astronomical engine.

## Natal-level provenance snapshot — 2026-11-10

The experimental natal result now exposes a frozen `ephemerisProvenance`
object with `engineVersion`, `kernelSetId`, and `timeModel` (each string or
`null`). It reflects the already-validated consistent provenance across
requested bodies, without requiring chart consumers to inspect each body.
Missing provenance remains explicitly `null`, never inferred. This is an
additive **experimental** result field, not a scientific validation of
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
or a production integration.

## Readonly Rust/WASM provider boundary — 2026-11-10

The experimental TypeScript contract now exports `EphemerisRequest` with
readonly request fields; `EphemerisProvider` consumes this readonly input.
This matches the runtime's per-body frozen requests. Returned ephemeris
metadata and natal warning records are also typed as readonly snapshots,
consistent with their runtime freezing. A strict TypeScript negative fixture
at `test/types/provider-readonly.test.ts` asserts that mutation is rejected
at compile time. Execute with:
`tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/provider-readonly.test.ts`.
This is API boundary hardening only, not scientific validation of a real
Rust/WASM adapter. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the sole intended astronomical engine.

## UTC subsecond precision guard — 2026-11-10

The experimental natal input currently accepts an explicit UTC `Z` timestamp
with zero to **three** fractional second digits (millisecond precision).
JavaScript `Date` silently truncates additional fractional digits; accepting
nanosecond-like input without a versioned higher-precision time contract would
risk incorrect chart instants at the Rust/WASM boundary. Values with four or
more fractional digits therefore fail with `INVALID_UTC` **before** any
provider call. Existing whole-second and 1–3 digit inputs are unchanged.
Future sub-millisecond support requires an explicit, tested time representation
agreed with [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris),
not silent truncation. This is contract validation, not astronomical accuracy.

## House-system identifier compatibility (isolated) — 2026-11-11

The pure `resolveHouseSystem({houseSystem, calculationProfile})` helper
normalizes **identifiers only**, without computing cusps, angles, or any
astronomical quantity. Canonical identifiers are `VEHLOW`, `PLACIDUS`,
`KOCH`, `REGIOMONTANUS`, and `PORPHYRY`. The explicit
`VIRGOSTARS_LEGACY_V1` profile additionally recognizes historical labels
`egizia`→`VEHLOW`, `placido`→`PLACIDUS`, `koch`→`KOCH`,
`regio-montano`→`REGIOMONTANUS`, and `porfirio`→`PORPHYRY`.
The `CANONICAL_V1` profile rejects those aliases; missing profiles, unknown
systems, and inherited JavaScript property names are rejected explicitly.
The result is immutable. This does **not** implement the historical
`houses_pos` semantics, southern hemisphere inversion, polar behavior or
any house-cusp algorithms. Those remain separate validation gates.
The astronomical backend remains Rust via
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## House-system option validation — 2026-11-11

`resolveHouseSystem` now rejects null, undefined, primitive and array inputs
with the stable `AstrologyError` code `INVALID_ARGUMENT`, rather than
leaking a JavaScript destructuring `TypeError`. Existing explicit canonical
and VirgoStars legacy mappings remain unchanged; the helper still does **not**
calculate house cusps, reproduce legacy `houses_pos`, or introduce astronomy.
Synthetic regression: `test/house-system-compatibility.test.mjs`.
Astronomical computation remains exclusively with
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) (Rust).
