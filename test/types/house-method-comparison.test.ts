import { compareHouseMethodPlacements } from '../../src/house-method-comparison.mjs';
import type { HouseCuspSnapshot, HouseMethodComparisonInput } from '../../src/house-method-comparison.mjs';
const utc = '2026-11-12T21:15:03Z';
const first: HouseCuspSnapshot = {
  houseSystem: 'WHOLE_SIGN', datetimeUtc: utc, frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type:'TROPICAL' },
  provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  cuspsDeg: [0,30,60,90,120,150,180,210,240,270,300,330],
};
const input: HouseMethodComparisonInput = { birthTimeKnown: true, left: first,
  right: { ...first, houseSystem:'EQUAL_ASCENDANT' },
  points: [{id:'Sun',longitudeDeg:0}],
};
const result = compareHouseMethodPlacements(input);
const status: 'CALLER_ASSERTED_CONTEXT_NOT_INDEPENDENTLY_VERIFIED' = result.status;
const changedCount: number = result.changedCount;
void status;
void changedCount;
// @ts-expect-error this contract refuses to compare houses for unknown birth time
const unavailable: HouseMethodComparisonInput = { ...input, birthTimeKnown: false };
void unavailable;
// @ts-expect-error a house method cannot be inferred from a nonstandard legacy alias
const unknownMethod: HouseCuspSnapshot = { ...first, houseSystem: 'EGIZIA' };
void unknownMethod;
// @ts-expect-error frozen / readonly consumer output
result.facts[0].changed = true;
