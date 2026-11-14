# F5 — conservative transit candidate reports over UTC chunks

**Scope:** Experimental isolated bridge from the F5 candidate pipeline proposed in [PR #21](https://github.com/Cesare-ml/astrological-functions/pull/21) to the half-open UTC chunk planner in [PR #72](https://github.com/Cesare-ml/astrological-functions/pull/72). Does **not** produce certified event times, execute astronomy, import Swiss Ephemeris, merge the stacked PRs or change production.

## Why a separate report path?

`prepareTransitAspectEventCandidates` returns `refinedCandidates`, `sampledZeros`, and `unresolvedIntervals`. A refined candidate may be within a tolerance; a sampled zero is conditional on the provider; unresolved intervals can contain tangencies or multiple roots. The pipeline expressly returns `scientificallyValidated:false` and `NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE`. Treating these values as exact event hits for `reconcileUtcChunkEventHits` would be **scientifically misleading**. Instead, `collectTransitChunkCandidateReports` keeps only the counts and warning flags, never an event timestamp.

## Usage with PR #21 once its stack is integrated

```js
import { collectTransitChunkCandidateReports } from './src/transit-chunk-candidate-reports.mjs';
import { prepareTransitAspectEventCandidates } from './src/transit-event-pipeline.mjs'; // PR #21, NOT on main

const identity = {
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
  exactAngleDeg:90, orientation:'POSITIVE',
  ephemerisProvenance:{engineVersion:'SYNTHETIC',kernelSetId:'TEST',timeModel:'MOCK'},
};
const result = await collectTransitChunkCandidateReports({
  windowInput:{startUtc:'2026-11-14T00:00:00Z',endUtc:'2026-11-14T02:00:00Z',
    maxDurationMs:7200000,chunkDurationMs:3600000,maxChunks:2},
  identity, maxCandidateRecords:128,
  runChunk:({chunkIndex, ...request}) => prepareTransitAspectEventCandidates({
    ...request, provider:syntheticProvider, targetIntervalMs:60000,
    maxDepth:12, maxProviderCalls:400,
    refinement:{timeToleranceMs:100,residualToleranceDeg:0.0001,
      maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:1000},
  }),
});
// result.totals.unresolvedIntervalCount, result.reports[0].sampledZeroCount, ...
// No result.hits; there is no claim that physical events have been located.
```

**Preconditions:** `chunkDurationMs` must satisfy the F5 pipeline's own maximum 31-day input and `targetIntervalMs <= chunkDurationMs`, including the final shorter chunk. This adapter does not silently adjust the F5 solver limits or the caller's telescope/ephemeris provider. The integration requires pinned, provider-asserted continuous unwrapped residual, interval enclosures including station/retrograde cases and numeric errors, consistent corrections/frame, and native end-to-end testing after the stacked PRs #13 → #14 → #17 → #21 are available.

## Fail-closed invariants

- The caller supplies bounded UTC window, pinned one-aspect identity and all three nonempty engine/kernel/time-model identifiers; `runChunk` receives a frozen snapshot, sequentially in chunk order.
- Each return must match the exact PR #21 experimental contract, requested chunk UTC bounds, direction `SKY_TO_NATAL`, aspect and provenance, plus `scientificallyValidated:false`, `verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'` and the **non-certified** completeness label. Conflicting flags or missing data properties fail before moving to the next chunk.
- The adapter validates array presence and counters but **does not interpret** nested candidate physics; counts are not trustworthy scientific measurements independent of the provider. An explicit `maxCandidateRecords` of 1–16,384 limits retained report-record counts across chunks; per-chunk pipeline retains separate provider budget/recursion controls.
- The result is a frozen, auditable per-chunk and total **summary**, with no event timestamp or invented negative result; empty unresolved arrays do **not** imply complete or unique roots. No private birth data or interpretation content.
- The underlying F5 pipeline's errors propagate unchanged. This adapter has no native timeout, cancellation, global provider-call budget or cross-chunk numerical continuity verification. These are blockers for production.

## Validation

```sh
node --test test/transit-chunk-candidate-reports.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-chunk-candidate-reports.test.ts
npm test
```

As of **2026-11-14**, 10 synthetic Node.js 22.16.0 tests and strict TypeScript 5.8.3 NodeNext compilation passed on a local fixture incorporating the previous PR #72 dependencies. No full private checkout test or real PR #21 module composition was executed. Scientific JPL/Rust verification and licensing/privacy review remain separate gates; retain VirgoStars project attribution. No GitHub Actions were introduced.
