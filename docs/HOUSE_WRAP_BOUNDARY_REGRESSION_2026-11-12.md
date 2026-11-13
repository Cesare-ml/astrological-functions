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

## Cusp alias and multiple-turn regression

The same synthetic fixture now checks that cusp longitude aliases shifted by
whole turns (alternating +720° and -360°) normalize to an immutable copy
without modifying the caller's array. Placements at six wrap/boundary
positions must match the original one-turn cusp set. A 12-cusp sequence
spanning two complete turns must instead fail with `INVALID_CUSPS`
through both entry points; it cannot be treated as a valid house wheel.

Verification command: `node --test test/house-unequal-wrap-regression.test.mjs`.
**Not executed natively in this run**: the GitHub connector can edit and
inspect source, but the execution container cannot reach this private
repository. Assertions are implementation-only until run in a checkout.
No Rust/WASM or astronomical accuracy is asserted.

## Invalid longitude and immutable result regression (2026-11-13)

The unequal-wrap fixture now also rejects missing, nonnumeric, NaN and infinite
**body longitudes** with `INVALID_ANGLE`, distinct from malformed cusp sets
(`INVALID_CUSPS`). A placement snapshot must be frozen, retain its starting
and ending cusp values, and remain unchanged when the caller subsequently
mutates the original cusp array. This exercises only existing geometry; no
house algorithm or astronomical ephemeris was introduced.

Run: `node --test test/house-unequal-wrap-regression.test.mjs` followed by
`npm test` in a complete checkout. **Neither command was executed here**;
these new assertions are unvalidated pending native execution.

## Signed zero and whole-turn boundary aliases (2026-11-13)

The unequal-wrap fixture also checks that `-0`, `-360`, `360` and `720`
produce exactly the same immutable house placement as `0` for a synthetic
wheel whose first cusp is 350 degrees. Exact hits on the first and second
cusps must have zero distance from the starting cusp. This is a geometric
normalization regression, not a validation of astronomical house calculation.

Command: `node --test test/house-unequal-wrap-regression.test.mjs`.
Execution status: **not executed natively**; run this and `npm test` in a
complete Node.js checkout before promotion beyond IMPLEMENTED_ISOLATED.
