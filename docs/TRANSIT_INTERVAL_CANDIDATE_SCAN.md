# Experimental F5 — transit interval candidate scan

`scanTransitAspectCandidateIntervals` in `src/transit-interval-scan.mjs` is an **isolated, non-astronomical** adaptive search for candidate intervals of one oriented `SKY_TO_NATAL` aspect residual. It builds on the point-residual contract of PR #14 (stacked on PR #13). It is not a published root-package export or a production transits service.

## What it can and cannot conclude

The injected provider must return **a full-interval inclusive residual range** `[lowerDeg, upperDeg]` for each requested UTC interval, with numeric error, station/retrograde coverage and consistent, continuously unwrapped aspect orientation already incorporated. For an interval with `lowerDeg > 0` or `upperDeg < 0`, the caller-asserted range excludes zero; it is only *conditionally* excludable, not independently certified by this library. Intervals whose range includes zero are split until target width or depth limit.

The result separates:

- `signChangeCandidates`: sampled endpoints with opposite signs, hence at least one root *if the asserted residual is genuinely continuous*. These are suitable brackets for PR #14's `refineBracketedTransitAspectHit`, but **do not guarantee a unique root**.
- `sampledZeros`: exactly zero residuals at evaluated endpoints, deduplicated by UTC. A sampled zero does **not** establish a unique or isolated event.
- `unresolvedIntervals`: possible tangent contacts, multiple/cancelling crossings, zero plateaus or insufficient depth. **Do not treat these as "no event"**.
- `excludedIntervals`: count of ranges whose asserted enclosure strictly excludes zero. No actual full-interval physical verification occurs here.

A provider's `CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES` declaration, `stationCoverage: INCLUDED` and `numericErrorCoverage: INCLUDED` are requirements, **not proof**. Sampling alone cannot create sound bounds; upstream Rust/JPL comparisons and an independent interval-enclosure validation are release gates. The module cannot and does not independently determine stations or reconstruct ephemeris motion.

## Contract and guardrails

- Caller specifies real ISO UTC start/end, period no greater than 31 days; oriented aspect (`POSITIVE` or `NEGATIVE`, 0–180°), named source/target bodies, complete version/kernel/time-model provenance, `targetIntervalMs` (at least 1), `maxDepth` (0–24), `maxProviderCalls` (1–4096). No defaults or unbounded recursion.
- Provider point capability must match `CALLER_ASSERTED_CONTINUOUS_UNWRAPPED`; it additionally declares `enclosureCoverage: CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES`, full station and numeric-error coverage, `EARTH / ECLIPTIC_OF_DATE / APPARENT`, matching provenance and both `getUnwrappedAspectResidual` and `getUnwrappedResidualEnclosure` methods.
- Point and range results must echo the exact requested UTC timestamps, return finite values and compatible metadata. When sampled endpoints fall outside an asserted enclosure the search fails with `INVALID_ENCLOSURE`.
- A missing/mismatched capability, response error, unsafe limit, or provider-call budget exhaustion causes typed error, **never a partial or apparently complete result**. Inputs are snapshotted before awaiting provider calls; requests and results are immutable.
- Metadata always states `PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED`, and `CONDITIONAL_ON_CALLER_ENCLOSURES_NOT_SCIENTIFICALLY_VALIDATED`. There is no exact-event time calculation here.

## Example (synthetic provider only)

```js
import {scanTransitAspectCandidateIntervals} from './src/transit-interval-scan.mjs';
const candidates = await scanTransitAspectCandidateIntervals({
  startUtc:'2026-11-12T00:00:00Z', endUtc:'2026-11-12T06:00:00Z',
  skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
  exactAngleDeg:90, orientation:'POSITIVE',
  targetIntervalMs:60000, maxDepth:12, maxProviderCalls:400,
  ephemerisProvenance: {engineVersion:'synthetic', kernelSetId:'mock', timeModel:'mock-TDB'},
  provider // injected validated-capability test provider, NOT actual Ephemeris Rust yet
});
```

## Verification

```sh
node --test test/transit-interval-scan.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-interval-scan.test.ts
npm test
```

Synthetic cases exercise 0/360-compatible continuous residuals, multiple roots/retrograde-shaped loops, tangencies, sampled zeros, budget exhaustion, malformed UTC, response mismatches, bogus enclosures and reentrant input mutation. **No NASA/JPL scientific validation, Rust/WASM integration, deployment, or production behavior change.** Full test suite must run after stacked PR integration. Keep VirgoStars project credits visible in future consumer apps and respect the unpublished private package's licensing gate.
