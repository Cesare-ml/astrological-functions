# Same-source gate for planetary points and house comparisons (F3 experimental)

**Status: IMPLEMENTED_ISOLATED, not production.** This narrow, opt-in `compareHousePlacementsWithSourcedPoints` API guards against comparing planetary longitudes to house cusps whose declared source contexts differ.

It is **stacked on draft PR #48** (which itself depends on #43) and adds no code to either existing comparator. It delegates cusp ordering, point validation, UTC rules, provenance checks and house assignment to `compareHousePlacementsWithPinnedSource`. It does **not** calculate astronomy, planets, Ascendant, houses, ayanamsas, source trust, time scales, or interpretive content.

## Why this gate exists

PR #48 ensures that **two house systems** report the same declared observer, kernel, engine, time model, apparent correction convention and zodiac basis. But it accepts ordinary numeric `points` and has no contract linking *their* source to either house system. A caller could accidentally compare planetary longitudes from a different event, location, zodiac, reference frame or kernel. This module makes the caller explicitly supply a position snapshot with its own context, and rejects such mismatches.

## Direct usage

```js
import { compareHousePlacementsWithSourcedPoints } from './src/sourced-house-points.mjs';

// 'left' and 'right' are {snapshot,source} house sides accepted by PR #48.
// All three source envelopes MUST come from the same declared upstream
// calculation context; this module does not create the source metadata.
const result = compareHousePlacementsWithSourcedPoints({
  birthTimeKnown: true,
  left,
  right,
  positions: {
    source: left.source,
    provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    points: [{id:'SUN',longitudeDeg:0},{id:'MOON',longitudeDeg:345}],
  },
});
// result.pointCount === 2
// result.houseComparison.comparison.facts: house placements in each system
```

## Contract and limitations

- **All three sources must exactly agree:** explicit UTC instant, `ECLIPTIC_OF_DATE`, tropical/sidereal basis and ayanamsa ID, `TOPOCENTRIC` nonpolar observer latitude and east longitude, engine version, kernel ID, time model, `APPARENT` correction convention and calculation-profile ID. The two house sides are validated first by PR #48.
- The `positions.source` envelope is **required and complete**. Unknown keys and malformed nested zodiac/observer records are rejected, including a tropical `ayanamsaId` or a sidereal basis with a missing ayanamsa.
- `positions.provenanceStatus` must explicitly be `CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED`. A status claiming verified scientific accuracy is rejected, not promoted.
- Explicit `birthTimeKnown:true` is required. `points` remain the existing strict bounded list (0–128) of unique, nonblank named finite longitude coordinates. Exact cusp boundaries are assigned by the original `locateLongitudeInHouses` logic.
- Result `SourcedHousePointComparison / 0.1.0-experimental` is frozen, detached and JSON serializable. Its status is **always** `MATCHING_CALLER_ASSERTED_HOUSE_AND_POINT_SOURCES_NOT_INDEPENDENTLY_VERIFIED`. Returned `source` is the canonical immutable source snapshot already validated by the house gate, rather than a mutable copy.
- **Important limitation:** comparing metadata does not authenticate it. Caller-supplied values can be incorrect or fabricated. Neither this API nor the upstream comparator proves that planetary longitudes were actually computed from the declared kernel, observer or frame. NASA/JPL precision, Rust/WASM ephemeris output, center/correction semantics and source authentication must be validated independently.
- **Narrow same-source policy, not a universal natal astrology rule:** this prototype deliberately requires the planetary source to use the **same topocentric apparent convention** as the house source. Mixed reference-center arrangements (e.g. geocentric planetary longitudes with topocentric house geometry) must be handled by a separate, scientifically reviewed contract; they cannot be implicitly treated as matching here.
- No Swiss Ephemeris use, private VirgoStars application code, user birth records, interpretation knowledge, root export, npm publication, production switch, GitHub Actions or visibility/license change.

## Verification

```sh
node --test test/sourced-house-points.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/sourced-house-points.test.ts
npm test
```

Synthetic test cases cover matching contexts, mismatch across kernel/version/time-model/profile/correction, observer, UTC, frame and tropical/sidereal variants, invalid/unknown fields, immutable outputs, missing birth time, empty point lists and cusp-boundary ownership. A valid test run does **not** verify actual astronomy. Full checkout, cross-PR reconciliation, scientific kernel validation and VirgoStars attribution/release rights review remain independent gates.

Dependencies: #43 generic comparator → #48 pinned house-side source gate → this experimental point-source gate. Parallel #49 composes Whole Sign / Equal Ascendant; #53 adapts Porphyry output; no overlap with those files. VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
