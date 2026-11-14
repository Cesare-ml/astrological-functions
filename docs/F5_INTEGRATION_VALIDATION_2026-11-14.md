# F5 integration validation — 2026-11-14

## Scope and exact ancestry

Branch: `integration/f5-transit-utc-20261114`. Draft PR: [#79](https://github.com/Cesare-ml/astrological-functions/pull/79), based on the existing draft PR #21 branch. The integration began with two-parent merge commit `3d1af4a64cc0c22d0295ccc591f5c48832d8dc93`.

- First parent: PR #21 at `4f4a345b13b9ddedb65e9acccde182baa99fe51a` (includes PRs #13 → #14 → #17).
- Second parent: PR #72 at `599ce8bb6632d9312202dc143fe9860e35e57437`.
- PR #21 contributed 21 changed paths relative to `main`. PR #72 contributed 28 changed paths. **No overlapping file paths.**
- The merge tree used the **exact 28 original PR #72 Git blob SHAs**, overlaid on the exact PR #21 tree. GitHub comparison reported all 28 paths and no changed PR #21 paths against that branch. No direct changes were made to the five source PR branches or `main`.

## Actually executed local validation

An isolated Node **v22.16.0** local fixture used **three byte-for-byte exact GitHub source blobs** from PR #21:

| Module | Git blob SHA-1 |
| --- | --- |
| `src/transit-event-pipeline.mjs` | `1285bb1f587977167556466610fc2766cb180597` |
| `src/transit-interval-scan.mjs` | `ce23e63a1af116ef17bd1f8de8136aa73dc6be12` |
| `src/transit-exact-hit.mjs` | `518c98fb59d68d6b6a38f69ff632ba96c74152ab` |

The local fixture also contained the previously reviewed PR #72 runtime modules and their consumer declarations; these were checked against the GitHub blobs during PR #72 development. **Only** the `AstrologyError` class from `src/index.mjs` was supplied as a dependency-only stand-in rather than using the private repository's complete `index.mjs`. This is **not** a full checked-out repository.

These commands **were executed** locally:

```sh
node --test test/*.test.mjs
# 49/49 focused synthetic runtime tests passed

node scripts/manual/transit-pr21-smoke.mjs
# 5/5 ACTUAL F5 pipeline runtime integration tests passed

tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext scripts/manual/transit-pr21-typecheck.ts
# TypeScript 5.8.3 strict NodeNext check passed
```

The 5 end-to-end **synthetic** cases cover a conditional sign-change candidate, unresolved tangency, repeated crossings across a chunk seam, incompatible `J2000` provider metadata, and propagation of scan provider-call budget exhaustion. The exact updated manual smoke test file has Git blob `61ccf3afff5b99a3d381f3a8aa8a14198e0c4084`, matching the locally executed fixture.

## Blockers and complete-checkout test recipe

The real PR #21 source was executed, **not** a stub for the F5 pipeline. Nevertheless, the synthetic provider's asserted enclosures are not independently proven, and the Rust/WASM/JPL astronomical provider has not been integrated. Do not interpret results as verified planetary events or complete transit searches.

On a complete checkout of this integration branch, repeat:

```sh
npm test
node scripts/manual/transit-pr21-smoke.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext scripts/manual/transit-pr21-typecheck.ts
```

This repository remains private and unreleased. Full native `npm test`, tests of all stacked PR #21 files with their full original dependencies, review of provenance/coverage, consumer export-map coordination, timeouts/cancellation, public-license permission and scientific reference checks are **not yet certified** by the above local focused validation. Do not merge to `main` or deploy based solely on this evidence. No GitHub Actions were added.
