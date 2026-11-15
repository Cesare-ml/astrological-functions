# Second-body BigInt longitude contract regression (2026-11-15)

Status: **IMPLEMENTED_ISOLATED**, synthetic provider test only. Draft PR #54, stacked on PR #3.

## Scope

`test/provider-second-body-bigint-longitude.test.mjs` supplies a valid Sun response, then an invalid Moon `longitudeDeg: 12n` from a fake injected provider. The expected typed error is `INVALID_EPHEMERIS_RESULT`. The provider must not receive the third (Mars) request, and each request must remain frozen. A Rust/WASM boundary must not implicitly coerce BigInt to IEEE-754 degrees. No astronomical algorithm or fallback is added.

## Manual validation on exact PR head

```sh
node --check test/provider-second-body-bigint-longitude.test.mjs
node --test test/provider-second-body-bigint-longitude.test.mjs
npm test
```

Also run the repository's strict TypeScript NodeNext/Bundler checks from its documented validation runner on a complete checkout. These commands are **instructions, not recorded successful runs**. GitHub commit acceptance verifies storage only, not test execution. Synthetic fixtures do not establish JPL parity, real Rust/WASM integration, house accuracy or production readiness.

## Integration gates

Review stacked PR #3 and parallel ESM/provider changes before integration; reconcile branch ancestry, run native checks, then validate actual Rust apparent-of-date quantities and kernel/time-model provenance. Keep draft; no merge, deploy, GitHub Actions, package publication or license/visibility changes. Maintain attribution to [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris); open-source license choice remains subject to issue #2.
