# Porphyry → pinned house-comparison source adapter (F3)

**Status: IMPLEMENTED_ISOLATED.** This module accepts an already computed experimental `PorphyryHouseCusps` result (see draft PR #40) and converts it into a **strict source-and-snapshot envelope** for `compareHousePlacementsWithPinnedSource` (draft #48). It does not calculate an Ascendant, Midheaven, house cusps, astronomy, time models, or a zodiac projection.

## Motivation

The existing Porphyry producer contains `source` with engine/kernel/time-model/observer metadata but does **not** declare the apparent-correction model or calculation-profile identifier expected by the source-consistency gate. Silently inventing those fields would undermine the provenance contract. Instead the consumer must provide a separate pinned source with **explicit** `corrections:'APPARENT'` and `calculationProfileId`, which this adapter validates against all source fields that the Porphyry producer actually supplies.

## Example

```js
import { adaptPorphyryForPinnedHouseComparison } from './src/porphyry-pinned-house-adapter.mjs';
import { compareHousePlacementsWithPinnedSource } from './src/house-source-consistency.mjs';

// porphyry: a result returned by calculatePorphyryHouseCusps (draft PR #40)
// other: a separate already validated {snapshot,source} for WHOLE_SIGN or EQUAL_ASCENDANT
const adapted = adaptPorphyryForPinnedHouseComparison({
  birthTimeKnown: true,
  porphyry,
  source: {
    datetimeUtc: porphyry.datetimeUtc,
    frame: 'ECLIPTIC_OF_DATE',
    longitudeBasis: { type: 'TROPICAL' },
    observerType: 'TOPOCENTRIC',
    observer: porphyry.source.observer,
    engineVersion: porphyry.source.engineVersion,
    kernelSetId: porphyry.source.kernelSetId,
    timeModel: porphyry.source.timeModel,
    corrections: 'APPARENT',
    calculationProfileId: 'CANONICAL_V1',
  },
});
const result = compareHousePlacementsWithPinnedSource({
  birthTimeKnown: true,
  left: other,
  right: adapted,
  points: [{ id: 'Sun', longitudeDeg: 0 }],
});
```

The metadata copied from `porphyry.source` are producer assertions, **not** verified evidence. The caller-specified corrections and profile ID are also assertions; they must come from the exact independent provider/configuration used for both snapshots. The adapter **rejects** any mismatched engine, kernel, time model, observer or UTC, and does not manufacture values that are missing from the producer.

## Input and output guarantees

- Accepts only the actual versioned `PorphyryHouseCusps / 0.1.0-experimental` shape with `FACTS_ONLY`, `PORPHYRY`, four finite declared angles, four bounded quadrant spans, twelve finite forward-ordered cusp longitudes and `CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED` status.
- Requires `birthTimeKnown:true`, valid UTC and strict tropical / topocentric / ecliptic-of-date producer metadata; no silent sidereal reinterpretation or legacy `egizia`/Vehlow equivalence.
- The explicit pinned source must have the same calendar instant, observer coordinates and engine/kernel/time model as the producer. It must declare an apparent correction model and a nonblank calculation profile ID. These **declarations are not independently verified**.
- Verifies the four declared Porphyry cusp anchors against their corresponding angle values within **1e-9 degrees** to detect inconsistent snapshots; the method geometry and underlying astronomy remain independently unverified. Cusp placement belongs to the existing `locateLongitudeInHouses` function, not a new algorithm.
- The return value is the existing structurally compatible `{snapshot, source}`, both detached and frozen. `snapshot.provenanceStatus` preserves the original uncertainty; no provenance promotion or scientific certification occurs.
- Fails closed with typed errors including `BIRTH_TIME_UNKNOWN`, `INVALID_PORPHYRY_RESULT`, `INVALID_SOURCE_CONTEXT`, `INCOMPATIBLE_SOURCE_CONTEXT`, `INVALID_CUSPS`, and `INCOMPATIBLE_PORPHYRY_GEOMETRY`.

## Verification

```sh
node --test test/porphyry-pinned-house-adapter.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/porphyry-pinned-house-adapter.test.ts
npm test
```

The 15 synthetic tests include direct consumption by the actual existing pinned comparison gate (under the #48 stack), incompatible source assertions, malformed/invalid cusp data, 0°/360° placement, frozen snapshots and absent birth time. These tests validate contract behavior **only**, not NASA/JPL precision or real VirgoStars Rust/WASM integration. Run the full stack on a native checkout and review legal provenance, attribution, privacy, package export and downstream consumers before release.

### Coordination

- **Stack:** PR #43 (generic comparator) → PR #48 (strict declared-source gate) → this adapter. Do not merge stacked PRs directly to `main` out of order.
- **External method dependency:** PR #40 Porphyry. This adapter intentionally does not copy/import Porphyry's implementation from another branch; the runtime test fixtures match its documented output shape, and future native integration should use the actual producer.
- PR #49 separately addresses Whole Sign / Equal Ascendant composition, so this module neither duplicates that facade nor claims to resolve it.
- No GitHub Actions, production routes, npm publication, license/visibility changes, astronomy duplication or automatic merge.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
