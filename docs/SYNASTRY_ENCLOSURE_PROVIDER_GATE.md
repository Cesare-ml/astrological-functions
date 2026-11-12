# Experimental Rust/WASM longitude-enclosure consumer gate

`src/synastry-enclosure-provider.mjs` introduces the **consumer-side contract and strict validation** for a *future* VirgoStars Ephemeris Rust/WASM API. The upstream Rust core **does not currently expose this verified API**, and this module is not a Rust binding. There is no ephemeris calculation, interpolation, prediction, station search, astronomical proof or Swiss Ephemeris fallback in `astrological-functions`.

The API `analyzeSynastryUncertaintyWithProvider` takes:
- An existing `SynastryAspectsOnlyResult` from PR #9 (not a `FULL_HOUSES` chart).
- Explicit UTC intervals `intervalA` and `intervalB`. Known birth times require an exact, zero-length interval. Unknown birth times require a nonempty interval containing their representative UTC instant.
- A supplied `LongitudeEnclosureProvider` with explicit versioned capability declarations, not a silently loaded global library.

This module is stacked on PR #10, which provides the **conditional geometry** from declared arcs. Thus the chain is:
`Rust/WASM ephemeris provider [future] -> enclosure response -> consumer safety gate [this PR] -> conditional aspect geometry [PR #10]`.

## Required provider interface

```ts
interface LongitudeEnclosureProvider {
  capabilities: {
    contract: 'LongitudeEnclosureProviderCapabilities';
    contractVersion: '0.1.0-experimental';
    continuousCoverage: 'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS';
    coordinates: {
      center:'EARTH'; frame:'ECLIPTIC_OF_DATE'; corrections:'APPARENT';
    };
  };
  getContinuousLongitudeEnclosure(request: LongitudeEnclosureRequest):
    Promise<LongitudeEnclosureResponse> | LongitudeEnclosureResponse;
}
```

Requests contain `contract:'LongitudeEnclosureRequest'`, the contract version, chart `A` or `B`, exact start/end/representative UTC, explicitly selected body names, known/unknown birth-time flag, pinned engine/kernel/time-model provenance, required frame/correction/center, and `coverageRequirement:'FULL_INTERVAL_INCLUDING_STATIONS'`.

Responses must **echo** version/chart/time interval/representative instant and pin the same provenance. They must declare `coverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS'`, provide exactly one canonical `{startDeg,spanDeg}` longitude arc for each selected body, and supply:
- `coverageEvidence.method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS'`
- `coverageEvidence.stationHandling:'INCLUDED'`
- `coverageEvidence.errorIncludedInArcs:true`
- A nonempty `coverageEvidence.algorithmId`
- A finite `coverageEvidence.maxLongitudeErrorDeg` within 0–180.

**These fields are self-declarations, not independently verified proofs.** The wrapper only checks shapes, compatibility and coherence. A malicious or scientifically wrong implementation can lie. Numeric error bounds must be established *inside the Rust algorithm* through genuine numerical/sampling-extrema analysis that covers full intervals, including retrograde loops, and then independently validated. Arbitrary samples must **not** be relabeled as proven continuous envelopes.

## Result and fail-closed behavior

The function produces `SynastryProviderUncertaintyResult` with:
- `status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'`
- Frozen `evidence.A` / `evidence.B`
- The existing `SynastryAspectUncertaintyResult` under `analysis`, including `interpretation:'CONDITIONAL_ON_CALLER_ENCLOSURES'` and the explicit `ENCLOSURE_COVERAGE_NOT_VERIFIED` warning.

`ALWAYS_WITHIN_BOUNDS` remains **conditional on the provider's claimed enclosures**; it does not mean that an aspect is scientifically demonstrated to persist all day. No houses, Ascendant or MC are produced.

The consumer rejects missing providers, unsupported version/capabilities, geometric or J2000 responses, sample-only coverage, incompatible time ranges, different ephemeris kernel/model/engine, missing/extra bodies, nonfinite arcs, bad station/error declarations and invalid rules. Failure on chart B rejects the whole call rather than returning partial results.

Input body names, aspect rules, time bases, provenance and requested intervals are **frozen copies created before awaiting** the provider. This prevents reentrant mutation of the original data from changing the chart interpretation while WASM/network work is running. Calls are sequential and deterministic A then B; no hidden network or data source is built in.

## Example (synthetic provider only)

```js
import { analyzeSynastryUncertaintyWithProvider } from './src/synastry-enclosure-provider.mjs';

const result = await analyzeSynastryUncertaintyWithProvider({
  aspectsOnlyResult, // already calculated with the PR #9 experimental method
  intervalA:{startUtc:'2026-01-01T00:00:00Z',endUtc:'2026-01-01T23:59:59Z'},
  intervalB:{startUtc:'2026-02-01T12:00:00Z',endUtc:'2026-02-01T12:00:00Z'},
  provider:futureRustWasmEnclosureProvider, // NOT YET IMPLEMENTED
});
```

Do not copy this as a production integration example: the real `futureRustWasmEnclosureProvider` is an unimplemented contract. Aspects-only source snapshots must match both intervals and all provenance fields.

## Validation and next implementation gates

```sh
node --test test/synastry-enclosure-provider.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/synastry-enclosure-provider.test.ts
npm test
```

The committed JavaScript fixture uses **synthetic providers only**. Native repository checks remain required on an authenticated checkout before integration.

The next step in `Cesare-ml/VirgoStars-Ephemeris` is to **design and implement the Rust interval enclosure producer** with a proof methodology, pinned dataset, exact coordinate frame and numerical error model, time-scale conventions, stationary/retrograde coverage, discontinuity testing, official NASA/JPL reference comparisons and realistic performance limits; only then wrap it in thin WASM bindings and provide scientific/operational release evidence. The repository's current Rust engine and bindings do not supply these capabilities. No implied CPAL license transfer to this private library: follow the upstream CPAL-1.0 license and attribution requirements, and this repository's separate licensing gate.

This remains a **draft experimental entry point only**. No root package export, merge to `main`, GitHub Actions, release, public visibility or production changes.
