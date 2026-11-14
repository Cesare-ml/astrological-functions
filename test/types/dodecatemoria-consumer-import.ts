import {
  calculateDodecatemoriaFacts,
  type DodecatemoriaInput,
  type DodecatemoriaMethod,
  type DodecatemoriaFacts,
  type DodecatemoriaZodiac,
} from 'astrological-functions/dodecatemoria';

const method: DodecatemoriaMethod = 'TWELVE_EQUAL_PARTS_V1';
const zodiac: DodecatemoriaZodiac = 'TROPICAL';
const input: DodecatemoriaInput = { longitudeDeg: 11, method, zodiac };
const facts: Readonly<DodecatemoriaFacts> = calculateDodecatemoriaFacts(input);
const projectedLongitude: number = facts.projectedLongitudeDeg;
const partIndex: number | null = facts.partIndex;
void projectedLongitude;
void partIndex;

// @ts-expect-error A method must be explicit.
calculateDodecatemoriaFacts({ longitudeDeg: 11, zodiac: 'TROPICAL' });
// @ts-expect-error A zodiac basis must be explicit.
calculateDodecatemoriaFacts({ longitudeDeg: 11, method: 'PAULUS_13_V1' });
// @ts-expect-error Unversioned methods are not supported.
calculateDodecatemoriaFacts({ longitudeDeg: 11, zodiac: 'SIDEREAL', method: 'PAULUS' });
// @ts-expect-error Unknown zodiac variants must not be accepted.
calculateDodecatemoriaFacts({ longitudeDeg: 11, zodiac: 'UNKNOWN', method: 'PAULUS_13_V1' });
// @ts-expect-error Returned facts are read-only.
facts.projectedLongitudeDeg = 2;
