import { classifyZodiacDecan, type ZodiacDecanFact, type ZodiacCoordinatePolicy } from 'astrological-functions/zodiac-decan-facts';

const tropical: ZodiacCoordinatePolicy = { type: 'TROPICAL' };
const fact: ZodiacDecanFact = classifyZodiacDecan({ longitudeDeg: 45, zodiac: tropical });
const globalIndex: number = fact.globalDecanIndex;
const offset: number = fact.distanceFromStartDeg;
void globalIndex;
void offset;

const sidereal: ZodiacCoordinatePolicy = { type: 'SIDEREAL', ayanamsaId: 'EXAMPLE_V1' };
classifyZodiacDecan({ longitudeDeg: 45, zodiac: sidereal });

// @ts-expect-error the exported consumer API never supplies a default zodiac
classifyZodiacDecan({ longitudeDeg: 45 });
// @ts-expect-error the sidereal convention requires an ayanamsaId
classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'SIDEREAL' } });
// @ts-expect-error tropical coordinates cannot declare a sidereal ayanamsa
classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'TROPICAL', ayanamsaId: 'X' } });
// @ts-expect-error longitude is numeric
classifyZodiacDecan({ longitudeDeg: '45', zodiac: tropical });
// @ts-expect-error output is readonly
fact.decanNumber = 3;
// @ts-expect-error output policy is readonly
fact.zodiac.type = 'SIDEREAL';
