# Reentrant provider body-list snapshot regression (2026-11-15)

Status: **IMPLEMENTED_ISOLATED; native tests not yet executed**.

The synthetic regression `test/provider-reentrant-body-list-snapshot.test.mjs` verifies that `calculateNatalWithProvider` snapshots the caller's validated `bodyNames` before awaiting an injected provider. During the first Sun lookup, the mock provider replaces the caller's Moon/Mars entries with Venus/Jupiter. The completed chart must still request and return Sun/Moon/Mars in order. It also checks frozen per-body requests and the explicit `APPARENT/ECLIPTIC_OF_DATE` contract.

This covers asynchronous caller mutation at the TypeScript/JavaScript provider boundary; it **does not** implement a Rust/WASM bridge, prove scientific positions, or authorize production use. The existing runtime snapshots `bodyNames` before the first await; no runtime behavior change is proposed.

## Native verification required

From the complete PR #54 checkout on Node >=20:

```sh
node --check test/provider-reentrant-body-list-snapshot.test.mjs
node --test test/provider-reentrant-body-list-snapshot.test.mjs
npm test
```

Record Node version, exact exit codes, and failures. These commands were **not executed** in this GitHub connector-only update. TypeScript NodeNext/Bundler consumer compilation and real pinned VirgoStars Ephemeris integration remain separate validation gates. Keep PR draft until the stacked PR #3 dependency, ESM overlap, and native checks are reconciled.

Astronomical calculations remain solely in [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). No Swiss fallback, GitHub Actions, deployment, release, or license/public-visibility change.
