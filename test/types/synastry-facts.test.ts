import type {
  SynastryFactsInput, SynastryFactsResult, SynastryAspectDefinition,
} from '../../src/synastry-facts.mjs';
import type {
  ExperimentalNatalResult, HouseCuspContextInput,
} from '../../src/ephemeris-provider.js';

declare const chartA: ExperimentalNatalResult;
declare const chartB: ExperimentalNatalResult;
declare const cuspSetA: HouseCuspContextInput['cuspSet'];
declare const cuspSetB: HouseCuspContextInput['cuspSet'];
declare const birthTimeFromUi: boolean;
declare const result: SynastryFactsResult;
declare const definition: SynastryAspectDefinition;

const valid: SynastryFactsInput = {
  chartA,chartB,cuspSetA,cuspSetB,
  birthTimeKnownA:true,birthTimeKnownB:true,
  aspectDefinitions:[definition],
};
const forward: 'A_TO_B' = result.aToB.direction;
const backward: 'B_TO_A' = result.bToA.direction;
const fullHouses: 'FULL_HOUSES' = result.houseMode;
const orbit: number = result.aToB.aspects[0].absoluteOrbDeg;
void valid;void forward;void backward;void fullHouses;void orbit;

// @ts-expect-error both cusp sets are required for a complete two-way result
const missingTargetB: SynastryFactsInput = {
  chartA,chartB,cuspSetA,birthTimeKnownA:true,birthTimeKnownB:true,
  aspectDefinitions:[definition],
};
// @ts-expect-error both cusp sets are required for a complete two-way result
const missingTargetA: SynastryFactsInput = {
  chartA,chartB,cuspSetB,birthTimeKnownA:true,birthTimeKnownB:true,
  aspectDefinitions:[definition],
};
// @ts-expect-error an explicit aspect configuration is mandatory
const missingAspectSet: SynastryFactsInput = {
  chartA,chartB,cuspSetA,cuspSetB,birthTimeKnownA:true,birthTimeKnownB:true,
};
const unresolved: SynastryFactsInput = {
  chartA,chartB,cuspSetA,cuspSetB,
  // @ts-expect-error unresolved UI boolean cannot authorize house placement
  birthTimeKnownA:birthTimeFromUi,birthTimeKnownB:true,
  aspectDefinitions:[],
};
void missingTargetB;void missingTargetA;void missingAspectSet;void unresolved;
