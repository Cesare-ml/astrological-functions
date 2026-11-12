# Directional transit aspects — isolated F4 slice

`calculateTransitFacts` composes **SKY_TO_NATAL** geometric cross-aspects from two caller-supplied sets of planetary longitudes. It deliberately reuses `calculateCrossAspects` and does not calculate planetary positions, houses, Asc/MC/DS/IC, longitudinal velocity, or event instants. This experimental module supplies **facts only** and no interpretations or user/account data. It is not production-ready.

```js
import {calculateTransitFacts} from 'astrological-functions/transits';
const ephemeris={center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'validated-version-goes-here',kernelSetId:'kernel-id',timeModel:'time-model-id'};
const result=calculateTransitFacts({
  birthTimeKnown:true,
  natal:{datetimeUtc:'2000-01-01T12:00:00Z',ephemeris,zodiac:{type:'TROPICAL'},
    points:[{name:'Sun',longitudeDeg:359}]},
  sky:{datetimeUtc:'2026-11-12T20:00:00Z',ephemeris,zodiac:{type:'TROPICAL'},
    points:[{name:'Mars',longitudeDeg:1,longitudeSpeedDegPerDay:-0.1}]},
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}]
});
// result.aspects[0].direction === 'SKY_TO_NATAL'
```

## Fail-closed input contract

- Explicit, real ISO UTC instants ending `Z` (not timezone-less local times). Natal birth time must be explicitly known. Unknown birth times must use a separate uncertainty-aware API; this function **never** treats representative instants as exact.
- Both snapshots declare the same tropical zodiac or same **named/versioned** sidereal ayanamsa; no automatic zodiac conversion or default selection.
- Both snapshots declare `EARTH`, `ECLIPTIC_OF_DATE`, `APPARENT` and identical nonempty `engineVersion`, `kernelSetId`, `timeModel`. J2000/geometric/synthetic projections must **not** masquerade as true apparent-of-date positions. These strings are *assertions*, not independently verified proof of scientific accuracy.
- Each snapshot contains 1–32 uniquely named planetary bodies with finite longitudes, optionally finite `longitudeSpeedDegPerDay` values. That speed remains a numerical quantity; the module does **not** infer retrograde/stationary labels or confuse it with synodic D1/R2/R3/D4 phases.
- Explicit `aspectDefinitions` (including intentional empty `[]`) must use unique IDs and finite `angleDeg`/`maxOrbDeg` in 0..180. No hidden conjunction, orb or house policy.
- The result is immutable, `direction: 'SKY_TO_NATAL'`, `houseMode: 'UNAVAILABLE'`, `angles: null`, `interpretation: 'FACTS_ONLY'`. It includes both original UTC instants and defensive position/provenance snapshots.

## Verification and integration gates

Run from this branch: `npm test` and `tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-facts.test.ts`.

Tests with synthetic positions only prove shape and deterministic geometry. Before consumer or production use, validate the pinned VirgoStars Ephemeris Rust/WASM producer against real NASA/JPL kernels and agreed frame/time/correction models; verify no implicit fallback, compare compatibility fixtures, and approve release/license/credits separately. No GitHub Actions, production changes or auto-merge.
