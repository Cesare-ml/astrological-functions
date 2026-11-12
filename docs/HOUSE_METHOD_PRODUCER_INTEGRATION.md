# F3 real-producer integration: Whole Sign versus Equal Ascendant

**Experimental / private / not production.** This is a deliberately stacked integration validation branch based on PR #43 (generic read-only house-method comparison). It uses the **byte-identical source blobs** from PR #29 (Equal Ascendant) and PR #39 (Whole Sign), along with a new non-astronomical composition facade. These copied producer files are present only to test the integration without merging unrelated branches into `main`; reconcile them after the upstream PRs are integrated.

## Consumer entry point

`compareWholeSignAndEqualFromAscendant(input)` in `src/whole-equal-house-comparison.mjs` takes a **caller-calculated**, already zodiac-projected Ascendant and explicitly supplied point longitudes, all associated with a known birth time. It invokes:

1. `calculateWholeSignHouseCusps` for `WHOLE_SIGN`, birth time asserted as known.
2. `calculateEqualHouseCusps` for `EQUAL_ASCENDANT`.
3. `compareHouseMethodPlacements` for the existing read-only per-point comparison.

All three operations use the **same** Ascendant, UTC instant, coordinate frame and zodiac basis. The facade never calculates Ascendant, sky positions, ayanamsa, sidereal time, houses astronomy or ephemeris data. It does not accept a hidden default house system and rejects unexpected fields or missing birth-time knowledge. It preserves the generic comparator's `CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED` status; passing the checks does **not** demonstrate same-observer or physical-ephemeris provenance, so this is unsuitable for production.

```js
import { compareWholeSignAndEqualFromAscendant } from './src/whole-equal-house-comparison.mjs';

const result = compareWholeSignAndEqualFromAscendant({
  ascendantLongitudeDeg: 345,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  points: [
    { id: 'SUN', longitudeDeg: 355 },
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
  ],
});
// result.facts -> SUN (1,1), MOON (1,12), MARS (2,1)
```

### Why this is an integration gate

The existing generic comparator (PR #43) accepts externally computed cusp arrays and **does not independently prove their claimed method**. This facade avoids accidental cross-chart mismatches by generating both supported geometries from the same explicit inputs, rather than trusting two independently assembled snapshots. Its input data nevertheless remains an assertion from an outside provider. The future Rust/WASM VirgoStars Ephemeris must supply scientifically validated real Ascendant positions, pinned UTC/location, frame, kernel and time model before any accurate natal chart or desktop migration.

The different semantics of legacy `egizia`/Vehlow and historic `houses_pos` remain excluded. The Porphyry F3 candidate is deliberately not part of this two-method composition. No Swiss code or astronomy algorithm is copied.

## Verification

```sh
node --test test/whole-equal-house-comparison.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/whole-equal-house-comparison.test.ts
npm test
```

On 12 November 2026, the **actual authenticated GitHub JS blobs** for the main primitives, both cusp producers, generic comparator and new facade were executed in a **V8 isolated harness** adapting `node:test` and `node:assert/strict` test functions: **11/11 new integration cases passed**. This was **not** the native Node.js test runner or the full authenticated checkout, and the TypeScript fixture has not yet been compiled on a complete checkout. These caveats must remain visible.

### Branch coordination

- This stack targets PR #43, not `main`; a future merge must account for PRs #29 and #39 first and drop duplicate staging files when the producers become part of the target.
- The former overlapping F3 PR #34 and comparator #44 should not be merged alongside their canonical counterparts.
- Scientific and legal release gates, original VirgoStars attribution, and the `private: true` package boundary remain unchanged.
