# F2 — Receiver-safe provider invocation despite callable `.call` shadowing

**Status: IMPLEMENTED_ISOLATED / DRAFT, 2026-11-14.** This is a targeted regression fix stacked on PR #86 → #85 → #84 (combined private ESM staging). It does not change `package.json`, astronomical algorithms, client releases, or the Rust/WASM contract.

## Reproduced bug

The provider gate correctly captures the selected `getGeocentricEquatorialDeclination` callback once before awaiting, preserving the provider receiver for stateful adapters. Its `invokeProvider` function previously invoked that callback as:

```js
method.call(provider, request)
```

A JavaScript function object can define its own `.call` property, hiding the inherited `Function.prototype.call`. That property can be non-callable, can spoof the callback result, or can change between awaited body requests. The previously pinned *function object* therefore was not necessarily the function actually invoked. Both the plain Promise path and the optional `AbortSignal` path were affected.

Four new native Node tests reproduced this flaw **before** the patch: **all four failed**. They cover a non-callable own `.call` with and without cancellation, a shadowed `.call` that throws instead of invoking the actual method, and a callable that changes its own `.call` after the first awaited body.

## One focused implementation fix

In `src/declination-provider-gate.mjs`, replace **both** `method.call(provider, request)` call sites with:

```js
Reflect.apply(method, provider, [request])
```

This invokes the previously pinned callable with the original `provider` as `this`, without looking up the potentially shadowed property `method.call`. It changes neither result shapes, source/target request ordering, optional cancellation behavior, input/provenance validation, contact geometry, nor the package export map. It does **not** claim security against modification of global JavaScript intrinsics, untrusted native/WASM implementations or dishonest caller-asserted astronomical provenance.

## Verified red-green evidence

**Local test workspace:** isolated copy of the previously reconstructed PR #80/#82 declination package, using the exact GitHub provider source/test blob IDs from the PR #86 integration chain. The local `src/index.mjs` uses an equivalent minimal `AstrologyError` implementation, so this was **not** the full authenticated #84/#86 12-subpath staging checkout.

Environment: Node.js v22.16.0; TypeScript v5.8.3.

- **Before fix:** the four new tests each failed against the pre-existing provider callback implementation.
- **After fix:** `node --check src/declination-provider-gate.mjs` succeeded.
- **After fix:** `node --test test/*.test.mjs` passed **66/66 native Node tests**, including the existing five-layer declination/package/external-consumer suite and four regressions.
- Strict NodeNext consumer compile: `tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts` exited **0**.
- Published GitHub file blob SHA-1 IDs match the exact local test files, byte for byte:
  - `src/declination-provider-gate.mjs`: `5806e8f40feeea7d57186b99ee0542386b840a8e`
  - `test/declination-provider-gate.test.mjs`: `d0415a57cbe02dc47ef1361aa447e5d6067434dd`

**Not executed:** full genuine repository `npm test` on the combined staging branch, all twelve exported consumer modules with native Node/TS, Tauri/Windows package testing, actual Rust/WASM declination provider, NASA/JPL ephemeris reference comparisons. No claim of release readiness follows from the isolated tests.

## Follow-up gate

Re-run the 12-subpath integration test suite, the source/type closure checks from #85/#86, strict TS NodeNext, the genuine Tauri consumer and an independently validated Rust/WASM binding before merging/releasing. Ensure the revised provider implementation remains on the staging chain and is reconciled if earlier draft PRs are merged separately.

This private repository remains an unreleased experimental workspace. No `main` merge, deploy, npm publication, GitHub Actions, license or visibility changes, Swiss fallback or real user data. Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) project credit and separate CPAL-1.0 obligations.
