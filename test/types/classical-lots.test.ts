import { calculateClassicalLots } from '../../src/classical-lots.mjs';
import type { ClassicalLotsInput, ClassicalLotsResult } from '../../src/classical-lots.mjs';

const input: ClassicalLotsInput = {
  birthTimeKnown: true,
  sect: 'DAY',
  zodiac: 'TROPICAL',
  chartContextId: 'synthetic-001',
  ascendantLongitudeDeg: 350,
  sunLongitudeDeg: 20,
  moonLongitudeDeg: 80,
};
const result: Readonly<ClassicalLotsResult> = calculateClassicalLots(input);
const fortune: number = result.lots.fortune.longitudeDeg;
const sign: number = result.lots.spirit.zodiacSignIndex;
void [fortune,sign];

// @ts-expect-error unknown birth time cannot be passed as known.
calculateClassicalLots({...input, birthTimeKnown:false});
// @ts-expect-error no implicit sect.
calculateClassicalLots({...input, sect:'UNKNOWN'});
// @ts-expect-error no implicit zodiac.
calculateClassicalLots({...input, zodiac:'DRACONIC'});
// @ts-expect-error output coordinates are readonly.
result.lots.fortune.longitudeDeg = 0;
