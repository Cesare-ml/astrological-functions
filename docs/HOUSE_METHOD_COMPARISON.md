# Experimental house method placement comparison (F3)

This module **compares house placements**, not cusp algorithms or astronomical facts. It provides a common *read-only* comparison consumer for independent draft Whole Sign, Equal Ascendant, and Porphyry cusp methods. No house systems are derived and **no astronomy** or Swiss Ephemeris is imported.

## Example

```js
import { compareHouseMethodPlacements } from './src/house-method-comparison.mjs';

const frame = 'ECLIPTIC_OF_DATE';
const datetimeUtc = '2026-11-12T21:15:03Z';
const longitudeBasis = { type: 'TROPICAL' };
const provenanceStatus = 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
const r = compareHouseMethodPlacements({
  birthTimeKnown: true,
  left: { houseSystem: 'WHOLE_SIGN', frame, datetimeUtc, longitudeBasis,
    provenanceStatus, cuspsDeg: [330,0,30,60,90,120,150,180,210,240,270,300] },
  right: { houseSystem: 'EQUAL_ASCENDANT', frame, datetimeUtc, longitudeBasis,
    provenanceStatus, cuspsDeg: [345,15,45,75,105,135,165,195,225,255,285,315] },
  points: [{ id: 'Sun', longitudeDeg: 0 }],
});
// r.facts[0] -> {id:'Sun', longitudeDeg:0, leftHouse:2, rightHouse:1, changed:true}
```

## Safety / scope

- Supports only explicitly named `WHOLE_SIGN`, `EQUAL_ASCENDANT`, or `PORPHYRY` cusp methods. **No implicit legacy `egizia` / Vehlow**, Placidus, Koch, or Regiomontanus. Distinct methods are mandatory.
- Each snapshot requires a real identical UTC calendar instant, `ECLIPTIC_OF_DATE` frame, compatible tropical or named sidereal longitude basis, caller-asserted provenance status, and exactly twelve finite forward-ordered cusp longitudes. The existing `locateLongitudeInHouses` method provides exact cusp-start ownership. The module does **not** independently verify that the cusps follow the claimed house system.
- Caller must supply `birthTimeKnown: true`; missing or unknown time **fails closed**. A false birth-time flag on either snapshot also fails closed. Comparisons do not invent house placements.
- `points`: an explicit `0..128` list of unique named longitudes. Sparse arrays, duplicate IDs and invalid coordinates are rejected. Results and nested arrays/objects are detached, frozen, and JSON-serializable. Angular input normalization uses only the existing `normalize360` primitive.
- **Critical provenance caveat:** matching UTC/frame/zodiac is necessary but not sufficient for true equivalence. The caller must verify both house sets were generated from the same validated observer, location, source kernel/version, time model, correction conventions, chart profile and birth event. Metadata in this isolated prototype is **caller asserted**, not independently authenticated. The status `CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED` is always returned. Do not use the comparison as proof of astronomical accuracy.
- Equal/Whole Sign draft results can be passed as snapshot inputs directly if their metadata matches. Porphyry has a distinct upstream `source` metadata layout: its caller must explicitly adapt `longitudeBasis` from the verified source convention before comparison. This module never assumes tropical from an unspecified value.
- Not a root package export, not a renderer, not a real Rust/WASM adapter, not production. No publish, GitHub Actions, automatic merge, or license/visibility change.

## Local checks

```bash
node --test test/house-method-comparison.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/house-method-comparison.test.ts
npm test
```

These fixtures validate deterministic **synthetic** comparison geometry and input checks only. Scientific JPL validation and full consumer integration remain separate release gates. Preserve VirgoStars project credits: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
