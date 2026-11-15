import type { IntraChartAspectFact } from './intra-chart-aspects.mjs';

export interface IntraChartAspectConnection {
  readonly otherPointId: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  /** Geometry only, not applying/separating. */
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
export interface IntraChartAspectIndexNode {
  readonly pointId: string;
  readonly connections: readonly IntraChartAspectConnection[];
}
export interface IntraChartAspectIndex {
  readonly contract: 'IntraChartAspectIndex';
  readonly contractVersion: '0.1.0-experimental';
  readonly validationStatus: 'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED';
  readonly pointCount: number;
  readonly factCount: number;
  readonly nodes: readonly IntraChartAspectIndexNode[];
}
/**
 * Validates and indexes supplied undirected aspect facts for symmetric lookup.
 * Input contains only geometric facts, not birth-time or ephemeris credentials.
 */
export declare function indexIntraChartAspects(input: {
  readonly pointIds: readonly string[];
  readonly facts: readonly IntraChartAspectFact[];
}): IntraChartAspectIndex;
