# Directional synastry house overlays (experimental)

`src/directional-house-overlays.mjs` implements the independent **F4 geometric synastry overlay** between two *already calculated* experimental natal charts. It does **not** calculate astronomical positions, house cusps, angles, or interpretations. It is not yet part of the root package export map or an official release.

## Contract

- `A_TO_B`: take chart A's longitudes and place them into **chart B's** externally calculated, context-matched cusps (`cuspSetB`).
- `B_TO_A`: take chart B's longitudes and place them into **chart A's** externally calculated, context-matched cusps (`cuspSetA`).
- Both `birthTimeKnownA` and `birthTimeKnownB` must be literal `true`. The method fails closed rather than reporting house overlays based on an unknown birth time.
- Both inputs must be `NatalChartResult` / `0.1.0-experimental` with complete `engineVersion`, `kernelSetId` and `timeModel` provenance. The target cusp set is checked against **target** UTC instant, location and ephemeris provenance; the source and target charts may use different validated kernel sets.
- Cusp assignment reuses `validateHouseCuspContext` and `locateLongitudeWithHousePolicy`, including exact-boundary and 0°/360° behavior. `LEGACY_HOUSES_POS` is explicitly unsupported. No fallback to Swiss Ephemeris.
- Returns immutable, ordered placements and the matched target cusp metadata. No ASC/MC, physical correctness, causality, or interpretation claim is made by this synthetic layer.

## Direct ESM import (not an exported package subpath)

```js
import { calculateDirectionalHouseOverlays } from './src/directional-house-overlays.mjs';
const result = calculateDirectionalHouseOverlays({
  direction: 'A_TO_B', chartA, chartB,
  birthTimeKnownA: true, birthTimeKnownB: true, cuspSetB,
});
```

`chartA`, `chartB` and `cuspSetB` are externally supplied experimental results; this snippet is not a runnable example without such data. The `.d.ts` is for future consumer typing; the package's `exports` field is intentionally unchanged.

## Verification and gates

Run `node --test test/directional-house-overlays.test.mjs` and `npm test` in a checked-out copy of the stacked branch. Synthetic tests prove directionality, boundary behavior, metadata checks, immutable results, and intentional errors, **not** Ephemeris scientific accuracy. Before release: execute TypeScript and native Node tests, ensure the Rust/WASM Ephemeris adapter and target cusp source pass scientific validation, then decide packaging and license/attribution through the existing approval gates.

## Combined two-way overlay helper

The `calculateBidirectionalHouseOverlays` helper requires both `cuspSetA` and `cuspSetB` and returns a frozen `BidirectionalHouseOverlayResult` containing `aToB` and `bToA`. It calls the validated one-direction function twice, with independent target contexts. Failure of either direction throws a typed error; callers never receive a partial combined result. Source/target roles remain explicit and no new astronomical algorithm is implemented.

```js
import { calculateBidirectionalHouseOverlays } from './src/directional-house-overlays.mjs';
const both = calculateBidirectionalHouseOverlays({
  chartA, chartB, cuspSetA, cuspSetB, birthTimeKnownA: true, birthTimeKnownB: true,
});
// both.aToB = A's bodies in B's houses
// both.bToA = B's bodies in A's houses
```
