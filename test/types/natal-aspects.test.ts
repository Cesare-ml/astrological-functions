import { calculateNatalAspects, type NatalAspectDefinition, type NatalAspectPoint } from '../../src/natal-aspects.mjs';

const points: readonly NatalAspectPoint[] = [
  { name: 'Sun', longitudeDeg: 359 }, { name: 'Moon', longitudeDeg: 2 }
];
const aspectDefinitions: readonly NatalAspectDefinition[] = [
  { id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 }
];
const result = calculateNatalAspects({ points, aspectDefinitions });
const angle: number = result.aspects[0]?.actualAngleDeg ?? 0;
const count: number = result.pairsConsidered;
const status: 'SOURCE_POSITIONS_NOT_INDEPENDENTLY_VERIFIED' = result.validationStatus;
void angle; void count; void status;
// @ts-expect-error immutable result cannot be mutated
result.aspects.push({});
// @ts-expect-error geometry requires explicit aspect definitions
calculateNatalAspects({ points });
// @ts-expect-error named source longitude cannot be a string
calculateNatalAspects({ points: [{name:'Sun',longitudeDeg:'12'}], aspectDefinitions });
