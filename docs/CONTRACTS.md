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
