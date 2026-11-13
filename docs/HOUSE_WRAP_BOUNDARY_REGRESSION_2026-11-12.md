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

## Near-cusp ownership without hidden rounding (2026-11-13)

The unequal-wrap regression checks points exactly at and 0.000001° on either
side of four synthetic cusps, including the 350° wrap boundary. An exact
hit starts the next house; a point just before remains in the preceding
house; a point just after stays in the new house with positive cusp distance.
This is a deliberate geometric contract, not an astronomical accuracy claim.

Run `node --test test/house-unequal-wrap-regression.test.mjs` and `npm test`
on a full authenticated checkout. Native execution is **pending**; the
GitHub connector confirms committed source, not test success.

## Full twelve-cusp boundary sweep (2026-11-13)

A single deterministic loop now checks **all twelve** unequal synthetic cusp
boundaries, including the final house-to-first-house transition. For each
cusp it verifies ownership just before, exactly at, and just after the
boundary (epsilon = 0.000001°), plus zero distance at the cusp. This extends
the earlier four-cusp sample without adding house astronomy.

Run `node --test test/house-unequal-wrap-regression.test.mjs` and `npm test`
from a full checkout. **Not executed natively in this run**; source committed
through GitHub is not evidence of a passing Node test or scientific parity.

## Strict cusp element types (2026-11-13)

The unequal-wrap suite now rejects `null`, `undefined`, numeric strings,
objects and booleans inside the twelve-cusp array with `INVALID_CUSPS` in
both `locateLongitudeInHouses` and `validateHouseCuspSet`. This protects
against implicit coercion of external provider values. Existing source uses
`Array.from` and finite-number guards, so the tests cover the public API
contract without adding astronomical calculations.

Validation required in a complete checkout:

```sh
node --test test/house-unequal-wrap-regression.test.mjs
node --test test/house-wrap-boundary.test.mjs
npm test
```

**Execution not performed in this GitHub-only environment.** The tests are
implemented but not yet validated by native Node. No scientific parity,
Rust/WASM provider readiness or release status is implied.

## Provider house metadata mismatch regression (2026-11-13)

The synthetic cusp-set suite now verifies that a requested `VEHLOW`
system cannot accept provider metadata identifying `PLACIDUS`:
`validateHouseCuspSet` must raise `INCOMPATIBLE_HOUSE_SYSTEM`.
Likewise, a provider claiming `LEGACY_HOUSES_POS` cannot be silently
treated as geometric `CUSP_INTERVAL` placement and must raise
`UNSUPPORTED_HOUSE_PLACEMENT`. This guards the future Rust/WASM
boundary without calculating any astronomical values.

Run `node --test test/house-unequal-wrap-regression.test.mjs`
and `npm test` in an authenticated full checkout. **Not executed
natively here**; the status remains IMPLEMENTED_ISOLATED.

## Missing or unsupported provider placement metadata (2026-11-13)

The synthetic cusp contract now checks that absent/null metadata is rejected
with `INVALID_HOUSE_METADATA`, while metadata lacking the requested house
system fails with `INCOMPATIBLE_HOUSE_SYSTEM`. When the system is declared
but the placement method is missing, null, or unknown, the API must raise
`UNSUPPORTED_HOUSE_PLACEMENT`. No fallback to geometric cusp intervals is
permitted. This is an interface guard, not an astronomical calculation.

Validation commands: `node --test test/house-unequal-wrap-regression.test.mjs`
and `npm test`. **Not executed natively**: the available GitHub connector
can commit files but does not provide a Node runner. Remains
`IMPLEMENTED_ISOLATED` pending native execution and independent review.

## Legacy Vehlow label boundary (2026-11-13)

A synthetic regression verifies that the historical `egizia` input is accepted
only under `VIRGOSTARS_LEGACY_V1`, resolves to canonical `VEHLOW`, and requires
the external cusp provider to declare canonical `VEHLOW` metadata. A canonical
profile cannot accept the legacy alias, and provider metadata cannot use the
alias as a substitute for the canonical identifier. This does not implement
or validate the historical `houses_pos` method.

Run `node --test test/house-unequal-wrap-regression.test.mjs` and `npm test`.
Native execution is still pending; no astronomical parity is claimed.

## Array-shaped provider metadata rejection (2026-11-13)

An additional synthetic case rejects an array supplied as house provider
metadata with `INVALID_HOUSE_METADATA`. Arrays are objects in JavaScript,
but they are not valid named metadata records. This prevents positional
metadata from being mistaken for a declared house system and placement method.
The implementation already rejects arrays; this change adds a regression
assertion only and introduces no astronomical calculations.

Run `node --test test/house-unequal-wrap-regression.test.mjs` and `npm test`
in a complete Node.js checkout. **These commands have not been executed in
this GitHub-only run.** Keep the PR in draft pending native validation,
stacked-base conflict inspection and independent review.
