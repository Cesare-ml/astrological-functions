# Experimental transit-events package consumer entry point

The package now proposes a **typed ESM-only** subpath:

```js
import { prepareTransitAspectEventCandidates } from 'astrological-functions/transit-events';
```

TypeScript resolves the declaration from `src/transit-event-pipeline.d.mts` using `moduleResolution: nodenext`. **Consumer-facing types are re-exported from the same public subpath**, including `TransitIntervalProvider`, `TransitHitProvenance`, `TransitAspectOrientation`, `TransitRangeRequest`, `TransitRangeResponse`, and `BracketedTransitAspectHit`. Consumer code should not import `src/**` paths, which are not part of the package exports map.

```ts
import {
  prepareTransitAspectEventCandidates,
  type TransitIntervalProvider,
  type TransitHitProvenance
} from 'astrological-functions/transit-events';
// The provider must be supplied explicitly by a caller that can fulfill
// the complete continuous-residual and interval-enclosure contract.
``` The contract remains experimental and **not scientifically validated**. There is no CJS `require` export, no implicit ephemeris initialization, no additional runtime dependency and no new astronomical code. The repository is still private and not released.

This subpath requires the **stacked** experimental implementations in PR #13 (base transit facts), PR #14 (single bracket refinement), PR #17 (interval candidate scan), and PR #21 (pipeline). It intentionally exposes only the final orchestrator instead of a second copy of its internals. No other package exports are altered.

## Verification required before integration

Run in the **complete authenticated GitHub checkout of this branch**:

```sh
node --test test/transit-events-consumer-import.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-events-consumer-import.test.ts
npm test
```

The runtime fixture uses a **synthetic provider** with mathematically explicit linear residual and enclosing interval, and checks ESM self-reference resolution, returned direction/body facts, approximate time, provenance/unverified status, and the absence of an advertised CJS entry. The TypeScript fixture verifies positive import and incompatible input rejection at compile time.

Neither these tests nor earlier synthetic math tests constitute a JPL/Horizons comparison, Rust/WASM validation, guarantee of interval enclosure correctness, guarantee of exhaustive retrograde/tangent-event discovery, or production readiness.

Before merging, consolidate **parallel transit PR #12 vs #13**, review the dependency stack, verify that the actual consumer's Node/TS bundler resolves the subpath, and repeat scientific validation once an actual pinned Rust provider supplies a rigorously justified all-time residual enclosure. Maintain visible VirgoStars attribution and the separate source/license/privacy gate. No automatic GitHub Actions or deployment.
