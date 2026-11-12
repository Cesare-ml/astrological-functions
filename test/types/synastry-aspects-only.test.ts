import type { SynastryAspectsOnlyInput, SynastryAspectsOnlyResult } from '../../src/synastry-aspects-only.mjs';
import type { ExperimentalNatalResult } from '../../src/ephemeris-provider.js';

declare const a: ExperimentalNatalResult;
declare const b: ExperimentalNatalResult;
declare const unknownAtRuntime: boolean;
declare const result: SynastryAspectsOnlyResult;

const uncertain: SynastryAspectsOnlyInput = {
  chartA:a,chartB:b,
  birthTimeKnownA:false,positionBasisA:'REPRESENTATIVE_INSTANT',
  birthTimeKnownB:true,positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],selectedBodyNamesB:['Mars'],
  aspectDefinitions:[],
};
const known: SynastryAspectsOnlyInput = {
  chartA:a,chartB:b,
  birthTimeKnownA:true,positionBasisA:'KNOWN_BIRTH_INSTANT',
  birthTimeKnownB:true,positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],selectedBodyNamesB:['Mars'],
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}],
};
const zeroHouses: null = result.aToB.houseOverlays;
const zeroAngles: null = result.angles;
const reliability: 'PROVISIONAL' | 'SUPPLIED_INSTANTS' = result.timeReliability;
const directionA: 'A_TO_B' = result.aToB.direction;
const directionB: 'B_TO_A' = result.bToA.direction;
void uncertain;void known;void zeroHouses;void zeroAngles;void reliability;void directionA;void directionB;

// @ts-expect-error an unknown birth time cannot claim an exact birth instant
const incorrectUnknown: SynastryAspectsOnlyInput = { ...uncertain,positionBasisA:'KNOWN_BIRTH_INSTANT' };
// @ts-expect-error a known birth time cannot use an assumed representative instant
const incorrectKnown: SynastryAspectsOnlyInput = { ...known,positionBasisB:'REPRESENTATIVE_INSTANT' };
// @ts-expect-error unresolved UI boolean must be narrowed before this call
const unresolved: SynastryAspectsOnlyInput = { ...known,birthTimeKnownA:unknownAtRuntime };
// @ts-expect-error explicitly selected body list is mandatory
const missingBodies: SynastryAspectsOnlyInput = {
  chartA:a,chartB:b,birthTimeKnownA:true,positionBasisA:'KNOWN_BIRTH_INSTANT',
  birthTimeKnownB:true,positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],aspectDefinitions:[],
};
// @ts-expect-error even a null cusp field is unsupported in this variant
const invalidCusp: SynastryAspectsOnlyInput = { ...known,cuspSetA:null };
// @ts-expect-error explicit aspect rule array is required even if empty
const missingDefinitions: SynastryAspectsOnlyInput = {
  chartA:a,chartB:b,birthTimeKnownA:true,positionBasisA:'KNOWN_BIRTH_INSTANT',
  birthTimeKnownB:true,positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],selectedBodyNamesB:['Mars'],
};
void incorrectUnknown;void incorrectKnown;void unresolved;void missingBodies;void invalidCusp;void missingDefinitions;
