# F7 — Transitive TypeScript declaration closure for private ESM staging

**Status: IMPLEMENTED_ISOLATED / DRAFT, 2026-11-14.** Stacked on #85, which is stacked on the combined staging draft #84. Do not merge directly into `main`, publish to npm, deploy to VirgoStars/Astrolabio, or change the repository's current private/unlicensed status.

## Problem

The preceding read-only ESM preflight checked that all 12 published TypeScript declaration **entrypoints** existed, but did not traverse declarations referenced **by those declarations**. For example, `src/sourced-house-placement-matrix.d.mts` may import other method/point declarations, and `src/transit-event-pipeline.d.mts` references transit-search type modules. A missing nested `.d.mts` file could leave the package unconsumable even if the 25 literal ESM targets and JavaScript graph were all present.

The source-closure checker additionally had a lexical gap for `export type { ... } from './something.mjs'`; the new tests reproduce this and require it to be detected.

## Specific change

Extend the existing `scripts/verify-esm-source-closure.mjs` (no new planner or dependencies) with a **separate TypeScript declaration graph**, seeded from the currently exported `types` targets. For each declaration file:

- Resolve explicit relative `.mjs` references to `.d.mts`, `.js` references to `.d.ts`; accept explicit `.d.mts` and `.d.ts` references
- Follow `import type`, `export type ... from`, ordinary imports/re-exports, `import('./file.mjs').Type`, and triple-slash reference **path** directives
- Handle direct references to *published* `astrological-functions/...` subpaths using the package's validated export map; reject unlisted subpaths and other unpinned bare package imports
- Reject extensionless type paths, out-of-package references, missing/case-mismatched target declarations and symlinked paths; visit cyclic type graphs only once
- Preserve all previous JavaScript source import checks and `node --check` behavior unchanged

The resulting read-only report additionally contains `declarationModuleCount`, `declarationDependencyEdgeCount`, `declarationFiles`, and `declarationEdges`. The older `declarationCount` still means **exported declaration entrypoints**, not the size of the transitive closure.

The stage-specific test `test/esm-source-closure-staging.test.mjs` now asserts that the *actual* combined 12-subpath checkout has at least 12 reachable type declaration modules and includes the provider, transit and house matrix declaration entrypoints.

## Verification performed, not inferred

Local offline environment: Node.js **22.16.0**, TypeScript **5.8.3**. The authenticated repository could **not** be cloned because direct `github.com` DNS resolution failed; no full 12-subpath native test was performed.

On a local copy of PR #85's exact source/tests plus the patch:

```sh
node --check scripts/verify-esm-source-closure.mjs
node --test test/verify-esm-source-closure.test.mjs
```

**24/24 passed** (14 existing + 10 new). New tests cover chained `.d.mts` references, missing and mis-cased types, NodeNext `.js` → `.d.ts` behavior, own-package subpath imports, blocked third-party dependencies, triple-slash references and inline import types, escape/symlink paths, and extensionless references.

The updated checker was then executed against the separate, **reconstructed** PR #80/#82 declination package:

- `READY`, **4** ESM export entries (root + three declination modules)
- **3** exported declaration entrypoints, **3** reachable declaration modules, **3** declaration dependency edges
- **4** runtime modules, **5** JavaScript dependency edges
- The reconstructed declination package's `npm test` still passed **62/62** and strict TypeScript NodeNext `tsc --noEmit` returned exit 0.

After upload, GitHub blob SHA-1 matches the exact locally tested file bytes:
- `scripts/verify-esm-source-closure.mjs` — `dc62a2b55a40dd20277362b3a67c1ac2dfdd21da`
- `test/verify-esm-source-closure.test.mjs` — `dcda8824f6e57cebcbab3c8fcbf8af7ef77c706d`

**Limits:** The declaration scanner remains a **conservative lexical preflight**, not an AST-based complete TypeScript resolver or proof of semantic type correctness. It does not replace a full `tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext` run against the actual integrated staging branch. Declaration `types` references and package dependency types still require a TypeScript compiler review. No real Rust/WASM provider, JPL ephemeris scientific check, or Windows/Tauri Desktop validation is claimed.

## Required full staging validation

On a complete trusted checkout of the new dependent branch:

```sh
node scripts/verify-esm-source-closure.mjs .
node --test test/verify-esm-source-closure.test.mjs test/esm-source-closure-staging.test.mjs
node --test test/esm-12-subpath-integration.test.mjs
npm test
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

Do not change the PR status from draft or merge the #71 → #73 → #74 → #75 → #76 → #78 → #80 → #82 → #84 → #85 → this PR stack before that full check and integration review. Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution and its separate CPAL-1.0 obligations.
