import { projectZodiacLongitude, type ZodiacProjectionInput, type ZodiacProjectionFact } from '../../src/zodiac-projection.mjs';

const datetimeUtc = '2026-11-12T20:30:00Z';
const base = { longitudeDeg: 100, datetimeUtc, center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' } as const;
const tropical: ZodiacProjectionInput = { ...base, zodiac: 'TROPICAL' };
const sidereal: ZodiacProjectionInput = { ...base, zodiac: 'SIDEREAL', ayanamsa: {
  id: 'TEST', version: 'test-1', offsetDeg: 24, datetimeUtc, frame: 'ECLIPTIC_OF_DATE',
} };
const a: ZodiacProjectionFact = projectZodiacLongitude(tropical);
const b: ZodiacProjectionFact = projectZodiacLongitude(sidereal);
void [a, b];
// @ts-expect-error explicit sidereal ayanamsa required
projectZodiacLongitude({ ...base, zodiac: 'SIDEREAL' });
// @ts-expect-error tropical must not accept ayanamsa
projectZodiacLongitude({ ...base, zodiac: 'TROPICAL', ayanamsa: sidereal.ayanamsa });
// @ts-expect-error J2000 geometric is forbidden
projectZodiacLongitude({ ...base, zodiac: 'TROPICAL', frame: 'ECLIPTIC_J2000' });
// @ts-expect-error caller may not mutate facts
b.zodiacLongitudeDeg = 0;
