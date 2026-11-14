# F7 — Read-only ESM export staging preflight (14 November 2026)

**Status: IMPLEMENTED_ISOLATED.** This draft tooling extension is stacked on the existing read-only union planner PR #69. It does **not** merge any feature PRs, publish the package, replace `package.json`, import experimental astronomy or modify the production application. The private `astrological-functions` repository has not approved an outbound public license.

## Verified cross-PR inventory

The pinned manifest fixture `fixtures/esm-export-candidates-20261114.json` holds a reviewed **snapshot** of the following GitHub `package.json` blobs. Each value was inspected through the connected GitHub repository; **do not assume the branches have remained unchanged after the snapshot**.

| PR | Subpath count | Manifest blob |
| --- | ---: | --- |
| #25 transit facts/events | 2 | `d5fff324b5e309880562d5556df87637e583ab3c` |
| #41 dodecatemoria | 1 | `104afd423f22fb6fcfe6a7f8ff25824b4b03f684` |
| #54 ephemeris provider | 1 | `9f638fd753c036c8addd9203aae59fb6fd20b181` |
| #60 house comparison | 3 | `6fd996285dd989afd4f903de143cd04eead6be79` |
| #65 sourced house matrix | 1 | `f1d946b6c45b4db74914d3530b574dcf44d982ea` |
| #68 zodiac decan facts | 1 | `f1eb92d225fa54b12efb070141fb45e92d2894cd` |
| #80 declination contacts/provider | 3 | `3609e6eadef7b714ac31d59e8efeba5b297304f7` |

Baseline `main` manifest blob: `7950cfbc2853a7ba73744d34d294d5cb1899e826`.

**Snapshot result:** seven candidate manifests, **12 distinct subpaths plus the unchanged root**, **25 literal target files** (one root runtime, 12 JS imports and 12 TypeScript declaration targets). No duplicate subpath names or non-`exports` manifest field differences appear among these seven versions. The read-only, deterministic proposed map is retained at `fixtures/esm-export-union-plan-20261114.json`. This corrects an earlier six-PR, 11-subpath inventory that omitted PR #41.

All **24 source target files** for these 12 subpaths were individually verified to exist on **their own source PR branches**. This does **not** mean the target files, their transitive imports or their feature dependencies coexist on one staging branch.

## New audit of the staged checkout

`scripts/audit-esm-export-stage.mjs` composes the existing `planEsmExportUnion` contract from PR #69, then checks every proposed root/runtime/declaration target in a **separately assembled staging directory**. It is fully read-only: no checkout, branch operation, network request, module import, packaging or file modification.

It fails closed on:

- Missing runtime or declaration targets, including paths not yet brought over from other PRs
- Paths differing only in case (important for Windows), unexpected symlinks, directory-as-file and intermediate non-directory paths
- Invalid stage roots and unsafe/contradictory manifest exports rejected by the existing planner

It emits JSON with `status`, `exportCount`, `totalTargetCount`, `presentTargetCount`, `missingTargetCount`, `issues` and `nonExportDrift`. Exit codes: **0** = all listed literal paths exist; **2** = at least one target is blocked; **1** = invalid stage root/manifest or other validation error.

From a workspace with **trusted, individually saved candidate manifest copies** and an already assembled staging directory:

```sh
node scripts/plan-esm-export-union.mjs \
  review/main/package.json review/pr25/package.json review/pr41/package.json \
  review/pr54/package.json review/pr60/package.json review/pr65/package.json \
  review/pr68/package.json review/pr80/package.json

node scripts/audit-esm-export-stage.mjs ./staging-package \
  review/main/package.json review/pr25/package.json review/pr41/package.json \
  review/pr54/package.json review/pr60/package.json review/pr65/package.json \
  review/pr68/package.json review/pr80/package.json
```

**Important:** a `READY` report certifies *only presence and exact case of ordinary target files*. It is **not** a successful import, TypeScript compile, scientific parity check, license review or integration approval. After a real staging branch is assembled, also run the complete existing Node/TypeScript test suites, consumer import smoke, bundler/Desktop tests and Rust/WASM ephemeris contract checks before considering any production migration.

## Executed synthetic validation

Local environment: Node.js **v22.16.0**, Linux, isolated reproduction of the #69 planner's logic plus this new staging auditor. This was **not** a full authenticated repository checkout.

```sh
node --check scripts/audit-esm-export-stage.mjs
node --test test/audit-esm-export-stage.test.mjs
```

**15/15 deterministic native Node tests passed** after adding a minimal fix to the planner. Tests cover the 13-entry union snapshot, exact persisted plan, complete synthetic stage, a PR #80-only mock stage missing 18 targets, missing `.d.mts` files, case mismatches, symlink targets and roots, file/directory confusion, typed invalid baseline/conditions, and CLI exit codes/unchanged input manifests.

The prior planner read `root.toLowerCase()` *before* rejecting a missing root, generating an untyped `TypeError`. The one-line guard now lets `checkedExports` raise the documented `INVALID_EXPORT_MAP` or `INCOMPATIBLE_PACKAGE` instead. No behavior changes for valid root exports.

As an additional **local reconstructed snapshot** (not an actual integrated GitHub checkout), the auditor examined the PR #80 declination-only source tree: **7 of 25 union targets present**, **18 absent** across the other nine subpath names. This is an explicit **BLOCKED** preflight result, not a reason to publish a 13-entry `package.json` before gathering the dependencies.

### Validation exclusions and integration order

- The isolated tests exercised the same planner algorithms but **not a byte-identical full checkout of PR #69**; do not claim the existing PR #69 full suite or full repository `npm test` was run.
- GitHub file blobs for this PR's **new staging script, manifest fixture, union fixture and tests** are compared to the exact bytes locally executed; the planner patch is applied directly on a fresh branch based on the inspected PR #69 file.
- The declination branch chain remains **#71 → #73 → #74 → #75 → #76 → #78 → #80 → #82** and must be integrated in dependency order. The other feature branches must be reconciled independently; blindly replacing a manifest risks losing paths.
- No real NASA/JPL scientific validation, published Rust/WASM binding, full Tauri/Windows QA, npm release, GitHub Actions addition, production DB writes, repository visibility/license changes or `main` merge is authorized by this test.

Keep source, kernel and consumer licensing separate; the public [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) repository uses CPAL-1.0 with attribution obligations, while the private Astrological Functions project still requires its own rights review.
