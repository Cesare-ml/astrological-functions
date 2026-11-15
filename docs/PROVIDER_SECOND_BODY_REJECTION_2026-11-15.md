# Provider rejection propagation — synthetic regression (2026-11-15)

The public ESM consumer path `astrological-functions/ephemeris-provider` must reject a natal assembly when an injected Rust/WASM-style provider rejects its second body. It must preserve the original rejection (no fabricated success, retry, Swiss fallback or third-body request). Provider request objects must remain frozen and explicitly request `APPARENT` / `ECLIPTIC_OF_DATE`.

Test: `test/provider-second-body-rejection.test.mjs`.

## Manual validation

From the complete branch checkout, with compatible Node.js and dependencies:

```sh
node --check test/provider-second-body-rejection.test.mjs
node --test test/provider-second-body-rejection.test.mjs
npm test
```

Record Node version, branch SHA, results and any failures. **These commands were not executed during this GitHub-connector-only change.** A successful synthetic rejection test would verify orchestration behavior only; it does not verify Rust/WASM loading, apparent-of-date astronomy, JPL accuracy, legacy house parity or downstream integration.

## Integration gate

This draft is stacked on the provider-contract work in PR #3; reconcile its ancestry and concurrent ESM branches before merging. Keep the library private/unreleased pending issue #2's rights and attribution review. Astronomical computation remains in [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris); this test implements no astronomy.
