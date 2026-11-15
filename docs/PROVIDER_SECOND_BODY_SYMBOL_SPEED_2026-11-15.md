# Second-body Symbol speed regression — 15 November 2026

Status: **IMPLEMENTED_ISOLATED**, draft PR #54 stacked on #3.

The synthetic Moon provider result supplies a JavaScript `Symbol` for `longitudeSpeedDegPerDay`, while the Sun result has a valid numeric rate. The boundary must reject the Moon result with `AstrologyError.code === 'INVALID_EPHEMERIS_RESULT'`, without requesting Mars. Requests must remain frozen. No coercion to a number or astronomical fallback is permitted.

Manual validation on the **exact full branch checkout** (not yet performed for this addition):

```sh
node --check test/provider-second-body-symbol-speed.test.mjs
node --test test/provider-second-body-symbol-speed.test.mjs
npm test
```

Then run strict TypeScript NodeNext and Bundler consumer fixtures described in `docs/VALIDATION.md`. Record versions, exact branch SHA and exit codes. GitHub accepting a file does not prove its test passes.

This test checks JavaScript provider contract validation only. It does not establish JPL scientific accuracy, Rust/WASM availability, real house-system compatibility, or release readiness. Reconcile stacked #3 and concurrent ESM branches before integration. Keep VirgoStars credit: https://github.com/Cesare-ml/VirgoStars-Ephemeris . No deploy, merge, GitHub Actions, license or visibility change.
