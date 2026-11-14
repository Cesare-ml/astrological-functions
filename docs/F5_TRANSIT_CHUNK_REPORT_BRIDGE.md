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


## PR #21 typed request adapter and manual integration gates

`makeTransitChunkPipelineRunner` (`src/transit-chunk-pipeline-adapter.mjs`) now builds the **actual PR #21 input shape** from each chunk request, without importing the stacked module into PR #72. A consumer injects `prepareTransitAspectEventCandidates` as `prepareCandidates` **after the PR #21 stack is present**. The returned one-use `runChunk` function can be passed directly to `collectTransitChunkCandidateReports`.

```js
import { makeTransitChunkPipelineRunner } from './src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from './src/transit-chunk-candidate-reports.mjs';
// Only available AFTER the stacked PR #13 -> #14 -> #17 -> #21 integration:
import { prepareTransitAspectEventCandidates } from './src/transit-event-pipeline.mjs';

const runChunk = makeTransitChunkPipelineRunner({
  windowInput, identity,
  scan: {targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400},
  refinement: {timeToleranceMs:100,residualToleranceDeg:0.0001,
    maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:1000},
  provider, // Must implement the complete PR #17 apparent-of-date provider contract
  maxTotalProviderCalls:2800, // Two chunks * (400 scan + 1000 refine calls)
  prepareCandidates:prepareTransitAspectEventCandidates,
});
const summary = await collectTransitChunkCandidateReports({
  windowInput, identity, maxCandidateRecords:128, runChunk,
});
```

### Preflight safety

- Verifies **every** chunk fits the F5 input range (at most 31 days). In particular, `scan.targetIntervalMs` must not exceed the **last shortened chunk**; no implicit tolerance or interval adjustment is applied.
- Validates scanner (`maxDepth` 0–24, `maxProviderCalls` 1–4,096) and refinement (`maxIterations` 1–128, `maxCandidateRefinements` 1–128, `maxRefinementCalls` 1–16,384, positive tolerances) limits **before calling** the provider.
- Requires a caller-specified `maxTotalProviderCalls` (1–1,000,000) that must cover the **worst-case** `chunkCount × (maxProviderCalls + maxRefinementCalls)`. This conservatively limits the aggregate budget delegated to the F5 pipeline, contingent on that pipeline enforcing its own per-chunk budgets. It is not a wall-clock or memory bound.
- Validates provider capability declarations for asserted continuous unwrapped, all-time interval enclosure, station/numeric-error coverage and apparent Earth-centered ecliptic-of-date frames. Snapshots capabilities, bound provider methods, scan/refinement settings before asynchronous work.
- Rejects incorrect chunk coordinates, out-of-order, concurrent or repeated requests; a failed pipeline cannot be implicitly retried. Forwards raw exceptions to callers instead of fabricating an empty report.
- **Does not** certify provider assertions, scientific events, physical time accuracy or completeness. The report-only bridge never converts refined candidates to exact hits.

### Verification and merge readiness

Executed in an isolated PR #72 local fixture on Node 22.16.0: **49/49 focused Node tests passed**, including the **10 new adapter tests** and the previous UTC and report modules. All regular TypeScript 5.8.3 strict NodeNext consumer fixtures passed. An additional **typed-only compatibility rehearsal** passed using locally copied, unchanged declaration files from the draft PR #21 chain; no runtime code from PR #21 was run. GitHub blob hashes of the six new adapter/smoke/type files match their local copies.

After stacking PRs #13, #14, #17 and #21 together with PR #72 on a complete checkout, run:

```sh
npm test
node --test test/transit-chunk-pipeline-adapter.test.mjs
node scripts/manual/transit-pr21-smoke.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext scripts/manual/transit-pr21-typecheck.ts
```

`scripts/manual/transit-pr21-smoke.mjs` intentionally **fails to import** on standalone PR #72, because its required `transit-event-pipeline.mjs` exists only in the stacked PR #21. It uses synthetic linear-crossing and tangency enclosures; it is a contract-integration gate, **not astronomical verification**. There are no GitHub Actions and no automated merge or production deployment.


### Pinned aspect identity and getter-free validation (2026-11-14)

The adapter now requires `identity` **at construction time**, using the exact same `snapshotTransitPinnedIdentity` helper as the report collector. The helper snapshots each own data property without invoking getters, freezes the aspect and engine/kernel/time-model provenance, and validates explicit identities before any provider request.

Every chunk submitted to `runChunk` must match the pinned `skyBodyName`, `natalBodyName`, `aspectId`, `exactAngleDeg`, `orientation`, `engineVersion`, `kernelSetId`, and `timeModel` in addition to its UTC coordinates/index. A direct adapter caller cannot silently switch planets, aspect orientation, or ephemeris provenance mid-search. Accessor-based requests and mismatched identities fail with typed `INVALID_TRANSIT_IDENTITY` or `INCOMPATIBLE_CHUNK_REQUEST` errors **without calling the pipeline**, and the pinned immutable values (not caller-mutable request fields) are forwarded to PR #21.

Manual and typed examples now supply `identity` explicitly to `makeTransitChunkPipelineRunner`; this is a breaking change to the previously experimental draft adapter API. Synthetic regression checks cover forged later chunks, mutations during provider awaits, accessor/getter attempts, missing/invalid pinned identities and the shared collector gate. No astronomical correctness or event completeness is implied.
