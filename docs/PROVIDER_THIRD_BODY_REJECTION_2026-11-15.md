# Third-body provider rejection regression — 2026-11-15

The synthetic test `test/provider-third-body-rejection.test.mjs` exercises a failure from the third requested body after two successful provider responses. The caller must reject with the **same error object**, rather than return an incomplete chart or silently substitute astronomy. Requests must remain frozen and explicitly demand apparent ecliptic-of-date coordinates.

This is a contract test for the future Rust/WebAssembly adapter, **not** evidence of JPL accuracy, house-system compatibility, or a working Rust bridge.

## Native validation still required

From a complete checkout of draft PR #54:

```sh
node --check test/provider-third-body-rejection.test.mjs
node --test test/provider-third-body-rejection.test.mjs
npm test
```

On 2026-11-15, a native checkout attempt failed before tests with `Could not resolve host: github.com`. GitHub accepted the test commit, but no native pass is claimed. Resolve repository access, execute the commands, record versions and exit codes, and reconcile the stacked PR #3 dependency and ESM work before merge.

No new astronomical algorithm or Swiss fallback is introduced. Attribution: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). The private repository's license/publication decision remains pending.
