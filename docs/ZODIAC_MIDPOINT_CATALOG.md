# Named zodiac midpoint catalog — F1 experimental geometry

`calculateZodiacMidpointCatalog` creates the complete deterministic set
of **unordered pairs of distinct named points** from precomputed ecliptic
longitudes. It calls the existing midpoint-axis function from draft PR #23,
rather than reimplementing its angular geometry or reading ephemerides.

```js
import { calculateZodiacMidpointCatalog } from '../src/zodiac-midpoint-catalog.mjs';

const facts = calculateZodiacMidpointCatalog({
  points: [
    { name: 'Sun', longitudeDeg: 350 },
    { name: 'Moon', longitudeDeg: 10 },
    { name: 'Venus', longitudeDeg: 90 },
  ],
});
// facts.pairCount === 3
// facts.pairs[0] is Moon/Sun; its axis is [0, 180]
```

## Fail-closed deterministic contract

- Requires a **dense array containing 2–32 points**; the maximum is
  `32 * 31 / 2 = 496` pair facts. Sparse arrays, malformed objects and
  missing arrays throw `INVALID_MIDPOINT_CATALOG`.
- Each point requires a **nonblank, already-trimmed, unique case-sensitive
  name** and a finite numeric `longitudeDeg`. Malformed names throw
  `INVALID_MIDPOINT_POINT`; duplicates throw
  `DUPLICATE_MIDPOINT_POINT`; nonfinite/nonnumeric angles use the
  core `INVALID_ANGLE` error.
- The catalog sorts points and pairs using **case-sensitive JavaScript
  string code-unit order**, not caller input order, locale or UI ordering.
  This is a canonical output rule; no hidden symbolic planet priority.
- Longitudes are normalized to [0°, 360°) by the existing core helper.
  Coincident positions still form pairs when their names differ.
- Each unordered pair is generated **exactly once** (no self pairs).
  The nested `midpointAxis` result retains the upstream exact-opposition
  ambiguity: no preferred shortest-arc midpoint at 180°.
- Outer result, points, pairs and all nested axis results are immutable
  snapshots. Only geometric facts are returned; there are no interpretations,
  causal claims or astronomy/synodic calculations.

## Integration limitations and dependencies

This module works with **positions already supplied by the caller** and does
not verify whether their timestamps, observer, reference frame or tropical/
sidereal ayanamsa agree. The consuming adapter must validate a common
zodiac, reference frame, epoch and scientifically pinned VirgoStars Ephemeris
provider *before* generating a catalog. Do not generate false precision for
unknown birth time or unsupported astronomical bodies.

The PR is stacked directly on draft **PR #23** (the midpoint-axis primitive);
it is independent of sibling draft PR #26 (single-target midpoint contacts).
Only new paths are added, with no shared `index.mjs` or `package.json`
changes. This is **not a published package export**.

## Verification

Run from a checkout of the stacked branch with Node >=20 and TypeScript >=5:

```bash
node --test test/zodiac-midpoint-catalog.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-catalog.test.ts
npm test
```

The isolated fixture checks bounds, stable ordering, incomplete/sparse arrays,
duplicate names, 0°/360°, 180° opposition, immutability and exact pair count.
These synthetic cases **do not validate astronomical accuracy** or live
integration with Rust/WASM, NASA/JPL, natal charts, Astrolabio or VirgoStars
production. Licensing, provenance and visible VirgoStars credits still require
their existing release reviews.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
