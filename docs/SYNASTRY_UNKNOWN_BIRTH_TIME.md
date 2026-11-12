# Experimental aspects-only synastry with unknown birth time

`calculateSynastryAspectsOnly` is an independent **F4 experimental** composition mode. It computes directional planetary *geometric facts* for explicitly selected, already-calculated positions. It neither runs Ephemeris nor infers houses, ASC/MC, birth time, or interpretation. Do **not** call its results definitive when a time is unknown.

## Explicit time contract

For each chart, the caller must pass the corresponding truth value and literal time basis:

| `birthTimeKnownA/B` | `positionBasisA/B` | Meaning |
|---|---|---|
| `true` | `KNOWN_BIRTH_INSTANT` | Chart's UTC instant is the supplied known birth time |
| `false` | `REPRESENTATIVE_INSTANT` | Chart's UTC instant is an explicitly assumed sample, **not** the actual birth time |

Unknown-time results include one immutable `UNKNOWN_BIRTH_TIME` warning per affected chart and `timeReliability: 'PROVISIONAL'`. The supplied representative instant can change planetary longitudes (particularly the Moon and faster points). The library does **not** calculate uncertainty envelopes, find a birth-time range, or determine if an aspect holds throughout that interval. **Do not infer those claims from the presence of a match.** Downstream UIs must display the provisional warning and label the assumed instant.

A chart with `birthTimeKnown=false` can still carry a `datetimeUtc`, but that time is explicitly the *representative* calculation timestamp, not a claimed birth time.

## Input shape

```js
import { calculateSynastryAspectsOnly } from './src/synastry-aspects-only.mjs';

const facts = calculateSynastryAspectsOnly({
  chartA, chartB, // existing experimental NatalChartResult snapshots
  birthTimeKnownA: false, positionBasisA: 'REPRESENTATIVE_INSTANT',
  birthTimeKnownB: true, positionBasisB: 'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA: ['Sun', 'Mercury', 'Venus', 'Mars'],
  selectedBodyNamesB: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'],
  aspectDefinitions: [{id: 'conjunction', angleDeg: 0, maxOrbDeg: 3}],
});
```

The sample assumes the caller already supplied real `chartA` and `chartB` objects with versioned time/ephemeris provenance. It is not a ready-to-run astronomical example. Body selection is **always explicit** and must be a nonempty, unique list of existing named bodies for each chart. This prevents accidentally adding a time-sensitive body or angle through an all-body default. The selection alone does not prove a chosen body is insensitive to an unknown birth time.

## Output contract and safety boundaries

`SynastryAspectsOnlyResult` contains:
- `houseMode: 'UNAVAILABLE'`, `angles: null`, `aToB.houseOverlays: null`, `bToA.houseOverlays: null`. Supplying either `cuspSetA` or `cuspSetB`, even null, is rejected.
- `timeBasis` snapshots (known/representative, UTC instant), `provenance` for both chart snapshots, explicit `selectedBodyNames`, `warnings` and `timeReliability`.
- `aToB.aspects` and `bToA.aspects`: both are computed using the existing `calculateCrossAspects`, preserving source/target ownership even when angular separation is symmetric. Results and rule snapshots are immutable.

`aspectDefinitions` is mandatory: `[]` intentionally returns zero aspect matches and **does not** apply default rules. Invalid/orphaned body selection, malformed chart UTC, partial provenance, bad rules, sparse arrays and unresolved birth-time booleans fail with typed errors. No Swiss Ephemeris implementation or fallback is present.

This is a separate entry point from `calculateSynastryFacts` (PR #8), whose `FULL_HOUSES` mode still requires **both known birth times** and two validated cusp sets. The two functions have deliberately distinct contracts rather than a mode switch with hidden defaults.

## Tests and next gates

```sh
node --test test/synastry-aspects-only.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/synastry-aspects-only.test.ts
npm test
```

All validation is synthetic until real Rust/WASM Ephemeris output and accuracy tests are available. Before adopting this in VirgoStars Desktop, compare positions across a declared uncertainty interval for unknown birth times and design a trustworthy aspect persistence/uncertainty flag; do not present representative-instant aspects as exact. Document use of the app's UTC/calendar conversion and licensing/attribution review. No release/production action is authorized by this module.

This change is stacked on PR #8, which is stacked on PR #7, which depends on PR #3. It remains a direct-file experimental module: root `package.json` exports unchanged. No GitHub Actions or production merge.
