# F2 — pin injected declination callback before asynchronous requests

Status: **IMPLEMENTED_ISOLATED**, 2026-11-14. Small regression fix stacked on draft PR #74, itself stacked on #73 → #71. No real Rust/WASM provider is integrated.

## Reproduced regression

In the experimental `calculateDeclinationContactsWithProvider`, the injected provider method `provider.getGeocentricEquatorialDeclination(request)` was resolved **again for every body**, including after `await`. Even when the caller supplied one provider object, replacing or deleting the method during the first response could silently switch later requests to a different implementation or raise an untyped `TypeError`.

A getter-backed provider was also evaluated three times for a two-body calculation: once during validation and once for each request. This can change behavior when a getter returns a different callable each time.

Three new tests were first executed against the **original #74 source** and **all three failed**:
- Method replacement during the first response produced inconsistent contact facts.
- A getter was invoked three times rather than once.
- Removing the provider method during the first response caused a later `TypeError`.

## Fix

Capture and validate the provider method exactly once **before the first await**:

```js
const provider = options.provider;
const getGeocentricEquatorialDeclination = provider?.getGeocentricEquatorialDeclination;
if (typeof getGeocentricEquatorialDeclination !== 'function')
  throw new AstrologyError('MISSING_DECLINATION_PROVIDER', 'Injected declination provider required');
// ...
const result = await getGeocentricEquatorialDeclination.call(provider, request);
```

Explicit `.call(provider, request)` preserves `this` for stateful adapters. The original validated request context, body ordering, provenance gates, frames, strict timestamps and error propagation remain unchanged. The **provider object itself** is not frozen and cannot be assumed trustworthy; this fix merely pins the chosen callable during one calculation. It is not provider attestation or astronomical validation.

## Verification performed

Reconstructed **only the relevant isolated modules** from GitHub #71/#73/#74 in a local Node 22.16.0 environment; the `src/index.mjs` stub contains the same `AstrologyError` class behavior but is **not** the complete repository source. Pre-change failing tests were recorded above.

After the fix:
- `node --check src/declination-provider-gate.mjs`: passed.
- `node --test test/*.test.mjs`: **38/38 passed** (35 prior + 3 new).
- `tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts` using TypeScript 5.8.3: **exit 0**.
- Git blob hashes for the local final source and test files match the GitHub branch published files:
  - `src/declination-provider-gate.mjs`: `f0783dbe156d1829e668a50f1bbaa7206315cf4b`.
  - `test/declination-provider-gate.test.mjs`: `b5774b1c4240f48a738ce7f19f1888257f8889cd`.

**Not executed:** `npm test` on a complete authenticated checkout, actual Rust/WASM provider, real NASA/JPL scientific comparison or production adapters. No GitHub Actions introduced; no `main` merge, package release, repo visibility/licensing changes, production deployment or Swiss fallback. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the planned astronomical backend and project attribution is preserved.
