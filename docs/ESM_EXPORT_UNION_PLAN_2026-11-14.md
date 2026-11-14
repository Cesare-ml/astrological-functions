# Offline ESM export reconciliation plan (14 November 2026)

Status: **IMPLEMENTED_ISOLATED**; a read-only preparation step, not a merged package manifest.

## Problem

Concurrent draft PRs each modify `package.json` in their own stacked branches.
Replacing one manifest with another during integration would silently lose valid
consumer subpaths. This independent helper only produces a JSON plan, **never
writes to `package.json`**, calls Git, resolves modules, or changes production.
It complements the static target/path audits in draft PRs #63 and #64 rather
than replacing them.

## Snapshot from inspected GitHub branches

| PR | `package.json` Git blob SHA | Added ESM subpath(s) |
| --- | --- | --- |
| Main | `7950cfbc2853a7ba73744d34d294d5cb1899e826` | root `.` only |
| #25 | `d5fff324b5e309880562d5556df87637e583ab3c` | `./transits`, `./transit-events` |
| #41 | `104afd423f22fb6fcfe6a7f8ff25824b4b03f684` | `./dodecatemoria` |
| #54 | `9f638fd753c036c8addd9203aae59fb6fd20b181` | `./ephemeris-provider` |
| #60 | `6fd996285dd989afd4f903de143cd04eead6be79` | `./house-method-comparison`, `./whole-equal-house-comparison`, `./pinned-whole-equal-comparison` |
| #65 | `f1d946b6c45b4db74914d3530b574dcf44d982ea` | `./sourced-house-placement-matrix` |
| #68 | `f1eb92d225fa54b12efb070141fb45e92d2894cd` | `./zodiac-decan-facts` |

**Nine distinct candidate subpaths plus the baseline root**, with no
conflicting subpath names or target pairs found in these inspected manifest
snapshots. This is a manifest-only compatibility observation: some subpaths
require stacked source dependencies that have not been integrated together.

## Manual usage

Save a trusted **copy** of each candidate branch's `package.json` under a
temporary directory (do not fetch untrusted release files). The first argument
must be the baseline to preserve:

```sh
node scripts/plan-esm-export-union.mjs \
  /tmp/export-review/main/package.json \
  /tmp/export-review/pr25/package.json \
  /tmp/export-review/pr41/package.json \
  /tmp/export-review/pr54/package.json \
  /tmp/export-review/pr60/package.json \
  /tmp/export-review/pr65/package.json \
  /tmp/export-review/pr68/package.json
```

The tool prints deterministic JSON with the proposed `exports`, a subpath
source table, and counts. It deliberately **does not write** any file. Use the
plan as review input, not as an automatically applicable patch. It fails closed
with `CONFLICTING_EXPORT`, `CONFLICTING_ROOT`, `INCOMPATIBLE_PACKAGE`,
`UNSUPPORTED_EXPORT_CONDITION`, `INVALID_EXPORT_MAP`, `UNSAFE_EXPORT_PATH`,
`MISSING_MANIFESTS`, or `UNREADABLE_MANIFEST` errors.

The tool accepts only private ESM manifests from the same package, a shared
literal root export, and literal `types`/`import` subpaths. No `require`,
`default`, wildcard, node_modules, traversal or encoded path support. It
preserves baseline non-export manifest settings by **not editing them**.

## Reproducible isolated native checks

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-export-union.test.mjs
node --test test/plan-esm-export-union.test.mjs
```

Execution on a local temporary workspace with native Node.js **22.16.0**:
**9/9 tests passed** (synthetic candidate manifest fixtures, collision and
fail-closed behavior, real CLI subprocess, and unchanged baseline input file).
These tests do not validate the actual full multi-branch checkout. The test
fixture lists the same export names/targets as the GitHub snapshot above;
those manifest SHA values were retrieved through the GitHub integration.

## Required gates before any integration

1. Review dependency order and avoid merging independent stacked PRs directly
   into `main`; materialize their source files and tests before exposing exports.
2. Reconcile any **later** manifest changes and rerun this union plan.
3. Rerun the target audit and native Node resolver/TypeScript NodeNext consumer
   tests on the **consolidated checkout**, not just the synthetic manifest test.
4. Confirm Rust/WASM/JPL provenance, source rights, licensing, privacy and
   downstream VirgoStars Desktop/Astrolabio packaging separately.

No GitHub Actions, deployment, npm publication, license/visibility change,
production modification or main merge. Preserve [VirgoStars attribution](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Incremental path-safety hardening — 14 November 2026

The read-only planner now fails closed when **any** package-relative path
segment begins with a dot (including `.env`, `.git`, and nested hidden paths),
or case-insensitively equals `node_modules`. This applies consistently to the
baseline root, candidate ESM subpaths and both `types` / `import` targets.
Ordinary extensions such as `.js`, `.mjs`, `.d.ts` and `.d.mts` remain valid.
This protects the manual packaging review from inadvertently suggesting
exports of private/hidden files; it is **not** a complete publish-time
filesystem or privacy audit.

Six new native Node regression tests were added to the existing script test
file, including a CLI subprocess asserting rejection without file mutation.

Validation executed on **Node v22.16.0** in a local temporary workspace:

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-export-union.test.mjs
node --test test/plan-esm-export-union.test.mjs
```

Result: **15/15 passed, 0 failed** (nine existing + six new tests).
The pre-change local copies of both files matched their original GitHub Git
blob SHA-1 IDs; the tested updated files match the new GitHub blob SHA-1 IDs:

- Planner: `2a67a3554b81a6abdbf56f1c8f86359da45f4b1e`
- Tests: `511eeecbbbaf8901f26b351feda2a9c17f8a9a73`

This verifies only the isolated export planner on synthetic manifests. It
does **not** claim full-repository `npm test`, TypeScript consumer compilation,
multi-branch integration, or real Rust/WASM/JPL astronomical parity. Those
gates, along with provenance/licensing and human integration review, remain
open. No GitHub Actions, merge, deployment, release or visibility change.
