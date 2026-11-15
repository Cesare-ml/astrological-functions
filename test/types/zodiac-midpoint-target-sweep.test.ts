import {
  calculateZodiacMidpointTargetSweep,
  type ZodiacMidpointTargetSweepFacts,
} from '../../src/zodiac-midpoint-target-sweep.mjs';

const facts: Readonly<ZodiacMidpointTargetSweepFacts> = calculateZodiacMidpointTargetSweep({
  firstLongitudeDeg: 350,
  secondLongitudeDeg: 10,
  targetPoints: [{name:'Sun',longitudeDeg:0},{name:'Moon',longitudeDeg:182}],
  maxOrbDeg: 3,
});
const separation: number = facts.targets[0].nearestAxisSeparationDeg;
const axis: readonly [number, number] = facts.midpointAxis.axisLongitudesDeg;
const names: readonly string[] = facts.matchedTargetNames;
void [separation, axis, names];

// @ts-expect-error No implicit orb is permitted.
calculateZodiacMidpointTargetSweep({firstLongitudeDeg:0,secondLongitudeDeg:30,targetPoints:[]});
// @ts-expect-error Longitude must be a number.
calculateZodiacMidpointTargetSweep({firstLongitudeDeg:0,secondLongitudeDeg:30,targetPoints:[{name:'Sun',longitudeDeg:'2'}],maxOrbDeg:3});
// @ts-expect-error Result is readonly.
facts.matchCount = 3;
// @ts-expect-error Nested point is readonly.
facts.targets[0].name='changed';
// @ts-expect-error Does not compute sky velocities.
facts.longitudeSpeedDegPerDay;
