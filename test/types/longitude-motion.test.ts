import { classifyLongitudeMotion, type LongitudeMotion, type LongitudeMotionFacts } from '../../src/longitude-motion.mjs';

const result: Readonly<LongitudeMotionFacts> = classifyLongitudeMotion({
  longitudeSpeedDegPerDay: -0.1,
  stationaryThresholdDegPerDay: 0.01,
});
const motion: LongitudeMotion = result.motion;
const exactContract: 'LongitudeMotionFacts' = result.contract;
const expectedBasis: 'LONGITUDE_DERIVATIVE' = result.motionBasis;
void [motion, exactContract, expectedBasis];

// @ts-expect-error Missing explicit stationary threshold.
classifyLongitudeMotion({longitudeSpeedDegPerDay: 0.01});
// @ts-expect-error The caller must provide a computed numeric speed.
classifyLongitudeMotion({longitudeSpeedDegPerDay: null, stationaryThresholdDegPerDay: 0.01});
// @ts-expect-error No implicit synodic phase classification is exported here.
result.synodicPhase;
// @ts-expect-error Motion output is read-only.
result.motion = 'DIRECT';
