# Zodiac midpoint axis — isolated pure geometry (experimental F1)

`calculateZodiacMidpointAxis` consumes two **already calculated** ecliptic
longitudes in degrees. It returns the two antipodal midpoint-axis solutions
without deriving planetary positions, velocities, zodiac corrections,
interpretations or psychological/causal claims.

```js
import {calculateZodiacMidpointAxis} from '../src/zodiac-midpoint-axis.mjs';
const facts = calculateZodiacMidpointAxis({
  firstLongitudeDeg: 350,
  secondLongitudeDeg: 10,
});
// axisLongitudesDeg: [0, 180], shortArcMidpointDeg: 0
```

## Explicit geometry and the 180-degree tie

- Longitudes use the existing `normalize360` helper and are validated as finite
  numbers. No hidden rounding, zodiac, orb or house-system policy is applied.
- The **midpoint axis** consists of two longitudes 180° apart. Its two values
  are sorted ascending to make their representation independent of endpoint
  ordering. Both endpoints are returned normalized and detached from the inputs.
- The shortest angular separation is in the interval 0..180°. When that
  separation is **strictly less than 180°**, one midpoint is reached by the
  unique shortest arc; the other is exactly opposite it.
- At **exact 180° opposition**, both paths are equally short: the two axis
  coordinates are still returned, but `shortArcMidpointDeg` and
  `opposingMidpointDeg` are **null**, and `hasUniqueShortArcMidpoint` is `false`.
  The module never silently privileges one solution at that tie.
- Coincident points have separation 0° and short-arc midpoint equal to their
  shared normalized longitude. They still have an antipodal axis partner.
- Exact opposition compares the supplied double-precision geometry with 180°:
  there is deliberately **no implicit near-opposition tolerance**. Consumers
  needing numerical error bounds must supply a separate explicit policy.

## Integration boundaries

This adds only new files; shared `src/index.mjs` and `package.json` remain
untouched while other draft branches own export / ephemeris-provider changes.
No public package export is promised. The caller is responsible for confirming
that the longitudes share a valid frame, center, time model, coordinate mode
(tropical or same versioned sidereal ayanamsa) and astronomical provenance.

## Verification

```sh
node --test test/zodiac-midpoint-axis.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-axis.test.ts
npm test
```

Synthetic geometry tests check 0/360 wrap, reversible endpoint order, exact
opposition, identical points, invalid input, immutability and type safety.
These tests are **not** independent NASA/JPL scientific validation, real
Rust/WASM integration or evidence of production readiness.

VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris
