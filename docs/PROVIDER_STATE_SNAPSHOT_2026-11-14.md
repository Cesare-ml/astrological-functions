# Provider state snapshots — validated data must match published chart values

**Status:** IMPLEMENTED_ISOLATED. Draft PR #54, stacked on draft PR #3.
**Date:** 14 November 2026.

## Bug reproduced against the authentic runtime

Previously, `calculateNatalWithProvider` validated `state.metadata.center`
before taking the copied metadata used in the chart. For a provider exposing
an accessor, a first read could yield `EARTH` (accepted) and a later read
could yield `SUN` (published). The same read/check/use gap existed for
`engineVersion`, `kernelSetId`, `timeModel`, longitude, latitude, and
longitude speed. This is a contract-consistency issue, **not** an
astronomical algorithm or a real Ephemeris source.

The before-fix source `src/index.mjs`, Git blob
`c5b600d3f18de2b5b8d4b533e894745b13d0c822`, was executed in an
isolated V8 evaluator. A synthetic metadata getter returned `EARTH` on
its first read, then `SUN`. The chart **incorrectly stored `SUN`**
despite validating `EARTH`; the getter was accessed twice.

## Fix

Each provider state and its metadata are now captured into stable local
values exactly once. The code freezes a shallow metadata snapshot
**before** checking the Earth center, ecliptic frame, correction mode and
provenance fields, and publishes that same already-validated snapshot.
Numeric longitude, latitude and optional longitude speed are also read
into locals once and reused for validation and natal-body assembly.

This intentionally requires metadata fields to be own enumerable
properties on the provider result: an inherited-only prototype value
must not bypass the snapshot validation. A well-formed plain object
returned by the future Rust/WASM adapter is unaffected.

No fallback to geometric/J2000 coordinates or to Swiss Ephemeris was
added. The provider contract still requires apparent Earth-centered
ecliptic-of-date coordinates; astronomy remains the exclusive
responsibility of VirgoStars Ephemeris.

## Regression coverage

`test/provider-state-snapshot-consistency.test.mjs` adds seven native
`node:test` cases:

1. A dynamic `center` getter must be read once and the published
   chart must retain the validated `EARTH` value.
2. Dynamic `engineVersion`, `kernelSetId` and `timeModel` must agree
   between the immutable body snapshot and the chart-level provenance.
3. Longitude, latitude and longitude-speed getters must be read once
   each, without revalidation gaps.
4. A bad first frame reading must fail closed even if another read
   would yield an accepted frame.
5. The `state.metadata` reference itself must be read once.
6. Shared dynamic metadata changing between body responses must fail
   with `INCONSISTENT_EPHEMERIS`.
7. Metadata fields present only via inheritance must not pass the
   snapshot-based provider boundary.

Exact source and test blob SHA-1 values on the PR branch:

| File | Git blob SHA-1 |
| --- | --- |
| `src/index.mjs` (after fix) | `c0afd5d0fb966f6b9e47606a403cddfe0da8d9fb` |
| `test/provider-state-snapshot-consistency.test.mjs` | `79d1f1c87d4305ae106d3a32c0fe3f8d8cf696ea` |

The authentic updated runtime plus four actual GitHub test files
(new regression, provenance nullish, public provenance, and
natal-to-house composition) were executed by an **adapted isolated
V8 test harness**, with **21/21 passing**. This is **not** native
Node package self-import or full `npm test`.

## Native integration gates still open

On a complete trusted checkout of the PR #54 head based on PR #3:

```sh
node --check src/index.mjs
node --check test/provider-state-snapshot-consistency.test.mjs
node --test test/provider-state-snapshot-consistency.test.mjs
node --test test/provider-provenance-nullish-regression.test.mjs \
  test/provider-public-esm-provenance-regression.test.mjs \
  test/provider-public-house-composition.test.mjs
npm test
```

Then reconcile the export map with draft PRs #69 and #83, perform
strict TypeScript consumer checks, verify the actual Rust/WASM provider,
and document scientific/numeric parity before any downstream migration.
No merge, GitHub Actions, deployment, npm publication, license change,
repo visibility change or production modification is authorized here.

VirgoStars Ephemeris project:
https://github.com/Cesare-ml/VirgoStars-Ephemeris
