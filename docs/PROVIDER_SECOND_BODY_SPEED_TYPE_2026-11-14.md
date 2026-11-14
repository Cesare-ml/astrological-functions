# Second-body speed type regression (experimental)

Status: IMPLEMENTED_ISOLATED. This checkpoint is stacked on draft provider PR #3 through draft PR #54. It does not establish astronomical accuracy or production readiness.

The synthetic regression in `test/provider-second-body-invalid-speed-type.test.mjs` returns a valid Sun followed by a Moon whose `longitudeSpeedDegPerDay` is the string `"0"`. The provider contract permits absent speed but rejects a present non-number; it must raise `INVALID_EPHEMERIS_RESULT` before requesting Mars. The test also checks the provider request order and frozen request objects.

This protects the TypeScript/ESM boundary against implicit coercion of a Rust/WASM value, without introducing astronomical calculations or fallback behavior.

## Required manual checks

From the complete checkout of `agent/provider-runtime-import-smoke-20261113`, with Node.js >=20:

```sh
node --check test/provider-second-body-invalid-speed-type.test.mjs
node --test test/provider-second-body-invalid-speed-type.test.mjs
npm test
```

Also run strict TypeScript consumer fixtures with NodeNext and Bundler against the exact combined branch, and record actual exit codes, versions and commit SHAs. **None of these native commands was executed as part of this GitHub-only change.** Synthetic regression tests cannot validate a real Rust kernel, JPL/NAIF scientific accuracy, or upstream apparent-of-date semantics.

Do not merge before resolving the stacked PR #3 ancestry, current-main precision changes, and overlapping ESM integration tracks. No deployment, publishing, GitHub Actions or license/visibility change. [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) remains the sole planned astronomical engine; attribution must be preserved.
