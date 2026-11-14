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


## Incremental non-export manifest drift review — 14 November 2026

The planner's JSON response now includes `nonExportDrift`: a sorted, read-only
list of fields (for example `version`, `engines`, `scripts`,
`dependencies`, `files` or `license`) that differ between the baseline
manifest and one or more candidate manifests, with their candidate indices.
The planner deliberately **does not print the changed field values**.
Missing and newly added fields count as drift; nested object key order
does not, while array order does. `name`, `private`, `type` and the root
export remain separately enforced as compatibility constraints.

`nonExportDrift: []` means the observed non-export manifest metadata matches,
not that the PR source files or resolved package imports are compatible.
A nonempty list is a **manual-review warning**, not an automatic merge
blocker and never a patch to the baseline manifest.

Manifests read from GitHub for `main` and the active draft heads of PRs
#25, #41, #54, #60, #65 and #68 on 14 November 2026 matched for all
non-export package fields. Their pinned package Git blob SHA-1 values
still match the snapshot table above. This must be rechecked when heads move.

Six focused regressions were added (zero drift on exports-only changes,
field-level diagnostic, deep-equality order semantics, added/removed
fields with multiple candidate origins, frozen input immutability and CLI
redaction/read-only execution). Local **Node v22.16.0** verification:

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-export-union.test.mjs
node --test test/plan-esm-export-union.test.mjs
```

**21/21 tests passed, 0 failed** in the isolated local checkout.
Exact tested file Git blob SHA-1 values match GitHub:

- Planner: `ec38a996cc8db9807afc5da26db7b3de95799c85`
- Tests: `5d9d4d90fa34ae38b2c187366b3ab5772b8fa5b5`

This remains tooling-only evidence. No consolidated full-repository
`npm test`, TypeScript NodeNext/Bundler consumer build, scientific
Rust/WASM/JPL parity, licensing gate, or production migration has been
validated. No GitHub Actions, main merge, deploy, npm publication or
repository visibility change. Continue crediting
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Incremental Windows-friendly export planning — 14 November 2026

The planner now treats case-insensitively identical **ESM export subpath
keys** as ambiguous, even if the literal JavaScript keys differ or their
targets happen to be equal. It rejects such combinations with
`CASE_COLLISION`, including two subpaths inside one candidate, separate
candidate branches, and baseline-to-candidate collisions. Repeated
**identical** subpath keys with identical target pairs remain supported.

To avoid proposing package paths that fail on Windows (including VirgoStars
Desktop development machines), the existing `UNSAFE_EXPORT_PATH` check
also rejects Windows device-name path segments such as `CON`, `AUX`,
`NUL`, `COM1`–`COM9`, and `LPT1`–`LPT9`, including names followed
by a file extension. Path components ending in a dot are also rejected.
Checks apply to the root target, ESM keys, and `types` / `import` targets.
Non-reserved lookalikes (`console`, `auxiliary.d.ts`, `com10.js`)
remain permitted. This validation is deliberately conservative and
independent of the operating system used to run the planner.

Seven deterministic native Node tests were added for intra-manifest,
cross-manifest and baseline case collisions, unchanged exact-duplicate
semantics, Windows reserved names, trailing dots and safe lookalikes.
On the **isolated local copies** with Node **v22.16.0**:

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-export-union.test.mjs
node --test test/plan-esm-export-union.test.mjs
```

Result: **28 passed, 0 failed** (21 prior, 7 new). GitHub Git
blob SHA-1s exactly match the locally executed files:

- Planner: `16cf49ff4c384b1bc37900fbd2a6deb14b5829ae`
- Tests: `6d2027b8774a4a5dbc3dfaed804fcf3bf15ad3a0`

This is not an assertion that real candidate targets exist, that a
consolidated `npm test` or TypeScript NodeNext/Bundler consumer import
passed, or that Rust/WASM/JPL scientific validation is complete.
Keep all existing integration, provenance, legal and downstream gates.
No GitHub Actions, merge, deploy, npm release, production edit or
visibility change. Credit
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## Typed ESM condition target validation — 14 November 2026

The read-only union planner now rejects manifest exports whose targets do not
have an extension appropriate to this **private, Node >=20, ESM-only package**:

- Root `exports["."]` and each subpath `import` target: `.js` or `.mjs`.
- Each subpath `types` target: `.d.ts` or `.d.mts`.

Malformed but safe-relative filenames fail closed with the new
`INVALID_EXPORT_TARGET` code. For example, publishing `.cjs` as the ESM
runtime, `.ts` source as the uncompiled runtime, or an executable `.js`
file as a declaration target is rejected before a union is proposed.
`UNSAFE_EXPORT_PATH` continues to take precedence for hidden, traversal,
encoded or reserved paths. This does **not** inspect file contents or ensure
the targets actually exist in a merged checkout.

An independent eight-case native Node test suite was added:
`test/plan-esm-export-conditions.test.mjs`. The tests cover both valid
declaration/runtime pair styles, CommonJS and uncompiled TypeScript targets,
JSON/extensionless targets, invalid declaration targets, root-export
mismatches, error precedence and a non-mutating CLI failure.

Locally executed with **Node v22.16.0**:

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-export-conditions.test.mjs
node --test test/plan-esm-export-conditions.test.mjs
```

The new focused suite: **8 passed, 0 failed**. The GitHub file blobs
match the byte-exact locally tested Git SHA-1 values:

- `scripts/plan-esm-export-union.mjs`:
  `4e04a4441dd0dcca97f42ccff74bc7e996a3b814`.
- `test/plan-esm-export-conditions.test.mjs`:
  `87524af963bdbb0c7e9d052d08910929cf414842`.

At the observed GitHub `package.json` blob SHA snapshots already listed
in this document, the `main` and draft PR #25, #41, #54, #60, #65, #68
export targets **all satisfy the extension policy**. This is a manifest
declaration audit only, not a consolidated package import test.
The original 28-test planner suite was not rerun in this increment:
the verified outcome above is specifically the new eight-case test suite.

The PR remains draft; no `main` merge, GitHub Actions, npm publish,
production application change, Rust/WASM scientific validation or repository
visibility change. The required integration gate remains a real consolidated
checkout followed by full native `npm test`, TypeScript NodeNext/Bundler
consumer imports and the separate source/license review. Attribution:
[VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).


## ESM target-case collision guard — 14 November 2026

The read-only export-union planner now rejects filesystem **target paths**
that differ only by letter case, including `types` declarations,
`import` runtime modules, and aliases of the baseline root runtime.
`TARGET_CASE_COLLISION` is distinct from the earlier `CASE_COLLISION`
error for case-only **export keys**. Identical target paths may still be
intentionally reused by multiple distinct exported subpaths.

This catches a package that would contain e.g.
`./src/Transit.mjs` and `./src/transit.mjs` when run on
case-insensitive Windows filesystems. The pre-existing
`CONFLICTING_EXPORT` error remains authoritative when an *identical*
subpath is redefined with different targets; non-conflicting aliases and
distinct casing of different filenames remain supported.

### Evidence

The existing GitHub planner/source and tests were verified against
their local Git blob SHA-1s before editing, then the locally tested
updated files were committed to the same draft branch:

- Planner Git blob `5863cdb2f2a71408273e45ddc2020584087bcc41`.
- New isolated eight-case regression file Git blob
  `9f75b7a7f23f915ea3f42f2baa265331685b5532`.
- Previous suites remain unchanged:
  `test/plan-esm-export-union.test.mjs` (28 tests) and
  `test/plan-esm-export-conditions.test.mjs` (8 tests).

Manual native Node **v22.16.0** verification in an isolated local copy:

```sh
node --check scripts/plan-esm-export-union.mjs
node --check test/plan-esm-target-case.test.mjs
node --test test/plan-esm-export-union.test.mjs \
  test/plan-esm-export-conditions.test.mjs \
  test/plan-esm-target-case.test.mjs
```

Result **44 tests passed, 0 failed**. The suite checks candidate-local and
cross-candidate target collisions, parent-directory capitalization, root
aliasing, intentional identical targets, unchanged export-conflict error
semantics and CLI failure without modifying either input manifest.

### Integration limits

This validates the offline read-only **manifest planner** only. It does
not verify existence of files in a consolidated source tree, actual Node
package imports, TypeScript NodeNext/Bundler compilation, whole-repo
`npm test`, or Rust/WASM/JPL scientific parity. All prior integration,
licensing and privacy gates remain open. The PR remains **draft**, with no
changes to `main`, no GitHub Actions and no release/deployment.
VirgoStars Ephemeris credit:
https://github.com/Cesare-ml/VirgoStars-Ephemeris.
