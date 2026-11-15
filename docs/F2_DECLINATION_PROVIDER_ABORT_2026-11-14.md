# F2 — Opt-in cancellation of experimental declination provider requests

**Status:** IMPLEMENTED_ISOLATED, 2026-11-14. This draft feature is stacked on PR #76 → #75 → #74 → #73 → #71. It does not integrate or validate the future Rust/WASM ephemeris bindings and changes no production or Astrolabio routes.

## Motivation

The experimental `calculateDeclinationContactsWithProvider` calls a provider asynchronously for 1–32 source bodies and 1–32 target bodies. A desktop UI can change the selected charts before the old provider has responded. Without a cancellation contract, the old computation may remain pending and later produce stale results.

## Contract

A caller may pass **`signal?: AbortSignal`** in `DeclinationWithProviderOptions`:

```js
import { calculateDeclinationContactsWithProvider } from '../src/declination-provider-gate.mjs';

const controller = new AbortController();
const pending = calculateDeclinationContactsWithProvider({
  ...options, // Explicit snapshots, coordinates, provenance, definitions and provider.
  signal: controller.signal,
});
// When the user switches charts or closes the panel:
controller.abort('chart changed');
// The promise rejects with AstrologyError.code === 'DECLINATION_PROVIDER_ABORTED'.
```

A signal is **optional**. Without one, the provider request object remains unchanged and no timeout or abort policy is silently introduced. If present:

- Reject an invalid object with `INVALID_DECLINATION_ABORT_SIGNAL` before contacting the provider.
- Reject an already-aborted signal with `DECLINATION_PROVIDER_ABORTED`, making **zero** provider requests.
- Pass the **same AbortSignal by identity** to every frozen provider request; this allows a future cooperative provider to stop its own work.
- Listen for abort before calling the provider, race the response against cancellation, remove listeners upon success/failure, and stop further body requests after cancellation. The caught provider promise is still observed, so a late resolution/rejection does not cause partial or stale results.
- Preserve original errors when an uncancelled provider call rejects. Existing pinned method receiver, source→target order, immutable snapshots, explicit frame and kernel provenance, and strict numeric validation are unchanged.

**Limit:** The outer promise rejects promptly on abort, but an opaque provider that ignores the signal may continue doing internal compute/I/O. Cancellation is not a guarantee that Rust/WASM kernel work actually stops, and this experimental interface does not authenticate the provider or establish astronomical accuracy. UI consumers must still avoid displaying stale results from other asynchronous workflows.

## Verification performed

The local directory is an **isolated reconstruction** of GitHub PR #76's exact source/test Git blobs with a minimal equivalent `AstrologyError` class. It is **not** an authenticated full repository checkout.

1. Seven cancellation regressions were introduced *before* the implementation: **6 failed / 1 passed** on the pre-change code (the passing case confirms backward-compatible un-signalled requests).
2. The implementation then passed `node --check src/declination-provider-gate.mjs` and `node --test test/*.test.mjs`: **50/50 native Node 22.16.0 tests passed** (43 existing + 7 new).
3. Strict TypeScript 5.8.3 NodeNext fixture compilation succeeded:

```sh
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

The TypeScript fixture now also verifies `AbortSignal` as a valid argument and rejects non-signal values at compile time.

**Still unverified:** complete-repository `npm test` on an authenticated checkout; real Rust/WASM binding, kernel cancellation, science parity with NASA/JPL, performance/UX under load, downstream package export reconciliation or application integration.

No GitHub Actions, package.json/export map, main merge, release, deployment, privacy, license/visibility change or Swiss fallback. The independent [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the only planned astronomy engine, with its CPAL-1.0 attribution requirements preserved.
