# Public provider → natal chart → house composition regression

**Status:** IMPLEMENTED_ISOLATED, 14 November 2026. This document accompanies
draft PR #54, based on draft PR #3. No production or ephemeris integration.

## Purpose

The public experimental ESM entry
`astrological-functions/ephemeris-provider` exposes the validated
`calculateNatalWithProvider` and `placeNatalBodiesInHouses` contracts.
The natal chart does not manufacture houses or angles: a consumer must pass
an independently sourced, explicitly chosen house cusp set and confirm a
known birth time before computing placements.

`test/provider-public-house-composition.test.mjs` adds **six regression
cases** against the actual public provider import:

1. A synthetic two-body chart (Sun 15°, Moon 345°) with consistent, externally
   supplied 30°-spaced cusp geometry yields house 1 and house 12 respectively.
   Requests and returned snapshots stay frozen; `chart.houses` stays `null`.
2. Changes to **any** of `engineVersion`, `kernelSetId`, or `timeModel`
   between chart and cusp set fail `INCOMPATIBLE_HOUSE_CONTEXT`.
3. Date, latitude, or longitude differences fail
   `INCOMPATIBLE_HOUSE_CONTEXT`.
4. House system mismatch and unsupported `LEGACY_HOUSES_POS` do not
   silently fall back to an alternate placement method.
5. Degenerate cusp geometry fails `INVALID_CUSPS`.
6. An old unversioned mock provider can still produce an experimental natal
   chart but cannot be silently paired with a claimed provenanced house
   set (`INVALID_HOUSE_METADATA`).

These are synthetic contract checks. The numbers deliberately do **not**
constitute astronomical reference positions or demonstrate the scientific
accuracy of VirgoStars Ephemeris.

## Actual source evidence

| File on PR #54 branch | Git blob SHA-1 |
| --- | --- |
| `src/index.mjs` | `c5b600d3f18de2b5b8d4b533e894745b13d0c822` |
| `src/ephemeris-provider.js` | `d3c88aa2c34fbfd56521391020d9a1d4e00c5590` |
| `test/provider-public-house-composition.test.mjs` | `3de12dc4196399f6036884bf9dbe19508b1a4f6e` |

The six test bodies were executed in an **isolated V8 evaluator** using
the actual GitHub runtime source (with ESM export keywords removed only
to load it into the evaluator) and an adapted registration/assertion
harness. Result: **6/6 passed, 0 failed**. Separately, seven existing
PR #54 provenance regression cases ran through the same adapted V8
harness and passed. This is **not a native Node ESM import test** and is
**not** the consolidated repository `npm test`.

The new file also passed the native Node.js 22.16.0
`node --check` syntax validation on a byte-identical local copy.

## Required native checks before integration

From a complete trusted checkout of the PR #54 head with PR #3 as base:

```sh
node --check test/provider-public-house-composition.test.mjs
node --test test/provider-public-house-composition.test.mjs
node --test test/provider-provenance-nullish-regression.test.mjs \
  test/provider-public-esm-provenance-regression.test.mjs \
  test/pilot-provider-consumer-smoke.test.mjs
npm test
```

Also compile real TypeScript provider consumers in NodeNext and Bundler
resolution, verify all subpaths against the export-union planner (draft
PR #69), and check actual consuming Desktop/Astrolabio builds. Keep the
PR **draft** and treat native tests as **unverified** until their results
are captured from the complete checkout.

A real Rust/WASM provider still must prove apparent geocentric
ecliptic-of-date output and kernel/time provenance before powering natal
calculations; geometric J2000 vectors are not interchangeable. Licensing,
source ownership, privacy, ephemeris accuracy and downstream migrations
remain separate release gates. Do not merge, deploy, introduce GitHub
Actions or publish to npm here. Project attribution:
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Compile-time house-profile correlation correction — 14 November 2026

A concrete strict TypeScript contract issue was detected in
`HouseCuspContextInput['cuspSet']`: constructing this field with
`Omit<HouseCuspSetInput, 'metadata'>` erased the correlation between
`houseSystem` and `calculationProfile` from the discriminated
`HouseSystemSelection` union. As a result, a canonical-profile cusp
context could be typed with the legacy-only `egizia` label.

The declaration now composes **`HouseSystemSelection & { cusps, metadata }`**
directly. This preserves the existing discriminated union, including
the intentional acceptance of `egizia` only with the explicit
`VIRGOSTARS_LEGACY_V1` profile. It does not alter any runtime
algorithm, silently reinterpret legacy methods or compute astronomy.

`test/types/provider-public-house-composition.test.mts` is a new
compile-only ESM consumer regression. It covers both valid canonical
and legacy cusp-set contracts, a deliberate canonical/legacy mismatch,
the literal `birthTimeKnown: true` gate (including narrowing an
unresolved boolean), required UTC and full provider provenance fields,
required external cusps and immutable chart/provider/placement types.
Ten `@ts-expect-error` assertions must all correspond to genuine
compiler errors; TypeScript reports an unused directive as TS2578.

### Reproduced before/after with real source

A minimal isolated package was constructed from the authentic
`src/ephemeris-provider.d.ts` GitHub contents. Prior to the correction,
running the new fixture with TypeScript **5.8.3** and strict NodeNext
produced **TS2578 (unused `@ts-expect-error`)** at the legacy-label
case. With the corrected declaration, both strict NodeNext and Bundler
compiled successfully, **exit code 0**:

```sh
tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext \
  test/types/provider-public-house-composition.test.mts --pretty false
tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler \
  test/types/provider-public-house-composition.test.mts --pretty false
```

The exact Git blob SHA-1s of locally compiled bytes match the updated
files on this PR branch:

- `src/ephemeris-provider.d.ts`:
  `ef2524155890d72fe8bea5c6abded5a401ea8186`.
- `test/types/provider-public-house-composition.test.mts`:
  `42f60e9f871ff4df50d4e1af63bc51ee434611d3`.

These are **real local TypeScript compilations** of the authentic
declaration contract plus the new consumer fixture. The runtime Node
tests against the **full genuine PR #54 checkout** (and consolidated
repository `npm test`) remain unexecuted and must not be inferred
from the TypeScript results. PR #54 still depends on draft PR #3;
no GitHub Actions, branch merge, deploy, npm publish or visibility change.
Attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris.


## Native TypeScript consumer gate with unchecked-index safety — 14 November 2026

The two real compile-only provider consumers are now covered by
`test/provider-typescript-consumers.test.mjs`, a **native Node
`node:test`** harness that runs the system's existing `tsc` without
network access or installing a dependency. Each run compiles **both**
`test/types/provider-package-consumer.test.mts` and
`test/types/provider-public-house-composition.test.mts`, with four
strict configurations:

- NodeNext, strict + `noUncheckedIndexedAccess`;
- NodeNext, additionally `exactOptionalPropertyTypes`;
- Bundler (`module=ESNext`), strict + `noUncheckedIndexedAccess`;
- Bundler, additionally `exactOptionalPropertyTypes`.

`noUncheckedIndexedAccess` exposed a genuine fixture problem:
`placed.placements.Sun.house` is not type-safe when
`placements` is a `Record<string, ...>`. The desired body may be
absent at runtime, so the consumer must check for `undefined` before
using the placement. The fixture now explicitly narrows
`sunPlacement` with that guard and verifies readonly fields **after**
narrowing; the provider's public type contract and runtime remain
unchanged.

Run from a trusted checkout:

```sh
node --check test/provider-typescript-consumers.test.mjs
node --test test/provider-typescript-consumers.test.mjs
```

The tests run as part of `node --test`/`npm test` when the repository
is checked out and TypeScript is on PATH. They only **skip** when the
compiler is genuinely absent (`ENOENT`); a present compiler that
fails its version probe or compilation must produce a failing test.
A skipped compiler gate is *not* release validation. No GitHub Actions
are added.

### Verified evidence

Using Node **v22.16.0** and TypeScript **v5.8.3** in an isolated
provider package reconstructed from authenticated GitHub file blobs:

- Initial stringent compiler pass failed with **TS18048** on
  `placed.placements.Sun`, demonstrating the unchecked-index gap.
- After the explicit guard, all **4/4 native Node-run TypeScript tests**
  passed with **0 failures, 0 skips**, covering both authentic
  compile-only consumer fixtures together.
- `node --check` passed for the native test file.
- Exact GitHub blobs match the locally tested files:
  - `test/types/provider-package-consumer.test.mts`:
    `0d097e38cf5263ead900f00d69699ac74ee824c2` (unchanged).
  - `src/ephemeris-provider.d.ts`:
    `ef2524155890d72fe8bea5c6abded5a401ea8186` (unchanged).
  - `test/types/provider-public-house-composition.test.mts`:
    `02b7cf558142604440bfb82e7ff2f711760e6474`.
  - `test/provider-typescript-consumers.test.mjs`:
    `bdee83c5422f2e41a44fe22589d5ece5859d8c87`.

This **does not** demonstrate full PR #54 native runtime
`npm test` in its actual stacked worktree; no real Ephemeris Rust/WASM
provider was invoked and no scientific parity or downstream
Astrolabio/Desktop build was tested. PR #54 remains a draft based on
draft PR #3. PRs #69 and #83 reconcile ESM exports separately.
No merge, deploy, npm publication, license/visibility change, or
GitHub Actions. Attribution:
https://github.com/Cesare-ml/VirgoStars-Ephemeris.
