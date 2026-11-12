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
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}]
});
```

The returned, frozen **`TransitFactsWithProviderResult v0.1.0-experimental`** keeps both `facts` (direction `SKY_TO_NATAL`, no houses or angles) and **provider warning/status**. Critically, `status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'` and `warnings:[{code:'EPHEMERIS_ACCURACY_NOT_VERIFIED',...}]` remain visible. These are never silently promoted to certified astronomical positions just because the angle geometry was evaluated. Callers must preserve them in any downstream API/UI. No fallback to Swiss Ephemeris is present.

Known birth time is mandatory. Unknown-time natal snapshots need a separate explicitly uncertainty-aware workflow. Input natal data and aspect rules are defensively snapshotted **before the first provider await**; subsequent caller mutations cannot rewrite the calculation. Invalid argument shape and missing rules fail before contacting the provider. `getTransitSkySnapshotWithProvider` validates request UTC, body IDs, pinned provider capabilities and per-body responses. `calculateTransitFacts` subsequently validates both complete snapshots, zodiac and ephemeris parity, and aspect rules. Some malformed natal contents can therefore still cause a provider call **before** the final all-or-nothing rejection; no partial result is returned.

This PR is **stacked on PR #15 → #13**, and intentionally does not modify the independent transit implementation proposed in PR #12 (stacked on #3). Before merging or promoting any one API, review #12 and #13 together, select the canonical package contract and remove duplicative APIs/exports. Keep the draft stack separate until that decision is made.

## Verification

Test command on an authenticated complete checkout of this PR head:

```sh
node --test test/transit-composition.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/transit-composition.test.ts
npm test
```

Synthetic providers check consumer behavior only. No actual Rust/WASM adapter, real DE441 NASA/JPL kernel, numerical reference comparison, scientific correctness, production integration or Astrolabio compatibility is established here. The repository is private, with a pending outbound licensing review; future distributions must comply with VirgoStars credit requirements and upstream CPAL-1.0 notices. No release, GitHub Actions, automatic merge or production changes.
