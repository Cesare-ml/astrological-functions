# F2 — Single-read validation for injected declination provider inputs and outputs

**Status: IMPLEMENTED_ISOLATED, 2026-11-14.** Draft fix stacked on PR #75, which depends on #74 → #73 → #71. No actual Rust/WASM astronomy or production integration.

## Problem and regression evidence

JavaScript objects may supply dynamic getters or proxy values. The experimental `calculateDeclinationContactsWithProvider` previously **validated properties and then read them again for use**, allowing different numeric and semantic values to be accepted after the checks.

Five new deterministic synthetic tests reproduced failures against the exact **PR #75** implementation:

1. A provider's `declinationDeg` getter returned +18° during range validation and -18° when facts were assembled, changing an expected contra-parallel match.
2. A caller-supplied `engineVersion` getter changed after its syntax validation, so the calculation pinned a different version.
3. A `frame` getter changed from `ICRS` to `TRUE_EQUATOR_OF_DATE` after frame validation.
4. A `bodyIds` getter substituted `Venus` for the initially validated `Sun`.
5. A `maxOrbDeg` getter narrowed the accepted orb after validation.

All five tests failed on the original code: **38 passed, 5 failed**.

## Implementation

Within `src/declination-provider-gate.mjs`, capture each of these values once **before validation** and validate the same snapshot subsequently passed to the frozen request or result.

- Snapshot the selection's `snapshotId` and bound body-name list once, then check length and unique identifiers. Preserve the 1–32 limit before cloning.
- Snapshot coordinate semantics (`origin`, `kind`, `frame`, `corrections`) once.
- Snapshot all required provenance identifiers once before validating.
- Snapshot `snapshotId`, `bodyId`, UTC, numeric declination and coordinate/provenance records from a provider response before comparing and freezing the value.
- Snapshot direction and each configured contact ID/orb before validating. Explicitly reject missing definitions and sparse arrays.

This avoids the specific **check/use mismatch**; it does not attest that a provider is genuine, prevent getters from throwing errors, or guarantee numerical accuracy. The pinned callable behavior from PR #75, error semantics, source→target ordering and astronomical boundary are preserved. The upstream Rust engine remains the sole planned authority for astronomy.

## Local validation and reproducibility

Isolated Node.js v22.16.0 workspace recreated from **exact** source and test Git blob IDs of PR #75 (not a full GitHub checkout). The local root `index.mjs` is an equivalent minimal `AstrologyError` stub, while all three contact/provider production modules are the actual bytes from the stacked code.

```sh
node --check src/declination-provider-gate.mjs
node --test test/*.test.mjs
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

After the fix: **43/43 native Node tests passed**, `node --check` passed, strict TypeScript v5.8.3 compile **exit 0**. The exact locally tested code/test Git blob SHA-1 IDs match uploaded branch files:

- `src/declination-provider-gate.mjs`: `90d9b274b5705686eed39b7bf26bf7a9a8378c85`
- `test/declination-provider-gate.test.mjs`: `2ffa4c0ae20d491575ef8c6bdd385a9f209b887d`

**Not run:** `npm test` on a full authenticated repository checkout, real Rust/WASM provider calls, NASA/JPL reference comparisons, VirgoStars backend/Astrolabio compatibility or package export integration. This remains an isolated synthetic contract validation.

No `main` merge, `package.json` modification, GitHub Actions, deployment, license/visibility change, publication, Swiss fallback or client data. Keep [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution.
