import { classifyZodiacDecan, type ZodiacDecanFact } from '../../src/zodiac-decan-facts.mjs';

const tropical = classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'TROPICAL' } });
const sidereal: ZodiacDecanFact = classifyZodiacDecan({
  longitudeDeg: 11, zodiac: { type: 'SIDEREAL', ayanamsaId: 'EXAMPLE_VERSION' },
});
const signIndex: number = sidereal.signIndex;
const decanNumber: number = tropical.decanNumber;
void signIndex;
void decanNumber;

// @ts-expect-error no implicit zodiac type
classifyZodiacDecan({ longitudeDeg: 45 });
// @ts-expect-error sidereal convention requires an explicit ayanamsa ID
classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'SIDEREAL' } });
// @ts-expect-error tropical convention must not have a sidereal ayanamsa
classifyZodiacDecan({ longitudeDeg: 45, zodiac: { type: 'TROPICAL', ayanamsaId: 'X' } });
// @ts-expect-error longitude cannot be a text value
classifyZodiacDecan({ longitudeDeg: '45', zodiac: { type: 'TROPICAL' } });
// @ts-expect-error readonly output cannot be mutated
sidereal.globalDecanIndex = 19;
// @ts-expect-error readonly nested policy cannot be reassigned
sidereal.zodiac.type = 'TROPICAL';
