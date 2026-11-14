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


## Addendum — live F5 aggregate provider-call budget (2026-11-14)

The earlier PR #72 adapter used only a **worst-case arithmetic preflight**: it required `maxTotalProviderCalls` to cover `chunkCount × (maxProviderCalls + maxRefinementCalls)` but did not count actual provider invocations itself. This has been replaced by a **live aggregate limit** shared across point-residual calls and all-time interval-enclosure requests. The cap may be smaller than the worst case; the first exceeding call throws `GLOBAL_PIPELINE_BUDGET` before invoking the underlying provider. Calls that fail still consume their reserved slot.

A saved provider function reference cannot be called outside an active chunk (`PIPELINE_SEQUENCE_ERROR`). If an injected pipeline swallows a budget exception and attempts to return a result, the adapter still rejects rather than returning a partial or artificially empty success report. This guard covers calls made through the injected F5 provider facade, not references to the caller's original provider retained elsewhere. It does not cancel calls already in flight or impose a wall-clock timeout.

**Exact GitHub SHA-1 blobs used by the isolated test fixture:**

- `src/transit-chunk-pipeline-adapter.mjs`: `3d0e7f2d5419b37fc9a30b8229beef8d64b702d5`
- `test/transit-chunk-pipeline-adapter.test.mjs`: `595a5f093ac38ed5e2160e1d0345e4b5c89e16e5`
- `scripts/manual/transit-pr21-smoke.mjs`: `c668b10b94a250c87e14323bd1b1964593a7a672` (integration-branch-only two additional cases)

**Executed locally** using Node v22.16.0 and TypeScript 5.8.3 on the existing isolated PR #72 + actual PR #21 source fixture:

```sh
node --test test/*.test.mjs
# 63/63 passed (4 additional aggregate-budget regression cases)

node scripts/manual/transit-pr21-smoke.mjs
# 7/7 passed (2 additional actual PR21 runtime/ synthetic-ephemeris budget cases)

for f in test/types/*.ts scripts/manual/transit-pr21-typecheck.ts; do
  tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext "$f"
done
# All TypeScript 5.8.3 strict NodeNext checks passed
```

**70/70 focused runtime tests passed.** The complete private repository was **not** cloned into this environment (direct network access to GitHub is unavailable); `npm test` on the full private checkout remains a separate outstanding gate. The fixture uses the previously documented minimal unchanged `AstrologyError` dependency. No Rust/WASM/JPL ephemeris reference comparison, scientific validation, production change, GitHub Actions or `main` merge occurred.


## Addendum — opt-in F5 cancellation and per-chunk timeout (2026-11-14)

Updated the F5 bridge's **unreleased experimental** `makeTransitChunkPipelineRunner` contract to accept optional `signal: AbortSignal` and `chunkTimeoutMs` (positive safe integer <= 86,400,000). The timer applies independently **per chunk**, not to total elapsed time across the search. The original F5 scan/refinement request object, engine/kernels, and scientific interpretation are unchanged.

Semantics:

- A signal aborted before the first chunk prevents any pipeline call; abort during a pending chunk rejects with typed `SEARCH_CANCELLED`, and abort between chunks prevents continuation.
- A hung `prepareCandidates` or provider promise is raced against the per-chunk timer; the caller sees `CHUNK_TIMEOUT` and receives no partial report. A previously failed or timed-out runner cannot be reused.
- The runner passes a per-chunk `AbortSignal` as an **optional second argument** to provider point and range methods to permit cooperative cancellation. Legacy one-argument callbacks still work; a provider that ignores this signal **may continue computing** after the caller has stopped waiting.
- On expiry, abort or global provider-call budget exhaustion, outstanding cooperative callbacks receive an aborted internal signal. The result of underlying work is never silently substituted with an empty event list. Timer and listener cleanup occurs on completion.
- These guards cannot interrupt CPU-bound synchronous tasks that block the event loop, kill a noncooperative network request, cancel already-running astronomy I/O by force, or prove a scientifically complete event search. Hard isolation and validated Rust/WASM providers remain open production gates.

SHA-1 Git blob verification against the **exact local fixture used for testing**:

| Path | Git blob SHA-1 |
| --- | --- |
| `src/transit-chunk-pipeline-adapter.mjs` | `66085af6703a67d24668e85a024ec4557eaa7450` |
| `src/transit-chunk-pipeline-adapter.d.mts` | `76207aa12c690f09626533cdbbd14e0709cd5b90` |
| `test/transit-chunk-pipeline-adapter.test.mjs` | `d98447d09948f44d0ab290eb0895c493bc9b0ba0` |
| `test/types/transit-chunk-pipeline-adapter.test.ts` | `6f8f3e9d0c8d93dd117362d0433c01583736a21d` |
| `scripts/manual/transit-pr21-smoke.mjs` | `460c5b391151172719807c5fc534181034a910de` |
| `scripts/manual/transit-pr21-typecheck.ts` | `890544621429bc0ec7616daa56cf61ba534f8942` |

**Actually executed locally** using Node v22.16.0 / TypeScript 5.8.3 in the isolated PR #72 + **actual PR #21 runtime** source fixture:

```sh
node --test test/*.test.mjs
# 70/70 passed, 7 new cancellation/timeout unit tests
node scripts/manual/transit-pr21-smoke.mjs
# 9/9 passed, 2 new real-PR21 synthetic provider cancellation/timeout scenarios
for f in test/types/*.ts scripts/manual/transit-pr21-typecheck.ts; do
  tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext "$f"
done
# All strict TypeScript checks passed
```

Total: **79/79 focused runtime tests passing**. A complete private repository checkout was not available locally, so **full `npm test` was not executed**. No scientific Rust/WASM/JPL cross-check has been performed and no release, GitHub Actions, deployment or `main` merge occurred.


## Addendum — per-chunk provider authority and budget-fast failure (2026-11-14)

Two independent asynchronous lifecycle bugs were reproduced and fixed in draft PR #72, then composed into integration draft PR #79 with a **two-parent merge commit `3ef4d9384f92b71eff7712957b33e03401111260`**.

1. Previously, the `fixedProvider` facade was shared across chunks and checked only a global `running` flag and the current active `AbortController`. A saved callback from chunk N could therefore call the actual provider while chunk N+1 was active, incorrectly charging the later chunk's global budget and inheriting its signal. Each chunk now receives its **own frozen provider facade**, capturing its private controller and `chunkOpen` state. A stale or delayed callback is rejected with `PIPELINE_SEQUENCE_ERROR` without invoking the external provider.
2. Previously `GLOBAL_PIPELINE_BUDGET` set a terminal `failed` flag but did not reject the active `Promise.race`. A `prepareCandidates` callback could swallow the budget error then await a never-settling promise, so callers could hang indefinitely unless they separately enabled a timeout. Budget exhaustion now invokes the chunk's terminal `stop(...)` gate immediately; the active search rejects with `GLOBAL_PIPELINE_BUDGET` and aborts the cooperative signal **without requiring a timeout**.

The original F5 astronomical request shape, strict UTC bounds, report-only scientific uncertainty and global aggregate call counter are unchanged. **This is cooperative lifecycle control, not a guarantee that underlying noncooperative computation stops immediately.**

### Exact checked-in Git blobs and executed scope

| File | Git SHA-1 |
| --- | --- |
| `src/transit-chunk-pipeline-adapter.mjs` | `ff144a1fa15a276f2c9d9b6e25569accbde1a19b` |
| `test/transit-chunk-pipeline-adapter.test.mjs` | `c522ed8f19d45462d8ebf892cca5435ac122171e` |
| `scripts/manual/transit-pr21-smoke.mjs` | `fbe10d95b32c265b82337b40af1ae5219c0b5fbf` |

**Executed locally** on Node 22.16.0 with the exact source/test blobs above and the previously documented actual PR #21 scan/refinement modules (plus the minimal `AstrologyError` dependency stand-in):

```sh
node --test test/*.test.mjs
# 72/72 focused module tests passed
node scripts/manual/transit-pr21-smoke.mjs
# 11/11 real PR21 pipeline synthetic-provider smoke tests passed
for f in test/types/*.ts scripts/manual/transit-pr21-typecheck.ts; do
  tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext "$f"
done
# All eight TS 5.8.3 strict NodeNext checks passed
```

**83/83 focused runtime tests passed**, including regression scenarios for stale callbacks during later chunks and swallowed global-budget failures with **no chunk timeout**. `npm test` on a complete private repository checkout and independent Rust/WASM/JPL scientific verification are **still not executed**. This remains draft, no `main` merge, GitHub Actions, release or production deployment.
