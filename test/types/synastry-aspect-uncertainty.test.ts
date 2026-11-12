import type {
  SynastryAspectUncertaintyInput, SynastryAspectUncertaintyResult,
  ChartLongitudeEnclosure, ConditionalAspectStatus,
} from '../../src/synastry-aspect-uncertainty.mjs';
import type {SynastryAspectsOnlyResult} from '../../src/synastry-aspects-only.mjs';

declare const aspects: SynastryAspectsOnlyResult;
declare const provenance: ChartLongitudeEnclosure['ephemerisProvenance'];
const chartEnclosure: ChartLongitudeEnclosure = {
  coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
  intervalStartUtc:'2026-01-01T00:00:00Z',
  intervalEndUtc:'2026-01-01T23:59:59Z',
  ephemerisProvenance:provenance,
  bodies:{Sun:{startDeg:359,spanDeg:4}},
};
const valid: SynastryAspectUncertaintyInput = {
  aspectsOnlyResult:aspects,enclosureA:chartEnclosure,enclosureB:chartEnclosure,
};
declare const result: SynastryAspectUncertaintyResult;
const scope: 'CONDITIONAL_ON_CALLER_ENCLOSURES' = result.interpretation;
const warning: 'ENCLOSURE_COVERAGE_NOT_VERIFIED' = result.warning.code;
const noAngles: null = result.angles;
const noHouses: 'UNAVAILABLE' = result.houseMode;
const directionA: 'A_TO_B' = result.aToB.direction;
const directionB: 'B_TO_A' = result.bToA.direction;
const status: ConditionalAspectStatus = result.aToB.facts[0].status;
const min: number = result.bToA.facts[0].separationBoundsDeg.minDeg;
void valid;void scope;void warning;void noAngles;void noHouses;
void directionA;void directionB;void status;void min;

// @ts-expect-error both chart-specific enclosures are mandatory.
const missingB: SynastryAspectUncertaintyInput = {
  aspectsOnlyResult:aspects,enclosureA:chartEnclosure,
};
// @ts-expect-error no sample-only pseudo-continuous coverage mode is permitted.
const sampleOnly: ChartLongitudeEnclosure = {
  coverage:'SAMPLES_ONLY',intervalStartUtc:'2026-01-01T00:00:00Z',
  intervalEndUtc:'2026-01-01T23:59:59Z',ephemerisProvenance:provenance,
  bodies:{Sun:{startDeg:0,spanDeg:1}},
};
const badCoverage: ChartLongitudeEnclosure = {
  // @ts-expect-error exact assertion literal is mandatory.
  coverage:'SAMPLES_ONLY',
  intervalStartUtc:'2026-01-01T00:00:00Z',
  intervalEndUtc:'2026-01-01T23:59:59Z',
  ephemerisProvenance:provenance,bodies:{Sun:{startDeg:0,spanDeg:1}},
};
// @ts-expect-error unsupported unconditional status.
const fabricated: ConditionalAspectStatus = 'ASTRONOMICALLY_CERTAIN';
void missingB;void sampleOnly;void badCoverage;void fabricated;
