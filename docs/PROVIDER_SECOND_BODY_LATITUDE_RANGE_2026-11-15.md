# Provider second-body ecliptic latitude boundary regression — 2026-11-15

## Scope
The isolated test `test/provider-second-body-out-of-range-latitude.test.mjs` exercises the existing experimental `calculateNatalWithProvider` contract. A synthetic provider returns valid apparent, Earth-centered ecliptic-of-date metadata for Sun and Moon, but Moon's latitude is +90.0001°. The adapter must reject it as `INVALID_EPHEMERIS_RESULT` before requesting Mars. Requests must remain frozen and explicitly request `APPARENT/ECLIPTIC_OF_DATE`.

This is a **synthetic fail-closed regression only**, not proof that VirgoStars Ephemeris currently produces apparent coordinates, nor a real JPL/Rust/WASM integration or astronomical accuracy test. The existing runtime implementation checks ecliptic latitude against [-90°, +90°]; this test guards that behavior on the second provider response.

## Manual verification required
From a complete checkout of this exact PR branch:

```sh
node --check test/provider-second-body-out-of-range-latitude.test.mjs
node --test test/provider-second-body-out-of-range-latitude.test.mjs
npm test
```

Record Node version, branch SHA and observed results. These commands **were not executed** by the GitHub connector. The commit is not a local validation or release gate.

## Integration constraints
The draft PR is stacked on the experimental provider branch and must be reconciled with PR #3, the precision changes already on main and parallel ESM work. Do not merge based on GitHub's mergeable flag alone. No fallback to Swiss or other astronomical implementations, no production migration or Actions. Keep source licensing and mandatory VirgoStars attribution review open; project: https://github.com/Cesare-ml/VirgoStars-Ephemeris.
