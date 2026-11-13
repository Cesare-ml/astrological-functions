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

- Caller specifies real ISO UTC start/end, period no greater than 31 days; oriented aspect (`POSITIVE` or `NEGATIVE`, 0–180°), named source/target bodies, complete version/kernel/time-model provenance, `targetIntervalMs` (at least 1), `maxDepth` (0–24), `maxProviderCalls` (1–4096). All body/aspect and ephemeris provenance identifiers must be nonempty, **canonically trimmed strings**; leading/trailing whitespace fails with `INVALID_ARGUMENT` before any provider call, consistent with the F4 transit-facts contract. No defaults or unbounded recursion.
- Provider point capability must match `CALLER_ASSERTED_CONTINUOUS_UNWRAPPED`; it additionally declares `enclosureCoverage: CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES`, full station and numeric-error coverage, `EARTH / ECLIPTIC_OF_DATE / APPARENT`, matching provenance and both `getUnwrappedAspectResidual` and `getUnwrappedResidualEnclosure` methods.
- **Contract version must be echoed on every response:** both point-residual and all-time range metadata require `contractVersion: '0.1.0-experimental'`; accepting the version from `provider.capabilities` alone is unsafe when a provider changes response schema mid-search. Missing or incompatible response versions raise `INCOMPATIBLE_EPHEMERIS`, including during refinement in the composed event pipeline.
- Point and range results must echo the exact requested UTC timestamps, return finite values and compatible metadata. When sampled endpoints fall outside an asserted enclosure the search fails with `INVALID_ENCLOSURE`.
- A missing/mismatched capability, response error, unsafe limit, or provider-call budget exhaustion causes typed error, **never a partial or apparently complete result**. Inputs are snapshotted before awaiting provider calls; requests and results are immutable.
- Metadata always states `PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED`, and `CONDITIONAL_ON_CALLER_ENCLOSURES_NOT_SCIENTIFICALLY_VALIDATED`. There is no exact-event time calculation here.

## Cross-interval enclosure consistency guard

A provider may return **conservative, non-tight enclosures**. The
child's asserted range need **not** be a subset of the parent's asserted
range. Both can be valid if their **intersection is nonempty**. For each
child, the scanner intersects its reported bounds with the already
effective parent bounds, retaining the intersection as the tighter
`lowerDeg/upperDeg` output for that segment. Empty parent–child
intersection raises typed `INVALID_ENCLOSURE`, without falsely rejecting
valid loose child bounds.

Adjacent sibling intervals share one exact UTC boundary. Therefore
their *effective* all-time ranges must also intersect: if both sibling
ranges are disjoint, neither can contain the residual at that common
instant. This contradiction is detected even when both intervals are
pruned before any point evaluation, avoiding a false "no transit"
conclusion. A one-point intersection is allowed.

**At every actual subdivision**, the scanner now obtains and caches a
point residual at the exact split UTC *before* either child can be
pruned. The midpoint must lie within the parent's effective enclosure.
Both children must then contain this already-sampled shared endpoint
even when their stated intervals overlap numerically and would
otherwise both be excluded without leaf sampling. This closes a
synthetic false-negative case: the parent reported [-1, 1], both
children reported [0.5, 1], and the true midpoint residual was 0.13.
Before the fix the search returned zero candidates without any point
evaluation; it now raises `INVALID_ENCLOSURE` atomically.

Previously sampled point residuals at other interval endpoints are
likewise checked against the effective enclosure. Each split point is
cached and sampled only once within a scan. These extra samples are
charged against the existing explicit `maxProviderCalls` budget:
insufficient budget raises `SEARCH_BUDGET_EXHAUSTED`, not a partial
or misleading negative result. A range already excluded at the root
still does not require any point sample.

These are **consistency checks on provider assertions**, not a proof
that the numerical bounds are scientifically accurate or that every
station and tangent root is accounted for. An internally consistent,
yet physically incorrect, provider can still miss real events.
The Rust producer must independently demonstrate interval validity
including floating-point error margins.

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
