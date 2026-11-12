# Natal house placement runtime regression — 2026-11-12

Status: **IMPLEMENTED_ISOLATED; native test run pending**.

The synthetic regression in `test/house-birth-time-runtime.test.mjs` exercises the actual
`src/index.mjs` runtime (not only TypeScript declaration tests):

- Missing, false, null, numeric and string birth-time flags fail closed with `BIRTH_TIME_REQUIRED`.
- Explicit `birthTimeKnown: true` permits an already supplied, context-matched cusp set.
- An otherwise matching cusp set with a different ephemeris kernel fails with `INCOMPATIBLE_HOUSE_CONTEXT`.
- Even with known birth time and matching cusps, nonfinite, missing or nonnumeric natal body longitudes fail with `INVALID_POINT`.
- Body identifiers inconsistent with their chart lookup keys also fail with `INVALID_POINT`.
- Cusp UTC or observer latitude/longitude differing from the chart fails with `INCOMPATIBLE_HOUSE_CONTEXT`.
- A different ephemeris engine version or time model fails with `INCOMPATIBLE_HOUSE_CONTEXT`, even if the kernel ID matches.

Run locally from the repository root:

```sh
node --test test/house-birth-time-runtime.test.mjs
npm test
```

**Validation limitation:** neither command was executed in this GitHub-only change.
These are synthetic API safety checks, not validation of astronomical house cusps,
planetary positions, polar behavior, or a Rust/WASM adapter. Keep real ephemeris
integration blocked until the upstream scientific validation gates are satisfied.

The separate runtime adapter work belongs to issue #5; this change does not touch
`src/ephemeris-provider.js`, package exports, or the adapter's smoke tests.

VirgoStars project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
