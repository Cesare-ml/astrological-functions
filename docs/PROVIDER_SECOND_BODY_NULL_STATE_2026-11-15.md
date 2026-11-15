# Second-body null state regression — 2026-11-15

This isolated synthetic test verifies that an injected Rust/WASM-style provider returning `null` for Moon after a valid Sun response causes `INCOMPATIBLE_EPHEMERIS`. The third body (Mars) must not be requested; each provider request remains frozen and explicitly requests apparent ecliptic-of-date coordinates.

Run manually on the exact PR branch checkout:

```sh
node --check test/provider-second-body-null-state.test.mjs
node --test test/provider-second-body-null-state.test.mjs
npm test
```

These are commands, **not recorded successful executions**. Native full-checkout and TypeScript NodeNext/Bundler validation remain outstanding. A synthetic provider cannot demonstrate NASA/JPL parity or a working Rust/WASM bridge. Do not silently fall back to Swiss or synthesize missing bodies. Keep this branch draft, do not deploy or merge. Preserve [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris) attribution; public licensing remains subject to issue #2.
