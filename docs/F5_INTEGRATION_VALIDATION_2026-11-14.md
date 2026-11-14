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


## Addendum — getter-free UTC hit reconciliation regression (2026-11-14)

The event reconciler previously read `candidate.eventKey` repeatedly and allowed own **accessor properties**, invoking a test getter **seven times** before accepting its result. A provider could therefore change the event identity between checks and deduplication. The corrected PR #72 implementation, imported into PR #79 as a two-parent integration merge commit, now snapshots only own **enumerable data descriptors** for `eventKey` and `instantUtc`, and only own data descriptors for `chunkIndex`/`hits`. It rejects getters, setters, symbol keys, hidden extras and inherited fields without evaluating user getters.

Git blob SHA-1 verification after synchronization:

- `src/utc-chunk-event-reconciliation.mjs`: `09e60b9f7d4ab6ec07774f3bac8f094b5e5b5cef`
- `test/utc-chunk-event-reconciliation.test.mjs`: `7a7e061cf4c318b90d2bdd719e8dcd1eebe6de1d`

The **five new regression tests** cover both candidate accessors, extra hidden/symbol properties, chunk-result accessors, and unchanged canonical millisecond seam deduplication.

After rebuilding the focused local fixture using these exact GitHub source/test blobs, the unchanged actual PR #21 runtime source blobs, and a minimal `AstrologyError` dependency stand-in, the following **were executed**:

```sh
node --test test/*.test.mjs
# 54/54 focused Node.js tests passed (previously 49/49)

node scripts/manual/transit-pr21-smoke.mjs
# 5/5 end-to-end synthetic PR #21 runtime smoke tests passed

tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext scripts/manual/transit-pr21-typecheck.ts
# Passed

# Plus all 7 individual strict NodeNext fixture checks under test/types/*.ts
# Passed
```

Total **59/59 focused runtime tests passed**. These are synthetic dependency-isolated checks, **not** an execution of the complete private-repository `npm test` command, scientific ephemeris parity, or production readiness. No changes were made to `main` or any production system.


## Addendum — immutable transit identity across chunk boundaries (2026-11-14)

Following the getter-free UTC event-hit fix, the experimental F5 chunk adapter was audited for **identity drift**: previously, a direct caller of `makeTransitChunkPipelineRunner` could change the requested sky/natal body, aspect orientation/angle, or pinned ephemeris identity between chunks, because it forwarded `request` fields into the underlying F5 pipeline. The report collector independently snapshotted identity, but the standalone runner did not.

- PR #72 now exposes one **shared** `snapshotTransitPinnedIdentity` helper for the collector and adapter, rejecting accessor/inherited identity/provenance fields without invoking getters. The adapter requires explicit `identity` at construction and freezes its names, angle, orientation and three provenance identifiers.
- Every direct `runChunk(request)` must match that pinned identity, in addition to UTC index/bounds. The adapter forwards the pinned snapshot, not mutable per-chunk fields, into the actual PR #21 pipeline. Direct forgery or request accessors fail with `INVALID_TRANSIT_IDENTITY`/`INCOMPATIBLE_CHUNK_REQUEST` without calling the pipeline.
- Four new adapter regression tests cover forged second-chunk participants/aspect/provenance, input mutation across `await`, accessor request fields and malformed/accessor pinned identity. An extra collector test checks getter-free identity/provenance rejection before any provider calls.
- Exact Git SHA-1 blobs from PR #72 were reused for the affected modules, declarations, TypeScript consumers, tests and documentation. Integration-only `scripts/manual/transit-pr21-smoke.mjs` preserved its original five test cases and was updated to pass the same required identity. A two-parent Git integration commit `6c13b01f3f480069c700c6221653f31d01a0dc16` combined the changes.

**Executed focused local checks** using the exact module/test blobs from PR #72 and unchanged actual PR #21 runtime modules, with the previously documented minimal `AstrologyError` stand-in:

```sh
node --test test/*.test.mjs
# 59/59 passed (previously 54/54)
node scripts/manual/transit-pr21-smoke.mjs
# 5/5 passed using actual PR #21 runtime with synthetic enclosure provider
for f in test/types/*.ts scripts/manual/transit-pr21-typecheck.ts; do
  tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext "$f"
done
# All strict TypeScript consumer checks passed
```

**Current evidence: 64/64 focused runtime tests passing.** This does not constitute a full native checkout `npm test` run or ephemeris/JPL scientific validation. The adapter's mandatory `identity` parameter is an intentional breaking change to an **unreleased experimental** contract. The repository remains private; PR #72 and integration PR #79 remain drafts. No production or `main` changes, automatic actions, or releases.
