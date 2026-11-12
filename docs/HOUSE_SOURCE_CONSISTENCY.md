# Declared source consistency for house-method comparisons (F3)

**Status: IMPLEMENTED_ISOLATED.** This optional adapter makes the already existing `compareHouseMethodPlacements` (draft PR #43) refuse pairs of house methods whose caller-declared astronomical **source metadata** differ. It does not calculate or certify an ephemeris, Ascendant, Midheaven, cusp model or observer; Rust/WASM remains the only planned astronomy engine. No Swiss library or app data is used.

## Relationship to the existing API

This module is **stacked on draft PR #43** and imports its `compareHouseMethodPlacements` implementation. It does not change #43's original inputs/outputs or duplicate its point placement, cusp-geometry or UTC validation. It adds a separate strict `compareHousePlacementsWithPinnedSource` entry point with `left`/`right` pairs of `{ snapshot, source }`. `snapshot` uses #43's documented house format (`WHOLE_SIGN`, `EQUAL_ASCENDANT`, `PORPHYRY`), whereas `source` is a caller-declared envelope. Consumers must explicitly map any method-specific result lacking this envelope: most current F3 drafts do not carry all required source fields, and this adapter must not infer missing values.

Example with **synthetic** inputs:

```js
import { compareHousePlacementsWithPinnedSource } from './src/house-source-consistency.mjs';
const datetimeUtc = '2026-11-12T21:15:03Z';
const longitudeBasis = { type: 'TROPICAL' };
const source = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType: 'TOPOCENTRIC', observer: { latitudeDeg: 44, longitudeDegEast: 11 },
  engineVersion: 'SYNTHETIC_TEST_V1', kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'SYNTHETIC_TIME', corrections: 'APPARENT',
  calculationProfileId: 'CANONICAL_V1',
};
const metadata = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
};
const result = compareHousePlacementsWithPinnedSource({
  birthTimeKnown: true,
  left: { source, snapshot: { ...metadata, houseSystem: 'WHOLE_SIGN',
    cuspsDeg: [330,0,30,60,90,120,150,180,210,240,270,300] } },
  right: { source, snapshot: { ...metadata, houseSystem: 'EQUAL_ASCENDANT',
    cuspsDeg: [345,15,45,75,105,135,165,195,225,255,285,315] } },
  points: [{ id: 'SUN', longitudeDeg: 0 }],
});
// result.comparison.facts[0].leftHouse === 2
// result.comparison.facts[0].rightHouse === 1
```

## Validation semantics

- Require explicit `birthTimeKnown:true` and two different existing house-method snapshots. The base comparator handles exact/near cusp ownership and point limits.
- Both source envelopes must specify and **exactly match** UTC instant, `ECLIPTIC_OF_DATE` frame, tropical or named sidereal longitude basis, `TOPOCENTRIC` observer including finite nonpolar latitude and bounded east longitude, engine version, kernel set ID, time model, `APPARENT` corrections and calculation profile ID.
- Source date/frame/zodiac must agree with **that side's snapshot** too. Missing fields, unknown keys, nonfinite observer coordinates, unsupported correction/frame/observer models, malformed identifiers and mismatches throw explicit `AstrologyError` (`INVALID_SOURCE_CONTEXT` or `INCOMPATIBLE_SOURCE_CONTEXT`). Unsupported house cusp data and unknown birth times fail closed via existing errors.
- The result is detached, deeply frozen for the included plain data and JSON-safe: `PinnedHouseMethodComparison / 0.1.0-experimental` with `status: MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED`. It includes one canonical source snapshot plus the base comparison result.
- **Matching fields are only assertions by the caller.** A malicious or incorrect provider can fabricate matching metadata; this function does not authenticate kernel contents, JPL accuracy, observer coordinate provenance, or actual provider version. It must not be used to imply production-grade scientific validation.
- This is a direct source import only. No package exports, npm release, public license, GitHub Actions, merges, frontend/back-end migrations or visibility changes.

## Reproducible isolated checks

```sh
node --test test/house-source-consistency.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/house-source-consistency.test.ts
npm test
```

Run from a **complete checkout containing the stacked #43 head**, with Node >=20 and TypeScript available. Tests use synthetic inputs, not real VirgoStars Ephemeris Rust/WASM. Separate provider integration, provenance verification, consumer compatibility, license/privacy and VirgoStars attribution gates still apply. Project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
