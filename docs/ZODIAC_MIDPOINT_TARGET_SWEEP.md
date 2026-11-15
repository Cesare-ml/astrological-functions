# Midpoint target sweep — F1 experimental pure geometry

`calculateZodiacMidpointTargetSweep` checks an **explicit list of 1–32 named
candidate longitudes** against the two antipodal solutions of one zodiac
midpoint axis. It reuses the existing `calculateZodiacMidpointContacts` from
stacked PR #26; no new midpoint, ephemeris, station or synodic calculation is
implemented here.

```js
import { calculateZodiacMidpointTargetSweep } from '../src/zodiac-midpoint-target-sweep.mjs';

const facts = calculateZodiacMidpointTargetSweep({
  firstLongitudeDeg: 350,
  secondLongitudeDeg: 10,
  targetPoints: [
    { name: 'Moon', longitudeDeg: 182 },
    { name: 'Sun', longitudeDeg: 45 },
    { name: 'Venus', longitudeDeg: 358 },
  ],
  maxOrbDeg: 2,
});
// facts.midpointAxis.axisLongitudesDeg === [0, 180]
// facts.matchedTargetNames === ['Moon', 'Venus']
```

## Contract

- Input must supply both source longitudes, `maxOrbDeg`, and a **dense** array
  of 1–32 named targets. `maxOrbDeg` is an inclusive degree threshold in
  **[0,90]**, validated by the existing single-target function; no default orb.
- Target names are unique, nonblank, already-trimmed, case-sensitive strings.
  Target output is sorted by ECMAScript string code-unit comparison, **not**
  input order, local language or astrological significance. Duplicate and
  malformed inputs fail closed with typed `AstrologyError.code` values.
- Target longitudes are finite degrees normalized to [0,360) by the existing
  core `normalize360`; source longitudes and orb are validated by the reused
  PR #26 primitive. An explicit **empty list is invalid**, not a silent empty
  match set.
- `targets[]` preserves **all** target candidates (including nonmatches):
  each contains normalized `longitudeDeg`, immutable two-point `contacts`,
  matched axis points, nearest angular separation and `hasContact`.
  `matchedTargetNames` lists the matched target names. At the inclusive
  90-degree orb maximum a target can contact **both axis solutions**, but is
  counted **once** in `matchCount`.
- At exact 180-degree opposition of the original endpoints the midpoint axis
  still has two valid antipodal coordinates, while the unique short-arc
  midpoint remains unavailable (null). No arbitrary choice is made.
- Output is recursively immutable for structures returned by this module,
  deterministic for the same values, versioned and `FACTS_ONLY`.
  Swapping the two source endpoints preserves geometry but the underlying
  axis `inputs` metadata intentionally retains source order.

## Dependencies and restrictions

**Stacked on PR #26**, which itself depends on PR #23. This is a *single-axis
screen over multiple target points*. It is separate from sibling PR #35,
which generates all source pairs, and does **not** yet build the all-pairs ×
all-targets chart-wide contact matrix. No `package.json` export or shared
`src/index.mjs` edits are introduced.

All supplied positions must already share the consumer-approved zodiac,
reference frame, observer, timestamp and numerical provenance. This module
cannot independently validate them, infer birth time or calculate positions.
It does not imply astronomical accuracy, interpretive validity or causal
astrology, and never accesses Swiss Ephemeris or private records.

## Tests

```sh
node --test test/zodiac-midpoint-target-sweep.test.mjs
# After the dependent PRs are integrated into a complete checkout:
npm test
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-target-sweep.test.ts
```

The synthetic tests exercise both axis points, exact orb edges, the 90° case,
source reversal, target order, 32-target boundary, sparse and malformed input,
immutability and equivalence with the PR #26 single-target function. These
do not substitute for full-package and real-kernel validation.

VirgoStars credits: https://github.com/Cesare-ml/VirgoStars-Ephemeris
