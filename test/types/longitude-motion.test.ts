import {
  classifyLongitudinalMotion,
  type LongitudeMotion,
  type LongitudeMotionFact,
  type LongitudeMotionInput,
} from '../../src/longitude-motion.mjs';

const input: LongitudeMotionInput = {
  longitudeSpeedDegPerDay: null,
  stationaryThresholdDegPerDay: 0.01,
};
const result: LongitudeMotionFact = classifyLongitudinalMotion(input);
const motion: LongitudeMotion = result.motion;
void motion;
// @ts-expect-error motion categories must not include synodic phases
const invalidMotion: LongitudeMotion = 'R2';
void invalidMotion;
// @ts-expect-error explicit numeric tolerance is mandatory
classifyLongitudinalMotion({ longitudeSpeedDegPerDay: 1 });
// @ts-expect-error speed cannot be an implicit string
classifyLongitudinalMotion({ longitudeSpeedDegPerDay: '0.2', stationaryThresholdDegPerDay: 0.01 });
// @ts-expect-error output is read-only
result.motion = 'DIRECT';
