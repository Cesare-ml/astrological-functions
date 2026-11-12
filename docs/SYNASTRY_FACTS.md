# Experimental composed synastry facts — F4

The new `src/synastry-facts.mjs` is a standalone, **non-astronomical** composer of two independently calculated natal charts. It reuses `calculateBidirectionalHouseOverlays` and `calculateCrossAspects`; it does not compute planet positions, cusps, nodes, times, interpretations, or Swiss Ephemeris fallbacks.

## Explicit inputs

`calculateSynastryFacts({ chartA, chartB, birthTimeKnownA: true, birthTimeKnownB: true, cuspSetA, cuspSetB, aspectDefinitions })` requires:
- Two existing experimental natal results with complete ephemeris provenance.
- Both birth times expressly known; this first combined variant deliberately does **not** support aspects-only mode, because its contract is `FULL_HOUSES`. No inferred Asc/MC or house claims when either birth time is missing.
- An **external** cusp set independently matched to chart A and an external cusp set matched to chart B. Each context validates UTC, location, engine version, kernel and time model before any result is returned.
- An explicit aspect configuration array. An empty array means intentionally **no configured aspects**; no hidden defaults. Angle and orb must each be finite in 0..180°, and rule IDs must be unique.

## Result

```js
import { calculateSynastryFacts } from './src/synastry-facts.mjs';

const facts = calculateSynastryFacts({
  chartA, chartB,
  birthTimeKnownA: true, birthTimeKnownB: true,
  cuspSetA, cuspSetB,
  aspectDefinitions: [
    { id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 },
    { id: 'opposition', angleDeg: 180, maxOrbDeg: 2 },
  ],
});
// facts.aToB.houseOverlays: A bodies in B houses
// facts.aToB.aspects: A source bodies against B target bodies
// facts.bToA.houseOverlays: B bodies in A houses
// facts.bToA.aspects: B source bodies against A target bodies
```

The example assumes `chartA`, `chartB` and both cusp sets have already been supplied by a trusted experimental caller. It is not runnable with an actual JPL ephemeris yet.

The returned `SynastryFactsResult` and nested direction containers are frozen. `aspectDefinitions` is a cloned immutable snapshot. Cross-aspect facts contain configured rule ID, geometric separation, signed/absolute orb, source and target; direction ownership remains explicit. Since aspect geometry is symmetric, the same physical cross-pair may appear in both directions with different source/target roles. That is deliberate, not duplicate independent phenomena.

The result contains **geometric chart facts only**, never interpretive or causal claims.

## API and verification gates

- **Direct ESM file path only:** `src/synastry-facts.mjs`, with companion `src/synastry-facts.d.mts` for consumers. The package's root `exports` map is intentionally unchanged; this is not an officially exported or published API.
- `node --test test/synastry-facts.test.mjs` exercises synthetic directions, 0°/360° boundary, orb, empty rules, type-specific failures and immutability.
- `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/synastry-facts.test.ts` checks the consumer type contract.
- `npm test` runs the repository's Node tests. This and TypeScript checks on a real checkout remain prerequisites for integration.
- Full scientific ephemeris/kernels, the legacy VirgoStars method comparison, license/attribution and production release gates remain open. The composer must not be presented as validated production synastry.

Stacking: this change is based on PR #7 (house overlays), itself based on PR #3 (ephemeris contract). Do not merge it independently into `main` or turn on GitHub Actions. Maintain the VirgoStars project credits.
