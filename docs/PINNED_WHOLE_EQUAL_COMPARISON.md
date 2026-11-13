# F3: Whole Sign / Equal Ascendant composition with pinned caller-declared source

**Status:** experimental, private, facts only. No new astronomical formulas; no Swiss Ephemeris code; no verified real Rust/JPL provider.

## Scope

`compareWholeSignEqualWithPinnedSources` composes the **actual** Whole Sign (#39) and Equal Ascendant (#29) cusp generators with the **strict caller-declared source gate** (#48) stacked on the generic comparator (#43). This feature branch builds on draft #49 (real producer integration). It copies four byte-identical upstream gate files (source, declarations and tests) **only to validate the combined stack** without merging other PRs or introducing incompatible exports.

Unlike the earlier no-source facade in #49, this function requires **two separate and explicit** source envelopes: `wholeSignSource` and `equalAscendantSource`. It generates both cusp results from the *same* externally supplied Ascendant longitude, UTC instant, frame and longitude basis, then lets the existing gate validate that each source matches the generated cusp context and that both sources agree on their declared observer, engine version, kernel set, time model and profile. Neither source is copied from the other, implicitly inferred or assigned a default.

```js
import { compareWholeSignEqualWithPinnedSources } from './src/pinned-whole-equal-comparison.mjs';

const source = {
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg: 44, longitudeDegEast: 11 },
  corrections: 'APPARENT',
  engineVersion: 'SYNTHETIC_RUST_V1',
  kernelSetId: 'SYNTHETIC_KERNEL_V1',
  timeModel: 'SYNTHETIC_TIME_V1',
  calculationProfileId: 'CANONICAL_V1',
};
const result = compareWholeSignEqualWithPinnedSources({
  birthTimeKnown: true,
  ascendantLongitudeDeg: 345,
  datetimeUtc: source.datetimeUtc,
  frame: source.frame,
  longitudeBasis: source.longitudeBasis,
  wholeSignSource: structuredClone(source),
  equalAscendantSource: structuredClone(source),
  points: [
    { id: 'MOON', longitudeDeg: 340 },
    { id: 'MARS', longitudeDeg: 10 },
  ],
});
// result.contract === 'PinnedHouseMethodComparison'
// result.status === 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED'
// MOON: house 1 Whole Sign, house 12 Equal Ascendant
// MARS: house 2 Whole Sign, house 1 Equal Ascendant
```

These metadata are **synthetic declarations** and cannot establish a physical/astronomical fact. The application must provide a validated Rust/WASM Ephemeris instance, a consistent observer/time scale and a separately verified Ascendant and chart point positions before real natal-chart use. Even matching source identifiers cannot authenticate kernel contents or prove the Ascendant was calculated with the stated source. Do not label results scientifically VERIFIED.

## Errors, contracts and test coverage

The wrapper requires `birthTimeKnown: true` and no unknown root keys. Existing upstream modules remain the only authorities for ISO UTC/calendar validation, frame, zodiac projection contract, geometry, point placement and pinned-source metadata. The result is their existing frozen `PinnedHouseMethodComparison / 0.1.0-experimental` contract with status `MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED`. Unsupported corrections (such as `GEOMETRIC`), polar observers, missing IDs or metadata fail closed; differing source observer, kernel, engine, time model, calculation profile or zodiac return `INCOMPATIBLE_SOURCE_CONTEXT`. The historical Vehlow/`egizia` and `houses_pos` semantics are not inferred.

Run from a **complete authenticated checkout of this branch**:

```sh
node --test test/pinned-whole-equal-comparison.test.mjs
node --test test/house-source-consistency.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext \
  test/types/pinned-whole-equal-comparison.test.ts \
  test/types/house-source-consistency.test.ts
npm test
```

These synthetic tests establish structural and arithmetic behavior, *not* scientific accuracy or production readiness. The branch remains stacked on #49, itself on #43. Its copy of the source-gate module/tests comes from #48; remove the duplicate staged files if #48 merges separately. Reconcile the `package.json` subpath exports with concurrent packaging PRs before merging any stack. This module is **direct-source import only**; package exports, production, licensing, visibility, deployment and GitHub Actions are untouched. Preserve explicit VirgoStars attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris .
