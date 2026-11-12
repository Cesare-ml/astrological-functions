# F5 — experimental transit event candidate pipeline

`prepareTransitAspectEventCandidates` composes two **existing independent experimental modules**:

1. `scanTransitAspectCandidateIntervals` (PR #17) partitions an explicit UTC range using a caller-provided all-time unwrapped residual enclosure.
2. `refineBracketedTransitAspectHit` (PR #14) refines each *sign-changing* leaf into a time-and-residual-tolerance-bounded candidate.

It is a facts-only, single oriented **SKY_TO_NATAL** aspect workflow. No astronomical positions, Swiss code, interpretation, birth data, database access, exports, production behavior, or wall-clock scheduling are implemented.

## Output contract and limitations

- `refinedCandidates[]`: frozen `{candidate, refinement, uniqueness:'MULTIPLE_ROOTS_NOT_EXCLUDED'}` records in scan order. Each refinement is **conditional**, not certified as an actual astronomical event and not proven to be the only zero in its bracket.
- `sampledZeros[]`: exact residual zeros at points actually sampled in the scan; reported separately to prevent duplicate fictitious refinements.
- `unresolvedIntervals[]`: intervals containing possible tangencies, multiple roots, zero plateaus, or exhausted depth. They are **not** negative results.
- `excludedIntervals`: only counts intervals where the provider-asserted all-time envelope excludes zero. This is **not** independent scientific verification.
- `hasUnresolvedIntervals` and `completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE'`: no claim of exhaustive event coverage **even if there are no unresolved leaves**. `verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'` and `scientificallyValidated:false` are always present.

The provider must assert continuous, correctly oriented, unwrapped apparent Earth-centered ecliptic-of-date residuals, **all-time interval bounds including stationary/retrograde behavior and numeric error**, identical engine/kernel/time-model provenance and timestamp echoes. The library checks the contract, **not** the mathematical truth of the declarations. A production-ready full event calendar must rely on an independently validated Rust enclosure provider and NASA/JPL reference comparisons.

## Explicit budgets and atomic errors

The caller supplies the scanner's `targetIntervalMs`, `maxDepth`, `maxProviderCalls` plus a required `refinement` object:

```js
import { prepareTransitAspectEventCandidates } from './src/transit-event-pipeline.mjs';
const result = await prepareTransitAspectEventCandidates({
  startUtc:'2026-11-12T00:00:00Z', endUtc:'2026-11-12T06:00:00Z',
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
  exactAngleDeg:90, orientation:'POSITIVE',
  targetIntervalMs:60000, maxDepth:12, maxProviderCalls:400,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'test',timeModel:'synthetic-TDB'},
  provider, // explicit synthetic provider; NOT a validated real Rust producer
  refinement:{
    timeToleranceMs:100, residualToleranceDeg:0.0001, maxIterations:40,
    maxCandidateRefinements:64, maxRefinementCalls:1000
  }
});
```

Refinement caps are 1–128 candidate refinements, 1–128 iterations per candidate, and 1–16,384 total refinement point calls; all positive numeric tolerances are mandatory. The smaller of configured `timeToleranceMs` and the actual leaf span is passed to the refiner. If any scan, provider, or refinement fails, the promise rejects **without returning a partial result**. Before awaiting, immutable copies of configuration, ephemeris provenance, provider capability declarations, and bound provider functions are captured. Provider error messages and typed validation errors are not swallowed.

## Verification and release boundary

```sh
node --test test/transit-event-pipeline.test.mjs
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-event-pipeline.test.ts
```

The isolated fixture covers linear crossings, wrap-compatible residuals, repeated retrograde-shaped passages, point zeros, tangencies, provider failure, budget exhaustion, input mutation, metadata mismatches and candidate precision. Run the **full checked-out repository** suite again after merging the stacked PRs #13 → #14 → #17 → this branch. No root package export or real consumer integration is included. Preserve VirgoStars attribution and honor the separate licensing/privacy gates before any release.
