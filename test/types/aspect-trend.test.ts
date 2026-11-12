import { classifyOrientedAspectTrend, type AspectTrend, type OrientedAspectTrendFact, type AspectTrendInput } from '../../src/aspect-trend.mjs';
const input: AspectTrendInput = {
  source: {longitudeDeg: 10, longitudeSpeedDegPerDay: 0},
  target: {longitudeDeg: 95, longitudeSpeedDegPerDay: 1},
  aspectAngleDeg: 90, branch: 'FORWARD', maxOrbDeg: 6, exactToleranceDeg: 0,
  stationaryRelativeSpeedDegPerDay: 0.001, motionFrame: 'COEVOLVING',
};
const fact: OrientedAspectTrendFact = classifyOrientedAspectTrend(input);
const trend: AspectTrend = fact.trend;
void trend;
// @ts-expect-error no implicit orientation is allowed
classifyOrientedAspectTrend({...input, branch: 'AUTO'});
// @ts-expect-error speed can be numeric or explicit null but not a string
classifyOrientedAspectTrend({...input, source:{longitudeDeg:5, longitudeSpeedDegPerDay:'1'}});
// @ts-expect-error no silent policy omission
classifyOrientedAspectTrend({source:input.source,target:input.target,aspectAngleDeg:90,branch:'FORWARD'});
// @ts-expect-error immutable fact fields
fact.trend='APPLYING';
// @ts-expect-error synodic state is not part of this contract
fact.synodicMotion;
