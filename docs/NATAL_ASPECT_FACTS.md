# Experimental intra-chart natal aspect facts (F1)

`src/natal-aspects.mjs` exports `calculateNatalAspects({ points, aspectDefinitions })` as an **isolated, pure ESM module**. This is not yet a package-root/subpath export. The matching declaration is `src/natal-aspects.d.mts`.

## Contract

- A chart contains **1–32** uniquely named points `{name, longitudeDeg}`. Names and aspect IDs must be trimmed and nonempty; case is significant. Repeated names and nonfinite longitudes fail closed with typed `AstrologyError` codes.
- Explicit named definitions `{id, angleDeg, maxOrbDeg}` (up to 32) are mandatory. No implicit aspect set or orb. Angles and orbs are finite degrees within `0..180` and orbital boundaries are **inclusive, without epsilon expansion**. An empty explicit set yields no aspects.
- Positions normalize modulo 360. A pair of bodies is **unordered** and evaluated once, never paired with itself. Points are ordered lexicographically by name and definitions by ID; caller array permutation cannot reorder results. Overlapping named definitions intentionally produce multiple matches.
- Result `NatalAspectFacts / 0.1.0-experimental` contains the count of unique pairs, frozen matches with normalized positions and configured geometry, and `SOURCE_POSITIONS_NOT_INDEPENDENTLY_VERIFIED`. `signedOrbDeg = actualAngleDeg - exactAngleDeg` describes *orb geometry*, **not** applying versus separating. No invented speed, time, direction, house, or interpretation.
- **Important:** this function cannot verify that input positions share the same UTC instant, center, reference frame, zodiac model, ayanamsa or validated Rust/JPL provenance. Consumers must establish those conditions before invocation, particularly when comparing tropical/sidereal values. No provider fallback is present.

## Synthetic usage

```js
import { calculateNatalAspects } from './src/natal-aspects.mjs';
const result = calculateNatalAspects({
  points: [{name:'Sun',longitudeDeg:359}, {name:'Moon',longitudeDeg:2}],
  aspectDefinitions: [{id:'conjunction',angleDeg:0,maxOrbDeg:3}],
});
// result.pairsConsidered === 1; result.aspects[0].absoluteOrbDeg === 3
```

## Verification commands

```sh
node --test test/natal-aspects.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/natal-aspects.test.ts
```

All tests are synthetic angular geometry, **not** physical ephemeris validation, natal chart correctness, scientific causal evidence or legacy production parity. This module must remain draft pending authenticated full checkout, package export/typing policy, original-source and licensing audit, and integration against the pinned and scientifically validated VirgoStars Ephemeris provider. No production, backend, desktop, data, license or visibility changes.

Project attribution: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
