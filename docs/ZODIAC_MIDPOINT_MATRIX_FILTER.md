# Midpoint contact matrix view — experimental geometry-only filter

`filterZodiacMidpointContactMatrix` is a pure presentation selector over an
**already completed** `ZodiacMidpointContactMatrix` snapshot from draft PR #51.
It makes no ephemeris calls, introduces no additional angular geometry, does
not silently change a chart's reference system, and never mutates its source.

```js
import { filterZodiacMidpointContactMatrix } from '../src/zodiac-midpoint-matrix-filter.mjs';

const view = filterZodiacMidpointContactMatrix({
  matrix,                    // existing ZodiacMidpointContactMatrix facts
  sourceNames: ['Moon', 'Sun'], // both members must appear in a selected pair
  targetNames: null,         // all target names; [] means none
  maxOrbDeg: 2,              // explicit inclusive display orb, 0..90 degrees
  excludePairMembers: true,  // omit targets sharing a source pair's name
});
// view.matchedCells contains contacts meeting the explicit filters.
```

## Explicit filter semantics

- All five input fields are **required**, including both selectors and the
  boolean `excludePairMembers`. No implicit filter defaults.
- `sourceNames` and `targetNames` are `null` (select all known names) or dense
  arrays of distinct, already-trimmed, **case-sensitive names present in the
  corresponding matrix namespace**. `[]` explicitly selects none. Unknown,
  duplicate and malformed names are errors, never silently ignored.
- Both names of a source pair must be selected to retain its row. Selecting
  only one member of a pair never emits that pair. The source and target
  selectors are **separate namespaces**.
- `excludePairMembers` is `true` or `false`, explicitly. When true, a target
  is excluded if and only if its name equals either source pair member's
  name. A body at the same longitude with a **different** name is not excluded.
  This is an opt-in filter, not a new astrological or astronomical rule.
- `maxOrbDeg` must be finite and in **[0,90]**. Its comparison with every
  saved `contacts[].separationDeg` is **inclusive**. The orb can be **narrower
  or wider** than the original matrix's orb because the original matrix
  preserves angular separation for **all** pair × target cells, including
  nonmatches. It never recomputes those separations or touches ephemerides.
- If one target falls within the selected orb of **both** antipodal axes
  (e.g. exactly 90° with orb 90°), it contributes **one** matched cell with
  two matching axis positions.

## Output

- `rows`: all selected source pairs, including pairs with zero matches; each
  contains a frozen `matchedTargets` list, `firstName`, `secondName` and the
  original immutable `midpointAxis` facts. Row order is preserved from the
  existing source matrix. `matchedCells` is a flattened immutable view in
  pair × target order, with nearest-axis angular separation, target name and
  all matching axis longitudes.
- `selectedPairCount`: number of selected pair rows.
- `consideredCellCount`: source-pair/target combinations passing the name
  selectors **and** self-exclusion policy, whether they match the orb or not.
- `excludedPairMemberCount`: combinations dropped by self-exclusion after
  name selection.
- `matchedCellCount`: number of matching pair/target cells (not axis hits).
- `activePairCount`: pairs having at least one matching target.
- Immutable, versioned `FACTS_ONLY` output. No interpretations or new
  scientific provenance are implied by selecting or re-filtering an orbit.

## Limits and integrations

This module is **stacked on draft PR #51**, which in turn depends on
PR #47 → #26 → #23 and sibling PR #35. It adds only new files: no shared
`src/index.mjs`, `package.json`, UI, backend, release, or production changes.
It is a source-layer primitive **for future** VirgoStars Desktop controls;
there is no integrated desktop UI in this PR and no published npm API.

The input must originate from a trustworthy matrix snapshot. This helper
checks the versioned matrix envelope and core row/target contact shapes, but
**does not independently prove** the astronomy, coordinate frame, source
provenance, or consistency of arbitrarily forged matrix contents. Consumers
must validate same zodiac/ayanamsa, observer/reference center, time model and
pinned VirgoStars Ephemeris data before relying on any geometric results.
No astrological causation or numerical JPL/Rust integration is asserted.

## Verification

```sh
node --test test/zodiac-midpoint-matrix-filter.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-matrix-filter.test.ts
npm test  # complete checkout after dependent PR reconciliation
```

Tests cover all/none selectors, pair intersection, unknown/duplicate names,
source-target overlap and explicit self-exclusion, exact 0/90-degree orb,
orb widening beyond the source matrix setting, deep immutability, malformed
contracts, and a bounded 496 × 32 = 15,872-cell synthetic snapshot. These
synthetic fixtures do **not** replace full-repository or scientific tests.

Project attribution: https://github.com/Cesare-ml/VirgoStars-Ephemeris
