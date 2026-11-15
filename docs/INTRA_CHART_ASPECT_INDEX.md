# Intra-chart aspect index: symmetric hover facts (experimental F1)

This **isolated** module adds `indexIntraChartAspects({pointIds, facts})` to the undirected intra-chart fact engine proposed in PR #30. The output is a **read-only, JSON-serializable index of existing facts**, suitable for a UI consumer to look up which planets are connected to a selected planet. **It does not calculate aspects, astronomy, interpretation, houses, colors or UI state.** It intentionally does not touch `src/index.mjs`, package exports or any renderer.

## Contract

- `pointIds`: explicit 0–128 unique, nonblank, trimmed identifiers (at most 128 characters each); every input point appears in the index, including isolated points.
- `facts`: explicit array of at most 65,536 canonical `IntraChartAspectFact` objects from `calculateIntraChartAspects`. Sparse arrays, self-pairs, unknown point references, duplicate unordered pair/aspect combinations, nonfinite/out-of-range and inconsistent orb data all fail closed with `AstrologyError`.
- `nodes`: lexically sorted by point ID. Each node has `{pointId, connections}`; connections sorted by other point and aspect IDs, and contain caller-supplied aspect geometry. Each undirected aspect is accessible from **both** endpoints; there is no artificial A_TO_B or B_TO_A direction. Overlapping different aspect IDs are retained.
- Result is deeply frozen, detached from mutable caller objects, with `contract: 'IntraChartAspectIndex'`, `contractVersion: '0.1.0-experimental'` and `validationStatus: 'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED'`. An input ordering change cannot affect output ordering.
- The index validates internal geometric consistency but **does not independently verify** body coordinates, physical ephemeris provenance, zodiac model, birth time, astrological interpretation or that inputs originate in the same chart. The caller must enforce those separately. `signedOrbDeg` remains numeric geometry, not applying/separating motion.

## Sample consumer flow

```js
import { calculateIntraChartAspects } from './src/intra-chart-aspects.mjs';
import { indexIntraChartAspects } from './src/intra-chart-aspect-index.mjs';
const points = [{id:'Sun',longitudeDeg:359},{id:'Moon',longitudeDeg:2}];
const facts = calculateIntraChartAspects({
  points, aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}],
});
const index = indexIntraChartAspects({pointIds:points.map(p=>p.id),facts});
const sunConnections = index.nodes.find(n=>n.pointId==='Sun')?.connections ?? [];
// [{ otherPointId:'Moon', aspectId:'conjunction', ... }]
```

## Validation and integration gates

```sh
node --test test/intra-chart-aspect-index.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/intra-chart-aspect-index.test.ts
```

The test exercises the actual upstream PR #30 geometry engine on synthetic points. A full authenticated checkout, TypeScript public package exports, a chart-renderer consumer test and scientific Rust Ephemeris validation remain required before release. No Swiss import, Github Actions, automatic merges, production changes or npm publishing. [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution remains required.
