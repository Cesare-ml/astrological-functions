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

## Explicit house-placement method gate — 2026-11-11

`resolveHousePlacementPolicy` accepts an explicit `CUSP_INTERVAL` method
and returns a frozen normalized identifier/profile/method tuple. It delegates
identifier validation to `resolveHouseSystem`. The historical
`LEGACY_HOUSES_POS` method is **not** treated as equivalent to cusp
intervals: in the legacy profile it fails closed with
`UNSUPPORTED_HOUSE_PLACEMENT`, while canonical-profile requests fail with
`INVALID_HOUSE_PLACEMENT`. Missing/unknown methods also fail explicitly.
This is a compatibility guard, not a house algorithm, Swiss code port,
or numerical equivalence claim. Synthetic regression coverage:
`test/house-placement-policy.test.mjs`. Future `houses_pos` support
requires independently licensed implementation and verified fixtures.
Astronomy remains solely with Rust via
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Explicit cusp-placement entry point — 2026-11-11

`locateLongitudeWithHousePolicy` composes the existing house-system and
placement-policy guards with the geometric `locateLongitudeInHouses` helper.
It requires a named system, explicit profile and `CUSP_INTERVAL` method;
`LEGACY_HOUSES_POS` still raises `UNSUPPORTED_HOUSE_PLACEMENT` and cannot
silently fall back to geometric cusp intervals. The function takes **already
computed** cusp longitudes and returns an immutable placement with the resolved
system/profile/method; it does not compute cusps, ascendant, sidereal time or
Swiss `houses_pos` behavior. The supplied cusps are not independently certified
as belonging to the named system: callers must obtain and validate those via
the future Rust-backed provider integration. Synthetic tests cover exact cusp,
wrap-around, invalid cusp order and fail-closed legacy behavior.
The sole planned astronomical backend remains
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Explicit external house cusp set boundary — 2026-11-11

`validateHouseCuspSet` is an isolated synchronous guard for a future Rust/WASM
house-cusp payload. It requires the requested house system and calculation profile,
a twelve-cusp forward-order array, and metadata that **explicitly** identifies the
same canonical system and `CUSP_INTERVAL` method. The returned array and metadata
are immutable snapshots. A legacy `egizia` request resolves to `VEHLOW` only
under `VIRGOSTARS_LEGACY_V1`; mismatched metadata raises
`INCOMPATIBLE_HOUSE_SYSTEM`, and `LEGACY_HOUSES_POS` remains unsupported.
No astronomy, cusp computation, house-algorithm parity, or Rust/WASM integration
is implied. This is not yet part of the natal assembler. The future provider must
add validated observer/time/frame/provenance metadata before scientific use.
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the sole intended astronomical engine.

## Cusp context validation — 2026-11-11

`validateHouseCuspContext` requires externally supplied cusps to match a natal
chart's exact UTC timestamp, geographic coordinates, and three nonempty
ephemeris provenance identifiers (`engineVersion`, `kernelSetId`, `timeModel`).
It reuses `validateHouseCuspSet` for forward cusp geometry, declared system
and explicit `CUSP_INTERVAL` method. Mismatches fail closed with
`INCOMPATIBLE_HOUSE_CONTEXT`; missing provenance yields
`INVALID_HOUSE_METADATA`. Outputs are frozen snapshots. Synthetic tests are
in `test/house-cusp-context.test.mjs`. This is **not** an astronomical
calculation, proof of source authenticity, natal house assembly, or real
Rust/WASM integration. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
remains the only planned astronomical engine.


## Separate natal house placement assembly — 2026-11-11

The isolated `placeNatalBodiesInHouses({chart,cuspSet,birthTimeKnown:true})`
helper assigns existing chart body longitudes to externally supplied,
context-validated cusp intervals. It requires an explicitly known birth time,
a nonempty body map and a full matching cusp context (UTC, coordinates and
engine/kernel/time-model provenance). It returns a frozen, separate placement
map rather than mutating the natal chart or fabricating ascendant/MC. A
missing/false birth-time flag fails with `BIRTH_TIME_REQUIRED`; legacy
`houses_pos` still fails closed. This is synthetic geometry, **not** an
implemented Rust/WASM house solver or scientific verification.
Astronomy remains exclusively with
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## House-placement identifier and input regressions — 2026-11-11

`test/natal-house-placement.test.mjs` now covers reserved JavaScript body identifiers (`__proto__`, `constructor`, `toString`) in the null-prototype placement map, plus nonfinite and nonnumeric body longitudes. These are synthetic contract regression cases only; they do not assert astronomical correctness or house-system parity. Run `npm test` in a Node checkout before promoting the PR. Rust via [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the only intended astronomical engine.

### House cusp context option validation (isolated checkpoint)

`validateHouseCuspContext(input)` rejects null, arrays, primitive top-level inputs and missing `chart`/`cuspSet` with `AstrologyError` code `INVALID_ARGUMENT`, rather than exposing a JavaScript destructuring error. This is a contract guard only: it does not calculate cusps or establish scientific compatibility. Synthetic regression cases live in `test/house-cusp-context-input.test.mjs`; native Node and Rust/WASM integration still require validation. Astronomical computation remains solely with [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

### Natal house placement input guard — 2026-11-11

`placeNatalBodiesInHouses` rejects null, arrays and primitive top-level options with typed `AstrologyError('INVALID_ARGUMENT')`, instead of exposing a JavaScript destructuring `TypeError`. A separate regression covers six malformed shapes. This does not alter valid placement semantics, invent cusp values, or implement `LEGACY_HOUSES_POS`. The astronomy source remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) (Rust). Native Node and full TypeScript checks are still required.


## Natal house placement chart-container validation — 2026-11-11

`placeNatalBodiesInHouses` rejects array-shaped chart containers with typed `INVALID_ARGUMENT`, even when a JavaScript array has a custom `bodies` property. Only object-shaped chart records are accepted. Regression: `test/natal-house-placement.test.mjs`. This is a structural validation change, not scientific verification; the native Node suite and Rust/WASM integration still require execution. Astronomy remains exclusively the responsibility of [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Natal provider options input guard — 2026-11-11

`calculateNatalWithProvider` rejects null, missing, primitive and array top-level
options with typed `AstrologyError('INVALID_ARGUMENT')` rather than leaking a
JavaScript destructuring TypeError. Valid object options retain existing explicit
UTC, coordinate, body-list and provider checks. Synthetic regression coverage:
`test/natal-provider-options.test.mjs`. This is an isolated API robustness fix,
not a claim of native test execution or real astronomical integration. Rust
remains the sole planned astronomy engine through
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


### House context shape validation — 2026-11-11

`validateHouseCuspContext` requires plain object-shaped chart and cusp-set containers (arrays are rejected with `INVALID_ARGUMENT`). Chart and cusp-set `ephemerisProvenance` containers must likewise not be arrays (`INVALID_HOUSE_METADATA`). These are structural checks only: matching mock provenance does not establish scientific correctness. Synthetic regression cases are in `test/house-cusp-context-shapes.test.mjs`; native Node execution is still required.

## House provenance array-shape regression — 2026-11-11

`validateHouseCuspContext` now rejects arrays used as either chart-level or cusp-level `ephemerisProvenance` with `INVALID_HOUSE_METADATA`, even if arbitrary named fields have been attached to those arrays. This closes the gap covered by the existing synthetic `test/house-cusp-context-shapes.test.mjs` regression. No astronomical calculation is performed in TypeScript. Native Node.js tests and Rust/WASM scientific integration remain outstanding; the provider must ultimately be backed by [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Cross-aspect options input gate — 2026-11-11

`calculateCrossAspects` now rejects missing, null, primitive, and array-shaped option containers with typed `AstrologyError('INVALID_ARGUMENT')`, rather than allowing an uncontrolled JavaScript destructuring error. Valid object inputs retain existing direction and array validation, including the valid empty-set result. Synthetic regressions are in `test/cross-aspect-options.test.mjs`. Native Node `npm test` and TypeScript verification remain pending; no scientific astronomy validation is claimed. Rust via [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended astronomy engine.

## Provider response container validation — 2026-11-11

The experimental natal assembler rejects array-shaped provider state objects and
array-shaped `metadata` even when named properties imitate a valid apparent
Earth-centered ecliptic-of-date response. Both cases raise the typed
`INCOMPATIBLE_EPHEMERIS` error. Plain object responses retain existing behavior.
Regression coverage: `test/provider-state-shapes.test.mjs` (synthetic provider).
This is structural contract validation only, **not** native test execution,
scientific ephemeris parity or Rust/WASM integration. Rust remains the only
planned astronomy engine; [VirgoStars credits](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Cross-aspect point shape guard — 2026-11-11

`calculateCrossAspects` requires each source and target point to be an ordinary object-like record, not an array with attached `name` and `longitudeDeg` properties. Such arrays raise `AstrologyError('INVALID_POINT')`. Regression coverage: `test/cross-aspect-point-shapes.test.mjs`. This is isolated JavaScript contract validation, not a Rust/WASM or scientific ephemeris integration. Project credit: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Cross-aspect definition input safety — 2026-11-11

`calculateCrossAspects` requires each aspect definition to be a non-array object with a nonempty string `id`, finite `angleDeg` and `maxOrbDeg`, angle in 0..180 and nonnegative orb. Null, primitives and array-shaped definitions (even with attached named properties) fail with typed `AstrologyError('INVALID_ASPECT')` rather than leaking a native `TypeError`. Regression coverage: `test/cross-aspect-definition-shapes.test.mjs`. This is isolated contract hardening only; it adds no astronomy and does not validate a real Rust/WASM provider. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended astronomical engine.


## Individual natal house-placement body shape — 2026-11-11

`placeNatalBodiesInHouses` rejects null, primitive and array-valued individual
body records (including arrays with manually attached `name` properties) with
a typed `INVALID_POINT` error. Each body must be a non-array object with a
`name` equal to its chart map key; longitude validation remains delegated to
`locateLongitudeInHouses`. This guards the isolated TypeScript-facing boundary,
not astronomical correctness. The Rust/WASM provider remains the only planned
astronomical source; [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris)
credit is retained.

## Cross-aspect point type validation — 2026-11-11

`calculateCrossAspects` accepts an optional `type` for each source/target point. When omitted or null it defaults to `body`; when supplied it must be a nonempty string. Numbers, booleans, arrays, objects and whitespace-only strings raise `AstrologyError('INVALID_POINT')` rather than entering the result contract as arbitrary values. This applies equally to both directional point lists. Synthetic regression coverage: `test/cross-aspect-point-types.test.mjs` (native Node test execution pending). This is astrology data-shape validation only: no astronomical algorithms are implemented here. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the planned Rust astronomy engine.

## Provider adapter container shape — 2026-11-11

The isolated `calculateNatalWithProvider` boundary rejects arrays masquerading
as ephemeris provider objects, even if a `getGeocentricEcliptic` function has
been attached to the array. Such input fails before any provider invocation
with `MISSING_PROVIDER`. Ordinary object adapters and callable adapters
with that method remain accepted. Regression:
`test/provider-adapter-shape.test.mjs`. This is JavaScript input-shape
hardening, **not** Rust/WASM integration or scientific validation.
Astronomy remains exclusively the responsibility of
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Provider coordinate error classification — 2026-11-11

The experimental `calculateNatalWithProvider` boundary reports nonnumeric or
nonfinite provider `longitudeDeg` / `latitudeDeg` as
`AstrologyError('INVALID_EPHEMERIS_RESULT')`, rather than the generic
`INVALID_ANGLE` used by public angle-math primitives. Finite longitudes are
normalized modulo 360; finite latitudes outside -90..90 continue to fail as
`INVALID_EPHEMERIS_RESULT`. Regression:
`test/provider-coordinate-errors.test.mjs` (six malformed states, one
valid synthetic control). This does not implement astronomy, prove scientific
parity or authorize integration with a real kernel. The only intended
astronomical engine remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Provider longitude-speed error classification — 2026-11-11

The isolated `calculateNatalWithProvider` adapter rejects a supplied longitude speed that is not a finite JavaScript number with `AstrologyError` code `INVALID_EPHEMERIS_RESULT`, consistent with malformed provider longitude and latitude. Missing (`undefined`) or `null` speed remains unavailable (`null`) in the natal result; finite values, including zero and negative retrograde speeds, are preserved. This is input-contract validation only, not a velocity calculation or proof of Rust/WASM scientific parity. Regression coverage: `test/provider-speed-error-code.test.mjs`. Native `npm test` and TypeScript checks must be run before promotion.


## Sparse natal body identifiers — 2026-11-11

`calculateNatalWithProvider` requires a dense array of 1–32 unique, nonempty body-name strings. JavaScript array holes are invalid (`INVALID_BODIES`), just like explicit `undefined`; the provider must not be called for such requests. This validation is at the TypeScript/JavaScript boundary and does not calculate astronomy. See `test/provider-sparse-body-names.test.mjs` (native Node test execution still required).


## Sparse cross-aspect arrays — 2026-11-12

`calculateCrossAspects` rejects holes in `sourcePoints` and `targetPoints` with `INVALID_POINT`, and holes in `aspectDefinitions` with `INVALID_ASPECT`. Sparse arrays must not silently omit requested work. `Array.from` validates every slot; valid dense arrays retain their prior directional aspect behavior. Regression coverage: `test/cross-aspect-sparse-arrays.test.mjs`. This is pure TypeScript/JavaScript input validation, not astronomical computation; native Node tests remain required before promotion.

## House cusp input validation checkpoint — 2026-11-12

`locateLongitudeInHouses` and `validateHouseCuspSet` require exactly twelve **present, finite numeric** cusp longitudes. Sparse arrays, `undefined`, strings, `NaN`, and infinities now fail with `AstrologyError('INVALID_CUSPS')` rather than being skipped or producing a generic angle error. Existing forward-order and exact-cusp boundary policies remain unchanged. This is a synthetic input-contract guard, **not** a house-system calculation or a scientifically validated Rust/WASM integration. See `test/house-cusp-sparse-validation.test.mjs`.

## Cross-aspect rule identity — 2026-11-12

`calculateCrossAspects` requires unique `aspectDefinitions[].id` values within each call. Duplicate IDs are rejected with `AstrologyError('INVALID_ASPECT')`, even when their configured angles differ, because the result exposes only `aspectId` to consumers. This prevents ambiguous downstream matching of configured rules; no astronomy or default orb policy is introduced. Synthetic regression coverage: `test/cross-aspect-duplicate-definition-ids.test.mjs`. Native Node execution remains required before this draft can be validated. The astronomical dependency remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).

## Cross-aspect orb domain — 2026-11-12

`calculateCrossAspects` accepts configured aspect angles and maximum orbs only within the closed interval 0..180 degrees. Angular separation is always in 0..180; larger orbs have no meaningful geometric domain and now fail with `AstrologyError('INVALID_ASPECT')`. The endpoint values 0 and 180 remain supported. This is an isolated configuration validation change, not an astronomical computation or scientific parity claim. Synthetic regressions: `test/cross-aspect-orb-bounds.test.mjs`. Native `npm test` remains to be run.


## Natal house-placement error consistency — 2026-11-12

`placeNatalBodiesInHouses` now reports `AstrologyError('INVALID_POINT')` for
nonnumeric or nonfinite `body.longitudeDeg`, matching its existing malformed
body-record validation. This is a narrow error-classification change: direct
angle utilities still use `INVALID_ANGLE`. Existing synthetic regression tests
were updated accordingly; native Node.js tests and TypeScript checks have not
been run in this GitHub-only editing session. This does not add astronomical
calculation or claim parity with the Rust/WASM provider. The future astronomy
engine remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Cross-aspect point longitude errors — 2026-11-12

`calculateCrossAspects` requires finite numeric `longitudeDeg` on every source and target point. Missing, null, string, `NaN` and infinite point longitudes fail with `AstrologyError('INVALID_POINT')` rather than the generic angle-utility error `INVALID_ANGLE`. Finite values continue to normalize modulo 360 degrees; the directional aspect geometry is unchanged. Synthetic regressions: `test/cross-aspect-point-longitude.test.mjs`. Native Node.js suite and TypeScript checks remain outstanding. This does not add astronomical calculations; [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole intended Rust astronomy engine.

## Cross-aspect numeric rule error classification — 2026-11-12

Both `aspectDefinitions[].angleDeg` and `maxOrbDeg` must be finite JavaScript numbers. Missing, null, string, NaN and infinite values now fail with `AstrologyError('INVALID_ASPECT')`, rather than leaking the generic `INVALID_ANGLE` error from angle utilities. The existing 0..180 degree bounds and geometric matching behavior remain unchanged. Synthetic regression coverage: `test/cross-aspect-rule-numeric-errors.test.mjs`. Native Node test execution is still required; no astronomical parity is implied. Rust-based [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the only intended astronomical engine.

## Provider provenance completeness — 2026-11-12

The experimental natal assembler accepts either **all three** nonempty provenance identifiers (`engineVersion`, `kernelSetId`, `timeModel`) or **none** (legacy synthetic mocks only). Partial provenance is rejected with `INVALID_EPHEMERIS_RESULT`; mismatched complete provenance across bodies is rejected with `INCONSISTENT_EPHEMERIS`. This is a fail-closed input contract, **not** evidence of a real or scientifically validated Rust/WASM adapter. `test/provider-provenance-completeness.test.mjs` covers both failures and the two accepted cases. The baseline `test/math.test.mjs` fixture and its expected invalid-speed error were updated to match current runtime behavior. Native test execution remains required. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole planned astronomy engine.


## Type-level provenance completeness — 2026-11-12

The experimental `ApparentGeocentricState.metadata` TypeScript declaration now
accepts either all three nonempty-at-runtime identity fields
(`engineVersion`, `kernelSetId`, `timeModel`) or none of them.
Partial metadata is rejected at compile time for typed provider implementations;
runtime `calculateNatalWithProvider` continues to reject partial, blank or
inconsistent identities from untyped JavaScript/WASM boundaries. The all-absent
case exists for synthetic mock tests, **not** for a validated production adapter.
The type fixture is `test/types/provider-provenance-shape.test.ts`; run with
`tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/provider-provenance-shape.test.ts`.
This change does not add astronomy or validate real kernels. The sole intended
astronomical engine remains [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Readonly TypeScript provider boundary — 2026-11-12

`NatalInput` fields and apparent geocentric state numeric fields are now readonly in the experimental TypeScript declaration. The provider method returns `Promise<Readonly<ApparentGeocentricState>>`. This discourages accidental consumer-side mutation of inputs and returned astronomical facts; the runtime still snapshots body names and freezes its provider requests independently. TypeScript `readonly` is compile-time only and does **not** freeze third-party Rust/WASM or JavaScript state objects. Negative compile-time cases are in `test/types/provider-readonly-boundary.test.ts`; verify with `tsc --strict --noEmit --module nodenext --moduleResolution nodenext --target es2022 test/types/provider-readonly-boundary.test.ts`. No native TypeScript verification or scientific ephemeris integration is claimed by this change. VirgoStars credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris.


## Provider metadata reference immutability — 2026-11-12

The experimental TypeScript `ApparentGeocentricState.metadata` and `NatalBody.ephemerisMetadata` references are now `readonly`, in addition to the existing readonly metadata fields. A Rust/WASM adapter consumer cannot reassign either reference through these declarations. The compile-only regression in `test/types/provider-readonly-boundary.test.ts` checks both direct and awaited provider states with `@ts-expect-error`. This is **not** deep runtime freezing of externally supplied provider objects and does not change astronomical calculations. Validate with `tsc --strict --noEmit --module nodenext --moduleResolution nodenext --target es2022 test/types/provider-readonly-boundary.test.ts` and `npm test` before considering merge. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole planned astronomical engine.
