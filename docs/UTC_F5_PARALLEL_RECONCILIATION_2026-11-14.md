# UTC/F5 integration: event reconciliation hardening and upstream divergence

**14 November 2026 — experimental, private, draft only**

This is a focused synchronization of an isolated, source-compatible change from
F5 draft PR #72 into the larger draft PR #81 integration branch. It is **not**
a complete merge of all updated PR #72 changes.

## Reconciliation update included

The following two PR #72 files were adopted byte-for-byte on PR #81:

| File | Verified Git blob SHA-1 |
| --- | --- |
| `src/utc-chunk-event-reconciliation.mjs` | `09e60b9f7d4ab6ec07774f3bac8f094b5e5b5cef` |
| `test/utc-chunk-event-reconciliation.test.mjs` | `7a7e061cf4c318b90d2bdd719e8dcd1eebe6de1d` |

The code snapshots own data-property descriptors for chunk indices, hit arrays,
event keys and instants. It refuses accessor getter fields, hidden/symbol
extra fields, missing inputs, and invalid UTC/candidate fields, without running
caller-defined getters. Stable hit deduplication continues to use exact
event-key + epoch millisecond and half-open chunk ownership. Five new upstream
test cases confirm the rejection behavior and boundary deduplication.

**Native local reconstructed UTC/F5 checkout:** Node.js 22.16.0
`npm test`: **97/97 passed, 0 failed**.
TypeScript 5.8.3 strict **NodeNext** and **ESNext/Bundler** consumer fixtures:
both passed without diagnostics. The exact source and test bytes used locally
matched the GitHub SHA-1 values above.

The reconstructed checkout does **not** include the entire PR #21 transit
source test suite; these results do not establish a native full-stack PR #81
pass. Previously executed 6 synthetic PR #21 V8 scenarios are separate
evidence and are not new native results.

## Remaining reconciliation conflict with PR #72

PR #72 continued developing after PR #81's original pinned snapshot. Its
current experimental pipeline runner now **requires an explicit pinned
`identity` object at construction time** and shares
`snapshotTransitPinnedIdentity` with the report collector. That is a
breaking contract change versus the isolated PR #81 runner, which captures
the first validated chunk request's identity and rejects changes in later
requests. In addition, PR #72 updated its runner types, report validator,
manual PR #21 integration scripts, and associated tests.

**Do not blindly copy the whole PR #72 tree over PR #81.** Before a future
stack consolidation:

1. Choose the explicit constructor-time identity contract as the future
   versioned interface (preferred for earlier fail-closed checking).
2. Update **every** runner caller in `test/`, `scripts/manual/` and
   downstream example code to pass the pinned identity explicitly.
3. Integrate the shared getter-free identity snapshot implementation and
   its TypeScript declarations, without duplicating validators.
4. Run native `npm test` for the complete PR #21 + PR #72 + PR #70
   integration and strict NodeNext/Bundler checks.
5. Run `node scripts/manual/transit-pr21-smoke.mjs` and the manual typed
   gate against the actual combined PR #21 source.
6. Verify real Rust/WASM/JPL ephemeris accuracy, continuous enclosures,
   time-model / frame provenance, station/tangency behavior, license and
   publication gates separately.

The present PR #81 branch intentionally leaves this breaking runner migration
**unapplied**, to avoid silently invalidating tested consumers while other
draft branches advance concurrently. No GitHub Actions, merge to `main`,
release, license change, package publication, or production integration.

Astrological computations must continue to obtain actual astronomical facts
only from [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
