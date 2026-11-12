import type { DirectionalHouseOverlayInput, BidirectionalHouseOverlayInput, BidirectionalHouseOverlayResult } from '../../src/directional-house-overlays.js';
import type { ExperimentalNatalResult, HouseCuspContextInput } from '../../src/ephemeris-provider.js';

declare const a: ExperimentalNatalResult;
declare const b: ExperimentalNatalResult;
declare const cusps: HouseCuspContextInput['cuspSet'];
declare const unresolvedBirthTime: boolean;

const forward: DirectionalHouseOverlayInput = {
  direction:'A_TO_B', chartA:a, chartB:b,
  birthTimeKnownA:true, birthTimeKnownB:true, cuspSetB:cusps,
};
const backward: DirectionalHouseOverlayInput = {
  direction:'B_TO_A', chartA:a, chartB:b,
  birthTimeKnownA:true, birthTimeKnownB:true, cuspSetA:cusps,
};
void forward;
void backward;

// @ts-expect-error A_TO_B requires the target B cusp set.
const noTargetB: DirectionalHouseOverlayInput = {
  direction:'A_TO_B', chartA:a, chartB:b,
  birthTimeKnownA:true, birthTimeKnownB:true, cuspSetA:cusps,
};
// @ts-expect-error B_TO_A requires the target A cusp set.
const noTargetA: DirectionalHouseOverlayInput = {
  direction:'B_TO_A', chartA:a, chartB:b,
  birthTimeKnownA:true, birthTimeKnownB:true, cuspSetB:cusps,
};
const unresolved: DirectionalHouseOverlayInput = {
  direction:'A_TO_B', chartA:a, chartB:b,
  // @ts-expect-error unresolved application boolean must first be narrowed to true.
  birthTimeKnownA:unresolvedBirthTime, birthTimeKnownB:true, cuspSetB:cusps,
};
const transit: DirectionalHouseOverlayInput = {
  // @ts-expect-error Transit direction intentionally is not synastry.
  direction:'SKY_TO_NATAL', chartA:a, chartB:b,
  birthTimeKnownA:true, birthTimeKnownB:true, cuspSetB:cusps,
};
void noTargetB;
void noTargetA;
void unresolved;
void transit;

const both: BidirectionalHouseOverlayInput = {
  chartA:a, chartB:b, birthTimeKnownA:true, birthTimeKnownB:true, cuspSetA:cusps, cuspSetB:cusps,
};
declare const result: BidirectionalHouseOverlayResult;
const directionA: 'A_TO_B' = result.aToB.direction;
const directionB: 'B_TO_A' = result.bToA.direction;
void directionA;
void directionB;
void both;
// @ts-expect-error a bidirectional request must include both sets.
const missingB: BidirectionalHouseOverlayInput = {
  chartA:a, chartB:b, birthTimeKnownA:true, birthTimeKnownB:true, cuspSetA:cusps,
};
// @ts-expect-error a bidirectional request must include both sets.
const missingA: BidirectionalHouseOverlayInput = {
  chartA:a, chartB:b, birthTimeKnownA:true, birthTimeKnownB:true, cuspSetB:cusps,
};
void missingA;
void missingB;
