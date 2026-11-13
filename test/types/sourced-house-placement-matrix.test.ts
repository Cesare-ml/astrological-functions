import { buildSourcedHousePlacementMatrix } from '../../src/sourced-house-placement-matrix.mjs';
import type {
  SourcedHousePlacementMatrixInput, SourcedHousePlacementMatrixResult,
} from '../../src/sourced-house-placement-matrix.mjs';
import type { SourcedHouseSnapshot, DeclaredHouseSource } from '../../src/house-source-consistency.mjs';

const datetimeUtc='2026-11-13T16:00:00Z';
const longitudeBasis={type:'TROPICAL'} as const;
const source: DeclaredHouseSource={
  datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis,
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_RUST',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'SYNTHETIC_TIME',corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
};
const whole: SourcedHouseSnapshot={
  snapshot:{houseSystem:'WHOLE_SIGN',datetimeUtc,frame:'ECLIPTIC_OF_DATE',
    longitudeBasis,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},source,
};
const equal: SourcedHouseSnapshot={
  snapshot:{...whole.snapshot,houseSystem:'EQUAL_ASCENDANT',
    cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},source,
};
const porphyry: SourcedHouseSnapshot={
  snapshot:{...whole.snapshot,houseSystem:'PORPHYRY',
    provenanceStatus:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
    cuspsDeg:[10,41.66666666667,73.33333333333,105,133.33333333333,
      161.6666666667,190,221.6666666667,253.3333333333,285,313.3333333333,341.6666666667]},
  source,
};
const input: SourcedHousePlacementMatrixInput={
  birthTimeKnown:true,methods:[whole,equal,porphyry],
  positions:{source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    points:[{id:'SUN',longitudeDeg:0}]},
};
const result: Readonly<SourcedHousePlacementMatrixResult>=buildSourcedHousePlacementMatrix(input);
const methods: readonly ('WHOLE_SIGN'|'EQUAL_ASCENDANT'|'PORPHYRY')[]=result.methodNames;
const ids: readonly string[]=result.changedPointIds;
const index: number=result.rows[0].placements[0].house;
const pairCount: number=result.pairwiseChanges[0].changedCount;
const pairLeft: 'WHOLE_SIGN'|'EQUAL_ASCENDANT'|'PORPHYRY'=result.pairwiseChanges[0].leftHouseSystem;
const changedInPair: readonly string[]=result.pairwiseChanges[0].changedPointIds;
void methods; void ids; void index; void pairCount; void pairLeft; void changedInPair;
// @ts-expect-error house placement comparisons must explicitly know birth time
const missingBirthTime: SourcedHousePlacementMatrixInput={...input,birthTimeKnown:false};
void missingBirthTime;
// @ts-expect-error unsupported historical Vehlow is not silently a whole-sign alias
const unknownMethod: SourcedHouseSnapshot={...whole,snapshot:{...whole.snapshot,houseSystem:'egizia'}};
void unknownMethod;
// @ts-expect-error a scientifically verified status is not accepted from a caller
const overstated: SourcedHousePlacementMatrixInput={...input,positions:{...input.positions,provenanceStatus:'VERIFIED'}};
void overstated;
// @ts-expect-error a returned house placement cannot be modified
result.rows[0].placements[0].house=5;
// @ts-expect-error result counts are readonly
result.changedCount=0;

// @ts-expect-error pair summaries cannot be mutated
result.pairwiseChanges[0].changedCount=0;
// @ts-expect-error pair IDs are readonly
result.pairwiseChanges[0].changedPointIds.push('UNVERIFIED');

const twoMethods: SourcedHousePlacementMatrixInput={
  ...input,methods:[whole,equal],
};
const threeReadonly: readonly [
  SourcedHouseSnapshot,SourcedHouseSnapshot,SourcedHouseSnapshot
]=[whole,equal,porphyry];
const threeMethods: SourcedHousePlacementMatrixInput={
  ...input,methods:threeReadonly,
};
void buildSourcedHousePlacementMatrix(twoMethods);
void buildSourcedHousePlacementMatrix(threeMethods);

// @ts-expect-error zero method snapshots are not a valid matrix
const noMethods: SourcedHousePlacementMatrixInput={...input,methods:[]};
void noMethods;
// @ts-expect-error one method cannot form a comparison
const oneMethod: SourcedHousePlacementMatrixInput={...input,methods:[whole]};
void oneMethod;
// @ts-expect-error more than three method snapshots are intentionally unsupported
const fourMethods: SourcedHousePlacementMatrixInput={
  ...input,
  methods:[whole,equal,porphyry,whole],
};
void fourMethods;
// @ts-expect-error method tuples are readonly, not editable after initialization
input.methods.push(whole);
