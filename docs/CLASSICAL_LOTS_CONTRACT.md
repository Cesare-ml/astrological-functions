# Classical Lots — strict isolated arithmetic (F6 candidate)

Status: **IMPLEMENTED_ISOLATED**, **not exported from `package.json`**, not a released astrology/natal service. VirgoStars project: https://github.com/Cesare-ml/VirgoStars-Ephemeris.

`src/classical-lots.mjs` exposes `calculateClassicalLots(input)` for two **symbolic** chart-coordinate facts: Fortune and Spirit. The chosen convention is explicitly versioned `SECT_REVERSAL_V1`; historical and application conventions may differ. This function does **not** determine a person's daytime/nighttime birth chart, calculate an Ascendant, or fetch Sun/Moon coordinates; the Rust VirgoStars Ephemeris remains the only planned source of astronomical positions.

## Formula (degrees, wrapped modulo 360)

| Input sect | Fortune | Spirit |
|---|---|---|
| `DAY` | Ascendant + Moon − Sun | Ascendant + Sun − Moon |
| `NIGHT` | Ascendant + Sun − Moon | Ascendant + Moon − Sun |

All inputs are required: known birth time (`birthTimeKnown: true`), explicit `sect`, explicit `zodiac`, nonblank `chartContextId`, finite Ascendant/Sun/Moon longitudes. `chartContextId` is a caller-chosen, preferably non-personal identifier asserting that all inputs share the **same instant, zodiac/ayanamsa, coordinate frame and calculation provenance**. The module cannot independently verify this assertion. Never mix apparent-of-date chart angles with geometric J2000 or an unrelated sidereal offset. `sect` must be independently established from a suitable astronomical/house method; it must not be inferred from civil clock hour.

## Example (internal import; not a public package export)

```js
import { calculateClassicalLots } from './src/classical-lots.mjs';

const result = calculateClassicalLots({
  birthTimeKnown: true, sect: 'DAY', zodiac: 'TROPICAL',
  chartContextId: 'synthetic-001',
  ascendantLongitudeDeg: 350, sunLongitudeDeg: 20, moonLongitudeDeg: 80,
});
// Fortune: 50°; Spirit: 290° — synthetic geometry, not a verified natal chart.
```

Results are deeply frozen and carry `contractVersion`, `method`, `sect`, `zodiac`, `chartContextId`, sign indices and the warning `CALLER_ASSERTED_SHARED_CHART_AND_SECT_NOT_VERIFIED`. Unknown time or sect fails closed; no substitution of a noon chart, guessed house or default sect. The input/output is facts-only; no horoscope interpretation or claims of prediction/causation. `chartContextId` should not embed birth data or private IDs.

## Test gates

```sh
node --test test/classical-lots.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/classical-lots.test.ts
npm test
```

Tests use synthetic angles (wrap, conjunction/opposition, day/night reversal, invalid inputs, immutability), not NASA/JPL scientific verification. Before package export or merging, review the method convention against legacy VirgoStars `arabic lots` fields, compare with independently established sect/Ascendant for a set of non-personal fixtures, and run full native Node tests on an authenticated complete checkout. Do not publish or deploy this module by itself.
