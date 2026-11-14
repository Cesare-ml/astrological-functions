# Bounded cross-aspect evaluation budget — 14 November 2026

**Status: IMPLEMENTED_ISOLATED / DRAFT / NOT RELEASED.** The experimental F2/F3 library is not yet integrated with the production backend. This PR is stacked on the direct-main integration's combined aspect validation PR #112 and changes only pure geometric cross-aspect evaluation.

## Problem

`calculateCrossAspects` snapshots the caller's source points, target points and aspect rules correctly, but it had no limit on their cardinality. It computes the Cartesian product (source points × target points × aspect definitions), potentially creating enormous numbers of frozen facts and exhausting memory/CPU. Caller-controlled getters can also append to later input arrays while the preceding array is being parsed, so a gate that reads collection lengths again during use would not provide a stable bound.

## Experimental, explicit limits

The function now fails early with the existing `AstrologyError('INVALID_ARGUMENT')` when:
- source points **> 256** or target points **> 256**;
- aspect definitions **> 32**;
- the product `sourceCount * targetCount * definitionCount` **> 65,536** (upper bound on comparisons and emitted facts).

These checks happen **before any user point/rule accessor is invoked**. All three input array lengths are captured once, then handed to the existing trusted own-index `snapshotAspectInputs` reader so that a getter cannot expand the subsequent processing bound. Empty arrays remain valid. Exactly 65,536 comparisons are allowed; for example, 64 × 64 × 16 yields 65,536 immutable conjunction facts, and 256 × 1 × 32 yields 8,192.

This is a **new experimental validation limit**: callers handling unusually large charts must partition their work into bounded batches instead of relying on implicit unlimited iteration. It is not a scientific change. The direction semantics, angles/orbs, binary64 precision, sorted iteration order, frozen result shape, error types for malformed points and aspect rules, package export map and TypeScript declarations are unchanged. No astronomy, Rust/WASM, Swiss, timezone, house or ephemeris algorithms are added.

## Reproduced before/after

Eight native Node v22.16.0 tests were authored first. On the original #112-shaped local adapter **3/8 passed, 5/8 failed**, demonstrating missing rejection for source/target/rule cardinalities, excess comparison combinations and a getter expanding later arrays. After the change **8/8 passed**.

- Native Node v22.16.0 `npm test` on a local reconstruction of current `main` with the exact #112 input validator/matching block: **121/121 passed**, 0 failed/skipped (113 previous tests + 8 new).
- Strict TypeScript v5.8.3 NodeNext `tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext test/types/*.ts`: passed for the five existing **main** fixtures.
- `node --check` on adapted runtime and new test: passed.
- Native-executed new regression test file has exact Git SHA-1 `8e0b6e71005f1efb33bda6f180392ff725ed7d13`.
- The exact complete #112 `src/index.mjs` blob was also patched directly, retaining the entire staged F2/F3 implementation. Source SHA after the narrow patch and comment correction: `4dfd94aa09baf3fb0b428697239310cdd76c2f82`. A focused isolated V8 smoke of this exact candidate passed standard conjunction and oversized-input rejection.

**Honest scope:** Native 121/121 and TypeScript checks are from a main-based **adapted source tree**, NOT the complete private F2/F3 checkout. PRs #109/#112 include many additional Node provider tests, 14+ TypeScript fixtures and real ESM package-consumer dependencies; those still require full native Node, NodeNext **and** Bundler checks against the exact combined head. Native evidence does not imply astronomy accuracy. Rust/JPL apparent-of-date, rights/credits, privacy, performance and downstream release gates remain open.

## Dependency and release gates

Stack: **#109 → #112 → this PR**. Do not merge out of order, close unrelated draft PRs, enable GitHub Actions, publish npm, change repository visibility/license, or deploy production. Check the composite Git tree and run `node scripts/verify-provider-integration.mjs` from a full authenticated checkout before making this a merge candidate. Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) as the intended sole astronomical engine.
