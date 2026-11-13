import {
  buildSourcedHousePlacementMatrix,
} from 'astrological-functions/sourced-house-placement-matrix';
import type {
  SourcedHousePlacementMatrixInput, SourcedHousePlacementMatrixResult,
  HouseMatrixMethodOccupancy,
} from 'astrological-functions/sourced-house-placement-matrix';

const dt='2026-11-13T16:00:00Z';
const source={
  datetimeUtc:dt,
  frame:'ECLIPTIC_OF_DATE' as const,
  longitudeBasis:{type:'TROPICAL' as const},
  observerType:'TOPOCENTRIC' as const,
  observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_TEST_ENGINE',
  kernelSetId:'SYNTHETIC_TEST_KERNEL',
  timeModel:'SYNTHETIC_TEST_TIME',
  corrections:'APPARENT' as const,
  calculationProfileId:'SYNTHETIC_TEST_PROFILE',
};
const basic={
  datetimeUtc:dt,
  frame:'ECLIPTIC_OF_DATE' as const,
  longitudeBasis:{type:'TROPICAL' as const},
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED' as const,
};
const whole={source,snapshot:{
  ...basic,houseSystem:'WHOLE_SIGN' as const,
  cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300],
}};
const equal={source,snapshot:{
  ...basic,houseSystem:'EQUAL_ASCENDANT' as const,
  cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315],
}};
const porphyry={source,snapshot:{
  ...basic,houseSystem:'PORPHYRY' as const,
  cuspsDeg:[10,41.66666666666667,73.33333333333334,105,133.33333333333334,
    161.66666666666666,190,221.66666666666666,253.33333333333334,
    285,313.3333333333333,341.6666666666667],
}};
const positions={
  source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED' as const,
  points:[{id:'SUN',longitudeDeg:0}],
};
const two: SourcedHousePlacementMatrixInput={
  birthTimeKnown:true,methods:[whole,equal],positions,
};
const three: SourcedHousePlacementMatrixInput={
  birthTimeKnown:true,methods:[porphyry,whole,equal],positions,
};
const outputTwo: Readonly<SourcedHousePlacementMatrixResult>=
  buildSourcedHousePlacementMatrix(two);
const outputThree=buildSourcedHousePlacementMatrix(three);
const occupancies: readonly HouseMatrixMethodOccupancy[]=outputThree.occupancyByMethod;
const occupancyId: string=outputTwo.occupancyByMethod[0].houses[0].pointIds[0];
const houseIndex: number=outputThree.rows[0].placements[0].house;
const methodName: 'WHOLE_SIGN'|'EQUAL_ASCENDANT'|'PORPHYRY'=
  outputThree.occupancyByMethod[0].houseSystem;
void occupancies;void occupancyId;void houseIndex;void methodName;

// @ts-expect-error one method cannot form a bounded comparison
const onlyOne: SourcedHousePlacementMatrixInput={
  birthTimeKnown:true,methods:[whole],positions,
};
void onlyOne;
const four: SourcedHousePlacementMatrixInput={
  birthTimeKnown:true,
  // @ts-expect-error more than three methods is unsupported
  methods:[whole,equal,porphyry,whole],
  positions,
};
void four;
// @ts-expect-error a caller cannot pretend that provenance is verified
const forgedStatus: SourcedHousePlacementMatrixInput={
  ...two,positions:{...positions,provenanceStatus:'VERIFIED'},
};
void forgedStatus;
// @ts-expect-error method tuple is readonly
two.methods.push(whole);
// @ts-expect-error occupancy house counts are readonly
outputTwo.occupancyByMethod[0].houses[0].count=42;
// @ts-expect-error grouped point IDs cannot be appended
outputTwo.occupancyByMethod[0].houses[0].pointIds.push('FORGED');
// @ts-expect-error method occupancy arrays cannot be replaced
outputTwo.occupancyByMethod[0]=outputTwo.occupancyByMethod[1];
// @ts-expect-error no default entry for unsupported historical "egizia"
const unknown: SourcedHousePlacementMatrixInput={
  ...two,methods:[{...whole,snapshot:{...whole.snapshot,houseSystem:'egizia'}},equal],
};
void unknown;
