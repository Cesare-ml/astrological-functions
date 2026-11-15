# Missing second-body rate regression — 2026-11-15

Status: **IMPLEMENTED_ISOLATED**, not validated against real astronomy.

The synthetic regression `test/provider-second-body-missing-speed.test.mjs` checks that a missing Moon `longitudeSpeedDegPerDay` is represented as `null` rather than silently treated as stationary (`0`), while Sun and Mars retain their supplied finite rates. It also checks the expected three-body request order and frozen provider requests. This protects the future TypeScript/Rust-WASM boundary from inventing velocity information.

Manual validation on the complete stacked PR #54 / PR #3 checkout:

```sh
node --check test/provider-second-body-missing-speed.test.mjs
node --test test/provider-second-body-missing-speed.test.mjs
npm test
```

**Execution evidence:** GitHub accepted the test and this document; native Node tests, complete TypeScript NodeNext/Bundler checks and actual Rust/WASM or JPL comparisons were **not executed**. The test uses synthetic states and cannot establish scientific accuracy. Reconcile overlapping provider/ESM PRs and the licensing gate before any integration. No Swiss fallback, deployment, GitHub Actions, merge, release or visibility change. The sole intended astronomical engine is [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris); retain VirgoStars credits.
