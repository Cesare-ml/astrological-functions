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
