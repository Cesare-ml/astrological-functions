import {
  calculateDodecatemoriaBatchFacts,
  type DodecatemoriaBatchInput,
  type DodecatemoriaBatchFacts,
  type DodecatemoriaBatchPoint,
} from 'astrological-functions/dodecatemoria-batch';

const point: DodecatemoriaBatchPoint = { id: 'SUN', longitudeDeg: 11 };
const input: DodecatemoriaBatchInput = {
  points: [point, { id: 'MOON', longitudeDeg: 27.5 }],
  zodiac: 'TROPICAL',
  method: 'TWELVE_EQUAL_PARTS_V1',
};
const facts: Readonly<DodecatemoriaBatchFacts> = calculateDodecatemoriaBatchFacts(input);
const index: number | null = facts.points[0].facts.partIndex;
const longitude: number = facts.points[1].facts.projectedLongitudeDeg;
void index;
void longitude;

// @ts-expect-error The selected method is mandatory.
calculateDodecatemoriaBatchFacts({ points: [point], zodiac: 'TROPICAL' });
// @ts-expect-error The zodiac basis is mandatory.
calculateDodecatemoriaBatchFacts({ points: [point], method: 'PAULUS_13_V1' });
// @ts-expect-error Wrong point coordinate type.
calculateDodecatemoriaBatchFacts({ points: [{ id: 'SUN', longitudeDeg: '11' }], zodiac: 'SIDEREAL', method: 'PAULUS_13_V1' });
// @ts-expect-error Unsupported unversioned method.
calculateDodecatemoriaBatchFacts({ points: [point], zodiac: 'TROPICAL', method: 'PAULUS' });
// @ts-expect-error Readonly returned points must not be mutated.
facts.points[0].id = 'ALTERED';
// @ts-expect-error Returned array must not be mutated.
facts.points.push({ id: 'NEW', facts: facts.points[0].facts });
