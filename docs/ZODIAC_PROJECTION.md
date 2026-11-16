# Zodiac projection — isolated experimental F1 contract

`projectZodiacLongitude` converts a **caller-supplied apparent Earth-centered ecliptic-of-date** tropical longitude to either an unchanged tropical coordinate or a sidereal coordinate obtained by subtracting a **caller-supplied, named and versioned ayanamsa offset for the exact same UTC instant and frame**.

```js
import { projectZodiacLongitude } from '../src/zodiac-projection.mjs';

const datetimeUtc = '2026-11-12T20:30:00Z';
const projected = projectZodiacLongitude({
  longitudeDeg: 5,
  datetimeUtc,
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
  zodiac: 'SIDEREAL',
  ayanamsa: {
    id: 'SYNTHETIC_TEST_ONLY',
    version: 'test-v1',
    datetimeUtc,
    frame: 'ECLIPTIC_OF_DATE',
    offsetDeg: 24,
  },
});
// projected.zodiacLongitudeDeg === 341, sign index 11
```

## Boundaries

- **Astronomy is external**: neither ephemeris positions nor the dated ayanamsa offset is computed by this module. An unvalidated offset or inaccurate coordinate yields correspondingly inaccurate results. The declared reference frame is a caller assertion, **not** independent verification.
- **No silent conventions**: `TROPICAL` rejects any ayanamsa field. `SIDEREAL` requires a nonblank id, version, finite offset in `[0, 360)` degrees, exact UTC instant and `ECLIPTIC_OF_DATE` frame match. This is a generic offset-based projection, **not** a promise that arbitrary named sidereal conventions are interchangeable.
- UTC accepts ISO `YYYY-MM-DDTHH:mm:ss[.SSS]Z` to millisecond precision and validates it with the shared proleptic-Gregorian calendar contract. Year `0000`, invalid dates, offsets, leap seconds and precision beyond milliseconds are rejected; supported four-digit years `0001` through `9999` remain valid. Higher-precision timestamp requirements must be explicitly specified for any later public contract.
- No zodiac constellation or interpreted meaning is inferred. The output includes `FACTS_ONLY`, `CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED`, a frozen input-reference snapshot, normalized longitudes in `[0,360)` and sign indices `0..11`.
- This remains a direct repository-relative experimental import, **not** an added `package.json` export, pending reconciliation of concurrent provider/transit/synastry PRs and versioned public API design.
- It is not safe to calculate an actual sidereal natal chart until VirgoStars Ephemeris supplies validated, consistent apparent-of-date longitudes, ayanamsa model, exact time scale and independent reference checks. No Swiss dependency/fallback, database, interpretation corpus or production integration.

## Reproduce locally

```sh
node --test test/zodiac-projection.test.mjs
tsc --strict --noEmit --target es2022 --module nodenext --moduleResolution nodenext test/types/zodiac-projection.test.ts
npm test
```

All fixtures are synthetic. Licensing and preservation of VirgoStars project attribution remain mandatory review gates before publication. Project: [VirgoStars](https://github.com/Cesare-ml/VirgoStars-Ephemeris).
