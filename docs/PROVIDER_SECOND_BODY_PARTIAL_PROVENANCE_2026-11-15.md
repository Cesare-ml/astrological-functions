# Second-body partial provenance regression — 2026-11-15

Experimental provider boundary only. The synthetic Sun response supplies a complete `engineVersion` / `kernelSetId` / `timeModel` tuple. The Moon response deliberately omits `timeModel` while retaining matching engine and kernel values.

Expected result: `INVALID_EPHEMERIS_RESULT` at the Moon response, no Mars request, and frozen provider requests. A partial tuple is invalid in itself and must not be downgraded to a cross-body `INCONSISTENT_EPHEMERIS` comparison. No astronomy is calculated by this test.

Manual verification on the exact branch checkout:

```sh
node --check test/provider-second-body-partial-provenance.test.mjs
node --test test/provider-second-body-partial-provenance.test.mjs
npm test
```

The TypeScript NodeNext/Bundler consumer checks must also run before integration. GitHub file creation alone is not evidence that these commands passed. The provider uses mock positions; this does **not** validate a Rust/WASM adapter, JPL kernels, apparent-of-date accuracy, or historical house methods. Preserve the separate scientific, licensing, and production approval gates.

Astronomical engine ownership and attribution: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). No Swiss fallback, release, deployment, GitHub Actions, or merge.
