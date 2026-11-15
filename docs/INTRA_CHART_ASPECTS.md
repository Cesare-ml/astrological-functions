# Experimental directionless within-chart aspect facts (F1)

**Status: IMPLEMENTED_ISOLATED.** This module is new and independent of the
open provider, synastry, and transit PR stacks. It is not a release, a root
package export, a real ephemeris integration, or an interpretation engine.

## API

`calculateIntraChartAspects({ points, aspectDefinitions })` accepts:

- `points`: an explicit array (0–128) of `{ id: string, longitudeDeg: number }`.
  IDs are unique, unpadded nonblank strings of at most 128 characters.
  Angles may be any finite number and are normalized to [0°, 360°).
- `aspectDefinitions`: an explicit array (0–64) of unique
  `{ id, angleDeg, maxOrbDeg }` with both numeric degrees in [0°, 180°].
  No standard aspect set or orb is assumed. An empty array intentionally
  produces no matches.

The result is a frozen, detached array of frozen geometric facts, each with
`pointAId`, `pointBId`, `aspectId`, `exactAngleDeg`, `actualAngleDeg`,
`signedOrbDeg`, `absoluteOrbDeg`, and `configuredMaxOrbDeg`. Every unordered
pair is examined once (`i < j`); pairs and aspect definitions retain caller
order. Multiple overlapping configured definitions can match the same pair.
The inclusion rule is exactly `abs(actualAngleDeg - exactAngleDeg) <= maxOrbDeg`
without a hidden aspect-specific orb or tie-breaker. Exact boundary inclusion
is subject to normal JavaScript floating-point arithmetic.

`signedOrbDeg` is solely the **geometric** difference between actual separation
and the configured aspect angle. It does *not* indicate applying/separating,
direct/retrograde, synodic phase, or event timing. This is **not** the
`A_TO_B`, `B_TO_A`, or `SKY_TO_NATAL` contract: cross-chart directional facts
remain the responsibility of the corresponding separate APIs.

## Synthetic example

```js
import { calculateIntraChartAspects } from './src/intra-chart-aspects.mjs';

const facts = calculateIntraChartAspects({
  points: [
    { id: 'Sun', longitudeDeg: 359 },
    { id: 'Moon', longitudeDeg: 2 },
  ],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 }],
});
// One unordered edge: Sun–Moon; separation 3°, orb +3°.
```

This helper may later supply undirected natal aspect edges to
`astrological-charts` for hover highlighting or a graph index. Consumers must
attach chart-level zodiac, coordinate-frame, instant, ephemeris, and method
provenance separately. Input points from **different charts must never be
silently mixed**: this module cannot check chart ownership. No causation,
scientific accuracy, or interpretation is inferred from geometry.

## Local validation

From the repository root with Node.js >=20 and TypeScript available:

```sh
node --test test/intra-chart-aspects.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/intra-chart-aspects.test.ts
npm test
```

After PR integration, resolve typed package exports and exercise the API from a
real downstream consumer. Do not enable GitHub Actions or publish/merge without
review. Keep VirgoStars project credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
