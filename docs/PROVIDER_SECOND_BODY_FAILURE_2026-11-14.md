# Second-body provider failure regression (14 November 2026)

The draft ESM provider consumer smoke includes a synthetic three-body natal request in which the first body succeeds and the second throws an exact Error instance. The expected behavior is propagation of that same Error object, exactly two immutable provider requests (`Sun`, `Moon`), and no request for `Mars`, retry, alternative astronomy engine, or partial chart. This complements the existing first-body failure regression.

## Validation required

From the **complete** draft PR #54 checkout (Node >=20):

```sh
node --check test/pilot-provider-consumer-smoke.test.mjs
node --test test/pilot-provider-consumer-smoke.test.mjs
npm test
```

Record Node version, checkout SHA, command exit codes and diagnostics. The change was committed through the GitHub contents API; these native commands **were not run** because the execution environment could not resolve `github.com` for a checkout. No claim of `VALIDATED_LOCAL` or real JPL/Rust-WASM scientific parity follows. Do not merge or publish before full branch and dependency validation.

Astronomy remains delegated exclusively to [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). Preserve VirgoStars attribution and the existing open-source licensing approval gate.
