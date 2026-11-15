import { calculateIntraChartAspects } from '../../src/intra-chart-aspects.mjs';
import { indexIntraChartAspects, type IntraChartAspectIndexNode } from '../../src/intra-chart-aspect-index.mjs';
const facts = calculateIntraChartAspects({
  points:[{id:'Sun',longitudeDeg:359},{id:'Moon',longitudeDeg:2}],
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}],
});
const result = indexIntraChartAspects({pointIds:['Sun','Moon'],facts});
const nodes: readonly IntraChartAspectIndexNode[] = result.nodes;
const count: number = result.factCount;
const status: 'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED' = result.validationStatus;
void nodes; void count; void status;
// @ts-expect-error immutable results cannot be pushed
result.nodes.push({});
// @ts-expect-error no implicit list of points
indexIntraChartAspects({ facts });
// @ts-expect-error identifiers are strings
indexIntraChartAspects({pointIds:[123],facts});
