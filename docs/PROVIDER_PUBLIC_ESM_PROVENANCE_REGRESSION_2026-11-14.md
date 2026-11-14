# Public ESM provider provenance regression — 2026-11-14

Status: **IMPLEMENTED_ISOLATED**, not scientifically validated.

The synthetic Node test `test/provider-public-esm-provenance-regression.test.mjs` imports the public `astrological-functions/ephemeris-provider` subpath and checks three boundary behaviors:

1. Each missing field among `engineVersion`, `kernelSetId` and `timeModel` fails with `INVALID_EPHEMERIS_RESULT` before requesting another body.
2. Mixing fully specified and wholly absent provenance between two bodies fails with `INCONSISTENT_EPHEMERIS`, regardless of order.
3. Consistent metadata is retained on a frozen chart provenance record. Requests remain immutable.

Run on a complete checkout of the PR branch with its stacked PR #3 prerequisite:

```sh
node --test test/provider-public-esm-provenance-regression.test.mjs
npm test
```

**Execution status:** Not executed in this change; GitHub commit publication is not a passing test. NodeNext/Bundler TypeScript consumer compilation, actual Rust/WASM integration, NASA/JPL scientific accuracy and cross-PR consolidated integration remain unverified. Reconcile overlapping ESM export changes (including PR #69) before integration.

No new astronomical algorithm, fallback, Swiss source, production changes, GitHub Actions, package release, licensing decision or main merge. Rust remains the sole planned astronomical engine: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). Preserve VirgoStars attribution.
