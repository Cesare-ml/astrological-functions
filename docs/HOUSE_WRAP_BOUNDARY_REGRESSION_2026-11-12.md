# Synthetic wrapped-house boundary regression

Status: IMPLEMENTED_ISOLATED; native execution pending.

The test `test/house-wrap-boundary.test.mjs` checks that a synthetic
forward-ordered cusp sequence crossing 360° assigns a point exactly on
a cusp to the house **starting** there. It also checks that a validated
cusp snapshot is immutable and detached from mutable caller input, and
that duplicate/reverse cusp sequences fail with `INVALID_CUSPS`.

Run from the repository root:

```sh
node --test test/house-wrap-boundary.test.mjs
npm test
```

These are geometric API regressions only. They do not validate real
house astronomy, polar behavior, Swiss compatibility, or Rust/WASM
integration. No astronomical calculation is added to TypeScript.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris

## Additional boundary coverage (2026-11-12)

`test/house-unequal-wrap-regression.test.mjs` adds three isolated Node tests:
unequal cusp intervals crossing 0°, exact ownership at multiple boundaries,
longitude equivalence under whole-turn shifts, and fail-closed rejection of
sparse/nonfinite cusp arrays through both the direct locator and validated
cusp-set entry point. No house astronomy is computed.

Run:
```sh
node --test test/house-unequal-wrap-regression.test.mjs
node --test test/house-wrap-boundary.test.mjs
npm test
```

Execution status: **not run** in the GitHub connector; these assertions
require a native checkout and Node.js >=20. An implementation/code review
does not establish passing tests or scientific accuracy.
