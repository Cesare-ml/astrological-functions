# Experimental lunar longitude-phase sectors (F5)

Status: **IMPLEMENTED_ISOLATED** — pure geometric method. Not astronomical phase-event validation, physical illumination, or an ephemeris integration.

## Interface

`calculateLunarElongationSectors` is exported from the experimental ESM subpath `astrological-functions/lunar-elongation`. It requires caller-provided **Sun and Moon apparent geocentric ecliptic-of-date longitudes at the same instant**, in one declared `TROPICAL` or `SIDEREAL` zodiac convention. Sidereal inputs must carry an explicit nonempty `ayanamsaId`; the function does not calculate the ayanamsa.

```js
import { calculateLunarElongationSectors } from 'astrological-functions/lunar-elongation';

const facts = calculateLunarElongationSectors({
  sunLongitudeDeg: 359,
  moonLongitudeDeg: 1,
  context: {
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    zodiac: 'TROPICAL',
  },
});
// facts.directedElongationDeg === 2
// facts.sectorId === 'NEW'
```

The caller must ensure both input positions came from the **same instant and coordinate model**; this API cannot independently prove the origin of supplied numbers. The required metadata is an explicit caller assertion, not astronomical validation.

## Method

- `directedElongationDeg = normalize360(moonLongitudeDeg - sunLongitudeDeg)` (Moon **minus** Sun, not unsigned angular separation).
- Eight 45° bins are centered on 0°, 45°, 90°, 135°, 180°, 225°, 270° and 315°, named `NEW`, `WAXING_CRESCENT`, `FIRST_QUARTER`, `WAXING_GIBBOUS`, `FULL`, `WANING_GIBBOUS`, `LAST_QUARTER`, `WANING_CRESCENT`.
- At the exact half-sector boundary (22.5° from a center), ownership passes to the **next** sector in increasing-longitude direction. `337.5°` belongs to `NEW`, `22.5°` to `WAXING_CRESCENT`.
- Immutable output exposes normalized input longitudes, directed elongation, sector index/id/center, signed deviation and a detached validated context.

These are **conventional geometric angular sectors**, not scientifically derived moments of New/Full Moon or quarter events, not light fraction, not time-to-phase, not a Moon latitude/distance model, and not VirgoStars synodic `D1/R2/R3/D4` phase states. No astronomical algorithm or Swiss dependency is bundled. Consume the exact, validated Rust ephemeris positions later through a separately reviewed provider adapter.

## Local validation

Run `node --test test/lunar-elongation.test.mjs` and `npm test` on Node.js 20+ after checkout. Synthetic cases cover eight centers, Aries wrap and signed direction, boundary ties, sidereal metadata, immutability, numeric errors and context rejection. This does not establish JPL/Horizons parity or production readiness.

Do not release, deploy, merge to main or switch an existing chart calculation automatically.

## Execution record — 2026-11-12

- GitHub branch: `feat/lunar-elongation-sectors-f5-20261112-2320`
- Executed **6/6 synthetic tests, PASS** against the exact fetched GitHub source blobs (`src/index.mjs` and `src/lunar-elongation.mjs`) and committed test bodies, using an isolated V8 JavaScript runtime and a small test/assert adapter.
- This is **not** a native Node.js `node --test` or `npm test` run; those commands and TypeScript consumer compilation remain to be executed after checkout.
- No scientific JPL ephemeris data, real chart fixtures, UTC source-coherency verification or deployed consumers were used. Status remains `IMPLEMENTED_ISOLATED`.
