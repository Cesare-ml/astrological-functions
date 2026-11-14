# F7 — Private 12-subpath ESM integration staging (14 November 2026)

**Status: INTEGRATION_STAGING / NOT VALIDATED / DRAFT.** This is a deliberately unmerged research branch, **not** an approved distribution, scientific kernel, npm release or backend/Desktop migration. Production remains `Cesare-ml/virgo-stars`. No GitHub Actions, automation, real user data, interpretation content or Swiss source was added.

## What is actually assembled

The branch `integration/esm-12-subpaths-staging-20261114` starts from the **PR #82** external-consumer declination suite (the final dependent PR of #71 → #73 → #74 → #75 → #76 → #78 → #80 → #82). It contains a **private `package.json`** with all 12 manually reviewed `types` + `import` ESM subpaths and the unchanged `.` root.

The combined exports are sourced from actual pending feature branches:

| Feature | Upstream draft PR | ESM paths |
| --- | --- | --- |
| Transit facts/events | #25 | `./transits`, `./transit-events` |
| Dodecatemoria | #41 | `./dodecatemoria` |
| Experimental provider facade | #54 | `./ephemeris-provider` |
| House comparison / pinned sources | #60 | `./house-method-comparison`, `./whole-equal-house-comparison`, `./pinned-whole-equal-comparison` |
| Sourced house matrix | #65 | `./sourced-house-placement-matrix` |
| Zodiac decan facts | #68 | `./zodiac-decan-facts` |
| Declinations / provenance / abortable provider | #80, plus #82 consumer smoke | `./declination-contacts`, `./sourced-declination-contacts`, `./declination-provider` |
| Read-only export planning, staging audit and runtime preflight | #83, based on #69 | scripts, audit fixtures and tests |

All preexisting `package.json` settings other than the **union of `exports`** are retained, including `private:true` and `type:module`. Other subpaths remain blocked; no CommonJS or wildcard condition was enabled.

A single **Git tree staging commit** copies existing *exact* Git blob references from upstream feature branches, retaining their transitive `src` modules and Node/TypeScript test files; 128 tracked paths changed in the initial staging commit compared with #82, and the stage tree contained 98 source test files before adding new integration tests. These are source copies into a temporary branch, **not merges of the original PRs**. Do not close original PRs or assume downstream dependency decisions are resolved.

### Two deliberately reconciled overlaps

1. `src/index.mjs`: the existing PR #82 root entrypoint did not yet export the house/provider functions required by PR #54's `ephemeris-provider.js` facade. The staging root starts from **PR #54's tested source** and replaces only the `normalize360` + `signedAngularDistance` function block with the version from **PR #68**, preserving the sub-ULP seam fixes from #68. Staging root Git blob: `c674d65532df574a6e211e5994708c2b95dfab80`. This composed root was **not runtime-tested** in an authenticated checkout.
2. `test/math.test.mjs`: PR #54's expanded native regression suite Git blob `076c2c4c0ab124173eba21f60e1d32effc2ea7c4` was intentionally selected instead of the older baseline test blob `7e04dc63e4a1dfd8124ba36b45849d1b1a6c8f27`. No other differing test/source blob collision was found among the selected paths.

### Static preflight actually verified remotely

The initial Git tree assembly used the source PR branches' Git blob SHA references and the approved read-only candidate union fixture. The GitHub tree showed:

- **13 export entries** = original root + 12 typed ESM subpaths;
- **25/25 literal export targets present** (root JS runtime, 12 subpath runtimes, 12 declaration files), no missing target in the assembled path set;
- **18 runtime modules including the provider adapter plus the root** checked for static relative `from './...'` dependencies; every observed direct import path resolves to a module included in the staging tree;
- required named functions for the provider facade are present in the combined root, including `calculateNatalWithProvider`, `resolveHouseSystem`, `resolveHousePlacementPolicy`, `locateLongitudeWithHousePolicy`, `validateHouseCuspSet`, `validateHouseCuspContext`, and `placeNatalBodiesInHouses`.

These are **static Git file/source checks only**, not Node module loading, TypeScript compilation, real NASA/JPL ephemeris accuracy or verified dependency compatibility.

## Newly added integration gates (must be executed on checkout)

`test/esm-12-subpath-integration.test.mjs` composes the existing #83 tools and tests:

- exact match of `package.json.exports` with pinned `fixtures/esm-export-union-plan-20261114.json`;
- real stage target audit, asserting all 25 paths are ordinary files;
- actual *child process* ESM import of the package root and all 12 paths using `verifyEsmCheckout`, including 12 expected named functions;
- regression of boundary precision `normalize360` / `signedAngularDistance`;
- CommonJS and unpublished source-path rejection.

`test/types/esm-12-subpath-integration.test.ts` exercises imports from all 12 public private-package subpaths in strict NodeNext, plus two negative cases.

From a **full authenticated checkout of this integration branch**, in an environment with Node.js >=20 and TypeScript installed:

```sh
node --test test/esm-12-subpath-integration.test.mjs
npm test
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
node scripts/verify-esm-checkout.mjs . \
  --expect ./transits --expect ./transit-events \
  --expect ./dodecatemoria --expect ./ephemeris-provider \
  --expect ./house-method-comparison --expect ./whole-equal-house-comparison \
  --expect ./pinned-whole-equal-comparison --expect ./sourced-house-placement-matrix \
  --expect ./zodiac-decan-facts --expect ./declination-contacts \
  --expect ./sourced-declination-contacts --expect ./declination-provider
```

**These commands have not been executed on the assembled integration branch.** Existing branch-local test evidence (declination 62/62, planner's own 15/15, and source feature PR runs) does **not** imply the union suite passes. The new integration test files are **added and pending execution**, not described as green.

## Remaining blockers before any main merge

1. Run the native staged suite and fix failures without silently replacing other PR versions; validate TypeScript imports and all 12 provider capabilities in a true consumer process.
2. Reinspect concurrently changing PR heads and check compatibility (especially the compound root from #54 / #68, feature options, and exact test semantics).
3. Validate against real VirgoStars Ephemeris **Rust/WASM bindings** once a stable interface actually exists: the present provider is synthetic and caller-asserted, not cryptographic provider attestation or NASA/JPL parity.
4. Full independent AstroLabio / Windows / Tauri packaging, rollback, source/notice/license review and explicit owner decision before public release or production switch.

Retain the distinct [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) CPAL-1.0 attribution obligations; this private Functions repo still has **no approved outbound public license**. No merging of PRs or production deployment is authorized merely by the staging branch.
