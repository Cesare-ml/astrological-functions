import { compareHousePlacementsWithSourcedPoints } from '../../src/sourced-house-points.mjs';
import type {
  CallerAssertedPointSnapshot, SourcedHousePointComparisonInput,
} from '../../src/sourced-house-points.mjs';
import type { DeclaredHouseSource, SourcedHouseSnapshot } from '../../src/house-source-consistency.mjs';

const datetimeUtc = '2026-11-13T15:00:00Z';
const longitudeBasis = {type:'TROPICAL'} as const;
const source: DeclaredHouseSource = {
  datetimeUtc, frame:'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_RUST',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'SYNTHETIC_UTC',corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
};
const left: SourcedHouseSnapshot = {
  source, snapshot: {houseSystem:'WHOLE_SIGN',datetimeUtc,
    frame:'ECLIPTIC_OF_DATE',longitudeBasis,
    provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},
};
const right: SourcedHouseSnapshot = {
  source, snapshot:{...left.snapshot,houseSystem:'EQUAL_ASCENDANT',
    cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},
};
const positions: CallerAssertedPointSnapshot = {
  source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  points:[{id:'SUN',longitudeDeg:0}],
};
const input: SourcedHousePointComparisonInput = {birthTimeKnown:true,left,right,positions};
const output = compareHousePlacementsWithSourcedPoints(input);
const count: number = output.pointCount;
const status: 'MATCHING_CALLER_ASSERTED_HOUSE_AND_POINT_SOURCES_NOT_INDEPENDENTLY_VERIFIED' = output.status;
void count;
void status;
// @ts-expect-error unknown birth time must not become eligible
const invalidBirthTime: SourcedHousePointComparisonInput = {...input,birthTimeKnown:false};
void invalidBirthTime;
// @ts-expect-error corrections cannot fall back to geometric values
const invalidCorrections: DeclaredHouseSource = {...source,corrections:'GEOMETRIC'};
void invalidCorrections;
// @ts-expect-error this is never a scientifically validated point snapshot
const invalidProvenance: CallerAssertedPointSnapshot = {...positions,provenanceStatus:'SCIENTIFICALLY_VALIDATED'};
void invalidProvenance;
// @ts-expect-error output must be readonly
output.houseComparison.comparison.changedCount=4;
// @ts-expect-error result status must not be promoted
output.status='SCIENTIFICALLY_VALIDATED';
