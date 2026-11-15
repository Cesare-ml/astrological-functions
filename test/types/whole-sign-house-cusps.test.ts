import { calculateWholeSignHouseCusps } from '../../src/whole-sign-house-cusps.mjs';
import type { WholeSignHouseCuspsInput, WholeSignHouseCuspsResult } from '../../src/whole-sign-house-cusps.mjs';

const input: WholeSignHouseCuspsInput = {
  ascendantLongitudeDeg: 51.5,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'SAMPLE_TEST_V1' },
};
const result: Readonly<WholeSignHouseCuspsResult> = calculateWholeSignHouseCusps(input);
const cusp: number = result.cuspsDeg[0];
const system: 'WHOLE_SIGN' = result.houseSystem;
void cusp;
void system;

// @ts-expect-error an unknown birth time cannot be accepted as an explicit known time
const unknownTime: WholeSignHouseCuspsInput = { ...input, birthTimeKnown: false };
void unknownTime;
// @ts-expect-error sidereal requires an ayanamsa identifier
const missingAyanamsa: WholeSignHouseCuspsInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
void missingAyanamsa;
// @ts-expect-error cusps are readonly
result.cuspsDeg[0] = 180;
