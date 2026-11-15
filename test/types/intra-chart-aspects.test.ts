import {
  calculateIntraChartAspects,
  type IntraChartAspectFact,
  type IntraChartPoint,
  type IntraChartAspectDefinition,
} from '../../src/intra-chart-aspects.mjs';

const points: readonly IntraChartPoint[] = [
  { id: 'Sun', longitudeDeg: 0 },
  { id: 'Moon', longitudeDeg: 120 },
];
const definitions: readonly IntraChartAspectDefinition[] = [
  { id: 'trine', angleDeg: 120, maxOrbDeg: 3 },
];
const facts: readonly IntraChartAspectFact[] = calculateIntraChartAspects({
  points, aspectDefinitions: definitions,
});
const pointId: string | undefined = facts[0]?.pointAId;
const separation: number | undefined = facts[0]?.actualAngleDeg;
void pointId;
void separation;
// @ts-expect-error A longitude is numeric, not a formatted string.
calculateIntraChartAspects({ points: [{ id: 'Sun', longitudeDeg: '0' }], aspectDefinitions: [] });
// @ts-expect-error Explicit aspect definitions are mandatory.
calculateIntraChartAspects({ points });
// @ts-expect-error Facts are immutable.
facts[0].pointAId = 'changed';
