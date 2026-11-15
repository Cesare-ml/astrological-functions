# F7 — Parse-only source closure preflight for twelve-path ESM staging

**Status: IMPLEMENTED_ISOLATED / DRAFT, 2026-11-14.** Stacked on PR #84, which stages the actual source from candidate export PRs. This change **does not** merge any source PR, run GitHub Actions, publish npm artifacts, enable a real Rust/WASM ephemeris, perform NASA/JPL parity validation, or change `main`/VirgoStars production.

## Why this guard exists

PR #83's `audit-esm-export-stage.mjs` verifies that each of the **25 literal targets** declared by the 12-subpath export union exists. PR #84's `verify-esm-checkout.mjs` performs a separate, **executable** Node import smoke. A missing **transitive** `import './...'` dependency may be overlooked by the first check, while the second check imports trusted code and can evaluate module top-level statements.

The new `scripts/verify-esm-source-closure.mjs` adds a complementary **parse-only** check:

- Validate the *actual staged* private ESM `package.json` and its `types`/`import` map with the existing `planEsmExportUnion` code.
- Confirm all exported runtime and declaration files are regular, exact-case files; refuse symlinks, directory-as-file and paths leaving the stage.
- Traverse statically written relative `import` and `export ... from` statements, including literal `import('./x.mjs')` expressions, without executing them. Follow nested imports, report the deterministic list of runtime modules/edges and visit circular graphs only once.
- Reject unpinned bare imports, extensionless local dependencies, missing/mis-cased files, traversal and computed `import(variable)`. An explicit `node:` builtin is accepted only if recognized by Node.
- Invoke **`node --check`** on every reachable runtime file. This parses ESM syntax but does not import/execute package code; no arbitrary build scripts, network requests or user files are involved.
- Emit machine-readable JSON or a typed error with a nonzero CLI status; never write to the staged source tree.

These controls deliberately **do not** replace real import resolution, complete TypeScript dependency verification, npm packing, or actual provider execution. Static import discovery uses known source statement patterns rather than a general-purpose JavaScript AST parser, so it is a *preflight*, not proof that all possible dynamic or unusual import constructs are covered.

## Commands for an authenticated local staging checkout

```sh
# On integration/esm-12-subpaths-staging-20261114 after applying this PR:
node scripts/verify-esm-source-closure.mjs .
node --test test/verify-esm-source-closure.test.mjs
node --test test/esm-source-closure-staging.test.mjs
node --test test/esm-12-subpath-integration.test.mjs
npm test
tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 test/types/*.test.ts
```

`test/esm-source-closure-staging.test.mjs` is an **integration gate** against the true combined twelve-subpath `package.json`, asserting **13** total exports, **12** declarations and the presence of key house, transit, provider and declination modules in the transitive source graph. It **has not yet been executed on the complete PR #84 checkout**.

## Validation actually performed in this turn

Environment: Node.js **v22.16.0**, TypeScript **v5.8.3**; network access to github.com from the local execution container is unavailable.

- `node --check scripts/verify-esm-source-closure.mjs`: passed.
- `node --test test/verify-esm-source-closure.test.mjs`: **14/14 passed** in a synthetic temporary directory. Regressions cover missing transitive dependencies, case mismatches, symlink rejection, bare imports, missing declaration targets, syntactically invalid source, directory escapes, missing extensions, literal versus computed dynamic imports, cycles, malformed manifests and read-only CLI output.
- Applied the checker to a **different, isolated local reconstruction of draft #80/#82 declination modules**, not the real #84 staging checkout: reported `READY`, **4** package exports (original root + three declination subpaths), **3** declaration targets, **4** runtime files and **5** static relative dependency edges.
- On that isolated declination reconstruction, `npm test`: **62/62 passed**; strict TypeScript NodeNext fixtures passed. These are **prior independent subset tests**, not the union of all twelve modules.
- Uploaded source and synthetic-test files were fetched back from GitHub with blob SHA-1 equal to the local tested copies: `scripts/verify-esm-source-closure.mjs` = `730d55b15958c8f906fa810618b6c9509a14c258`, `test/verify-esm-source-closure.test.mjs` = `1b6929db04c127fb0133ace94c3d905dab3408e4`.

### Still mandatory before any main merge

Perform the **full** 12-export package smoke, 100+ staging tests and strict TS on a complete authenticated checkout. Reconcile any failures and new upstream branch drift, then separately verify a real VirgoStars Ephemeris Rust/WASM provider, kernel correctness and Tauri/Windows consumer compatibility. The node-level source closure is not ephemeris provider attestation.

Retain [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution and its separate CPAL-1.0 license obligations. The Astrological Functions repository remains private without an approved public-release license; this PR does not change that decision.
