import { compareWholeSignAndEqualAscendant } from '../../src/house-method-comparison.mjs';
import type { HouseMethodComparisonInput, HouseMethodComparisonResult } from '../../src/house-method-comparison.mjs';
const context = { contractVersion:'0.1.0-experimental',
  datetimeUtc:'2026-11-12T21:15:03Z', frame:'ECLIPTIC_OF_DATE',
  longitudeBasis:{type:'TROPICAL'}, ascendantLongitudeDeg:345,
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
} as const;
const input: HouseMethodComparisonInput = {
  birthTimeKnown:true,
  wholeSign:{...context,contract:'WholeSignHouseCusps',houseSystem:'WHOLE_SIGN',
    birthTimeKnown:true,cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},
  equalAscendant:{...context,contract:'EqualHouseCusps',houseSystem:'EQUAL_ASCENDANT',
    cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},
  points:[{id:'SUN',longitudeDeg:355}],
};
const result: HouseMethodComparisonResult = compareWholeSignAndEqualAscendant(input);
const changed: boolean = result.placements[0].houseChanged;
void changed;
// @ts-expect-error Birth time cannot silently become unknown.
const unknownTime: HouseMethodComparisonInput = {...input,birthTimeKnown:false};
// @ts-expect-error The comparison direction requires Whole Sign first.
const swapped: HouseMethodComparisonInput = {...input,wholeSign:input.equalAscendant};
// @ts-expect-error Returned point ids are readonly.
result.changedPointIds[0] = 'MUTATED';
void unknownTime; void swapped;
