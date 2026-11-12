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
