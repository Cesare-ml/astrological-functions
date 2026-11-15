# Zodiac midpoint contact matrix — experimental, pure F1 geometry

`calculateZodiacMidpointContactMatrix` combines the existing, separately
reviewable **named source-pair catalog** (draft PR #35) with the **one-axis,
multi-target contact sweep** (draft PR #47). It builds a deterministic matrix
of every unordered source pair against each explicitly supplied target, without
implementing another midpoint or contact algorithm.

```js
import { calculateZodiacMidpointContactMatrix } from '../src/zodiac-midpoint-contact-matrix.mjs';

const facts = calculateZodiacMidpointContactMatrix({
  sourcePoints: [
    {name:'Sun', longitudeDeg:350},
    {name:'Moon', longitudeDeg:10},
    {name:'Venus', longitudeDeg:90},
  ],
  targetPoints: [
    {name:'Mars', longitudeDeg:0},
    {name:'Jupiter', longitudeDeg:180},
  ],
  maxOrbDeg:2,
});
// pairCount = 3, targetCount = 2, cellCount = 6
// Sun/Moon midpoint axis is [0, 180]: both Mars and Jupiter match.
```

## Contracts and counting semantics

- `sourcePoints` must contain **2–32** unique, named, finite ecliptic longitudes.
  Exactly one catalog row is generated for each distinct-name unordered source
  pair. At 32 sources there are at most **496** pair rows.
- `targetPoints` must contain **1–32** unique named finite longitudes. Each
  source pair is compared against **every supplied target**, including targets
  whose names also occur among the sources. There is **no implicit exclusion
  of pair members**; a consumer that does not want self or same-chart contacts
  must explicitly prepare the target list or apply a reviewed filtering policy.
- The two namespaces are independent; names may overlap between
  `sourcePoints` and `targetPoints`. Within either individual list, names are
  trimmed, nonblank, **case-sensitive** and unique. No implicit trimming.
- `maxOrbDeg` is mandatory, finite, and within **[0,90]** degrees. The
  inclusive test and both antipodal midpoint solutions are delegated to PR
  #47 → #26 → #23. A target at exact 90° from both axes can match both
  solutions but contributes **one** matched matrix cell.
- The complete result contains `sourceCatalog`, normalized sorted
  `targetPoints`, sorted `rows` with the full `targetSweep` for each pair, and
  the flattened `matchedCells` (only matches, in pair/target order).
  `pairCount` is the number of source pairs, `targetCount` the number of
  targets, `cellCount = pairCount * targetCount`, `matchedCellCount` the number
  of matching (pair, target) cells, and `activePairCount` the number of source
  pairs matched by at least one target.
- At the maximum size there are **496 × 32 = 15,872** comparison cells. This
  is a fixed input-size bound, not a benchmark of production performance.
- Outputs and all nested values used here are frozen factual snapshots.
  Exact 180° opposition retains both axis longitudes but no preferred
  shortest-arc midpoint. Nonfinite input, array holes, repeated names and
  invalid orbit limits are rejected by the owning primitives.

## Integration boundaries / stacked PR dependency

This integration draft is **stacked on PR #47** (which depends on #26 and #23).
It also needs PR #35's two catalog implementation/declaration files, carried
into this branch **byte-for-byte unchanged** for reproducible local testing.
Those two upstream files should be reconciled with PR #35 before merging:
**do not integrate this branch independently into `main`**. No shared
`src/index.mjs` or `package.json` export is changed by this draft.

Both source and target positions must use consumer-validated common zodiac,
coordinate frame, reference time policy, observer/center and validated
VirgoStars Ephemeris provenance. This module does not calculate astronomy,
validate time- or chart-level semantics, infer missing birth times, interpret
astrological significance, or access private databases/accounts. It does not
claim causality or JPL scientific parity. Only synthetic geometry is tested.

## Local verification commands

```bash
node --test test/zodiac-midpoint-contact-matrix.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-contact-matrix.test.ts
npm test
```

Run `npm test` again in a **complete authenticated checkout** after the
stacked PR chain is reconciled, and separately validate against pinned real
Rust/WASM astronomical production data before any consumer integration.
No GitHub Actions, publication, deployment or automatic merge is required.

VirgoStars attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
