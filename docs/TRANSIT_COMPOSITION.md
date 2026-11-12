# Experimental F4 sky-provider → transit-facts composition

Status: **IMPLEMENTED_ISOLATED**, not production validated. The new `calculateTransitFactsWithProvider` is a thin, fail-closed **consumer orchestrator**. It does **not** calculate planetary coordinates, project frames, estimate longitudes, infer motion phase, perform astronomical event searches or interpret aspects. Astronomical data must eventually originate from the independently validated VirgoStars Ephemeris Rust/WASM engine.

## Contract and use

```js
import {calculateTransitFactsWithProvider} from 'astrological-functions/transits/compose';

// Provider and natalSnapshot are explicitly supplied by the consumer;
// no built-in provider or real ephemeris integration exists yet.
const result = await calculateTransitFactsWithProvider({
  birthTimeKnown: true,
  natal: natalSnapshot,
  datetimeUtc: '2026-11-12T19:00:00Z',
  zodiac: {type:'TROPICAL'},
  bodyNames: ['Sun','Moon','Mars'],
  expectedEphemeris: {
    center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
    engineVersion:'PINNED_RUST_VERSION',kernelSetId:'PINNED_KERNEL_ID',
    timeModel:'PINNED_TIME_MODEL'
  },
  provider: rustWasmProvider,
  natalBodyNames: ['Sun','Moon'], // optional; omitted means all validated natal bodies
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}]
});
```

The returned, frozen **`TransitFactsWithProviderResult v0.1.0-experimental`** keeps both `facts` (direction `SKY_TO_NATAL`, no houses or angles) and **provider warning/status**. Critically, `status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'` and `warnings:[{code:'EPHEMERIS_ACCURACY_NOT_VERIFIED',...}]` remain visible. These are never silently promoted to certified astronomical positions just because the angle geometry was evaluated. Callers must preserve them in any downstream API/UI. No fallback to Swiss Ephemeris is present.

Known birth time is mandatory. Unknown-time natal snapshots need a separate explicitly uncertainty-aware workflow. An optional `natalBodyNames` list selects a unique subset of 1..32 existing natal bodies in caller-specified order; unknown, duplicate, sparse or invalid IDs fail before any ephemeris provider I/O. When the list is omitted, all validated natal bodies are used. This provides explicit natal-body targeting without exposing a second competing transit API. Sky body selection already uses the required `bodyNames` parameter.

The natal chart is validated for UTC calendar, zodiac, apparent-of-date provenance, unique finite body positions and optional speeds, and all aspect rules are validated for finite angles/orbs and duplicate IDs **before** any provider I/O. Natal/sky zodiac and engine/kernel/time-model parity are likewise checked before the provider call. Natal data and aspect rules are snapshotted before the first provider await; subsequent caller mutations cannot rewrite the calculation. `getTransitSkySnapshotWithProvider` additionally validates sky UTC, body IDs, provider capabilities and responses. No partial result is returned. This is structural/semantic validation, not astronomical correctness certification.

This PR is **stacked on PR #15 → #13**, and intentionally does not modify the independent transit implementation proposed in PR #12 (stacked on #3). Before merging or promoting any one API, review #12 and #13 together, select the canonical package contract and remove duplicative APIs/exports. Keep the draft stack separate until that decision is made.

## Verification

Test command on an authenticated complete checkout of this PR head:

```sh
node --test test/transit-composition.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-composition.test.ts
npm test
```

Synthetic providers check consumer behavior only. No actual Rust/WASM adapter, real DE441 NASA/JPL kernel, numerical reference comparison, scientific correctness, production integration or Astrolabio compatibility is established here. The repository is private, with a pending outbound licensing review; future distributions must comply with VirgoStars credit requirements and upstream CPAL-1.0 notices. No release, GitHub Actions, automatic merge or production changes.

## Sidereal safety gate

This provider composition accepts only `TROPICAL` sky requests. Although the pure `calculateTransitFacts` API can compare **already transformed**, matching sidereal snapshots, the injected position provider returns raw apparent ecliptic-of-date longitude and does not carry or apply a verified ayanamsa conversion. Therefore even a fully named `SIDEREAL/LAHIRI-v1` request must fail with `UNSUPPORTED_ZODIAC_CONVERSION` before contacting the provider, rather than producing mislabeled longitude. A future sidereal path requires an explicit versioned transform and numerical validation; do not add an implicit fallback or silently convert in this adapter.

## Native local validation gate and cross-module integration tests

From a **complete checkout** of the stacked PR #16 branch, run:

```sh
node scripts/validate-local.mjs
```

The portable local script discovers every `test/*.test.mjs` and `test/types/*.test.ts` file and executes them using native Node.js `node --test` and strict TypeScript NodeNext `tsc --noEmit`. A missing test family, missing compiler or any failing child process produces a nonzero exit status; the script does **not** use GitHub Actions, publish packages, deploy, make network calls or alter production. It uses locally installed TypeScript when available, otherwise a compiler on `PATH` (on Windows, a `tsc.cmd` wrapper via the command shell). If needed, install TypeScript locally first, for example `npm install --no-save typescript@5.8.3`.

`test/transit-stack.integration.test.mjs` checks the **whole experimental consumer path**: manual provider + pure facts versus composed facts must be identical, the provider's scientific-validation warning must survive, unconverted sidereal requests and unknown natal-body selections must stop before provider I/O, and mismatched per-body kernel assertions must abort atomically. These tests use mock positions and do **not** prove astrophysical accuracy or a real Rust/WASM implementation.

Validation evidence at introduction: the script was executed natively with one temporary Node test and one TypeScript type fixture in an **isolated smoke workspace** (both PASS). The four new integration tests were replayed with exact GitHub source module bodies in an isolated JavaScript runner (**4/4 PASS**), **not native Node `node:test`**. The full private-repository checkout suite has not been run in this environment; the command above is the explicit remaining gate before review/merge.
