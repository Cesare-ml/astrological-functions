import { calculateWholeSignHouseCusps } from '../../src/whole-sign-house-cusps.mjs';
import type { WholeSignHouseCuspsInput, WholeSignHouseCuspsResult } from '../../src/whole-sign-house-cusps.mjs';
const input: WholeSignHouseCuspsInput = {
  ascendantLongitudeDeg: 14.5, birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z', frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
};
const r: WholeSignHouseCuspsResult = calculateWholeSignHouseCusps(input);
const cusp: number = r.cuspsDeg[0];
const firstSign: number = r.ascendantSignIndex;
void cusp; void firstSign;
calculateWholeSignHouseCusps({...input,longitudeBasis:{type:'SIDEREAL',ayanamsaId:'TEST_V1'}});
// @ts-expect-error Unknown birth time must not be silently assumed.
const unknownTime: WholeSignHouseCuspsInput = {...input,birthTimeKnown:false};
// @ts-expect-error Sidereal basis requires an ayanamsa identifier.
const badSidereal: WholeSignHouseCuspsInput = {...input,longitudeBasis:{type:'SIDEREAL'}};
// @ts-expect-error Tropical basis must not specify an ayanamsa.
const badTropical: WholeSignHouseCuspsInput = {...input,longitudeBasis:{type:'TROPICAL',ayanamsaId:'X'}};
// @ts-expect-error Returned cusps are readonly.
r.cuspsDeg[0] = 0;
void unknownTime; void badSidereal; void badTropical;
