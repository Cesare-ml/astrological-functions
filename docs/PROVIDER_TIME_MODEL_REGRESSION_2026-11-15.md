# Provider time-model consistency regression (15 November 2026)

Synthetic regression: `test/provider-second-body-time-model-mismatch.test.mjs`.

The mock provider returns apparent Earth-centered ecliptic-of-date positions for Sun and Moon with the same synthetic Rust engine and kernel set, but different `timeModel` identifiers. The natal assembly must reject the Moon with `INCONSISTENT_EPHEMERIS`, without requesting Mars. Every request must remain frozen and explicitly request `APPARENT/ECLIPTIC_OF_DATE`.

Run from a complete checkout of this branch:

```sh
node --check test/provider-second-body-time-model-mismatch.test.mjs
node --test test/provider-second-body-time-model-mismatch.test.mjs
npm test
```

**Evidence status:** test source committed, native execution not yet verified. This is a fake-provider contract test, not a real Rust/WASM integration, NASA/JPL accuracy test, house-system compatibility check, or production approval. The upstream ephemeris must independently validate its time models and correction semantics. No Swiss fallback is permitted.

Project attribution: [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris). Publication and outbound licensing remain gated by the repository's legal review.
