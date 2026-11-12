# Zodiac midpoint axis contacts — isolated F1 experimental feature

`calculateZodiacMidpointContacts` checks whether a third, caller-supplied
zodiac longitude is near either of the **two antipodal midpoint-axis points**
derived from the first two longitudes. It uses existing pure longitude geometry
from `calculateZodiacMidpointAxis` (draft PR #23), the shared
`normalize360` and `angularSeparation` functions.

```js
import { calculateZodiacMidpointContacts } from '../src/zodiac-midpoint-contact.mjs';

const result = calculateZodiacMidpointContacts({
  firstLongitudeDeg: 350,
  secondLongitudeDeg: 10,
  targetLongitudeDeg: 1,
  maxOrbDeg: 2,
});
// midpointAxis.axisLongitudesDeg: [0, 180]
// matchingAxisLongitudesDeg: [0]
// hasContact: true
```

## Explicit behavior

- The **target**, **both midpoint endpoints**, and **maximum orb** must be
  supplied. Longitude inputs must be finite numbers and are normalized to
  [0°, 360°) by the existing canonical helper.
- The orb must be a finite number in **[0°, 90°]** (degrees). The upper limit
  is the maximum possible distance to the nearer point on an antipodal axis.
  There is no implicit orb or tolerance.
- The contact rule tests conjunction to **either** midpoint-axis point,
  equivalently the conjunction/opposition axis to a midpoint. The two returned
  `contacts` are ordered by normalized axis longitude; each contains
  `longitudeDeg`, `separationDeg` in [0°, 180°], and `withinOrb`.
- Orb endpoints are **inclusive** (`separationDeg <= maxOrbDeg`), without
  hidden floating-point epsilon. At orb 90°, a target at quadrature can match
  **both** antipodal points. `matchingAxisLongitudesDeg` lists all contacts.
- If the original pair is in exact opposition, the underlying axis still has
  two valid points, but its `shortArcMidpointDeg` stays `null`: the contact
  function does not invent a unique shortest midpoint.
- Results (including nested axis, contacts and match list) are frozen and
  detached from the caller's mutable input. No interpretation or synodic
  phase is added.
- Strict `AstrologyError` codes are used for incomplete inputs, invalid orb
  and the established canonical invalid-angle checks.

## Scientific and package boundaries

No astronomy, time calculation, chart input normalization, birth-time guess,
tropical/sidereal conversion or real-kernel integration is performed here.
The caller must ensure all longitudes have the **same** suitable reference
frame, zodiac policy, time-model and validated provenance. This function
cannot determine whether such astronomical inputs are scientifically valid.
It makes no claims of astrological causation.

This PR is **stacked on draft PR #23**, and intentionally touches only five
new files. Do not merge independently of that parent. Do not modify the
`package.json` exports while parallel drafts own it; this is a repository
module, not a released external API.

## Local verification commands

```bash
node --test test/zodiac-midpoint-contact.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-midpoint-contact.test.ts
npm test
```

The unit tests use synthetic longitudes, including wrap-around, exact
opposition, coincidence, maximum orb, boundary equality, endpoint reversal,
invalid inputs, type checks and immutability. Any validation with actual
VirgoStars Ephemeris Rust/WASM positions requires a separately pinned,
reviewed provider and real-kernel scientific evidence.

VirgoStars credits: https://github.com/Cesare-ml/VirgoStars-Ephemeris
