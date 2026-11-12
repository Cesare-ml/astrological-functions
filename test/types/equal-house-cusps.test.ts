import { calculateEqualHouseCusps } from '../../src/equal-house-cusps.mjs';
import type { EqualHouseCuspsInput, EqualHouseCuspsResult } from '../../src/equal-house-cusps.mjs';

const input: EqualHouseCuspsInput = {
  ascendantLongitudeDeg: 14.5,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
};
const result: EqualHouseCuspsResult = calculateEqualHouseCusps(input);
const firstCusp: number = result.cuspsDeg[0];
const marker: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED' = result.provenanceStatus;
void firstCusp;
void marker;

const sidereal: EqualHouseCuspsInput = {
  ...input,
  longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' },
};
calculateEqualHouseCusps(sidereal);

// @ts-expect-error Sidereal input requires named ayanamsa metadata.
const invalidSidereal: EqualHouseCuspsInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
// @ts-expect-error Tropical input rejects an ayanamsa identifier.
const invalidTropical: EqualHouseCuspsInput = { ...input, longitudeBasis: { type: 'TROPICAL', ayanamsaId: 'TEST' } };
// @ts-expect-error Never mutate returned cusps.
result.cuspsDeg[0] = 45;
void invalidSidereal;
void invalidTropical;
