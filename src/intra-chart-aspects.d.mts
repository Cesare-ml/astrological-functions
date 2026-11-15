/** Caller-supplied positions; physical coordinate and zodiac provenance live upstream. */
export interface IntraChartPoint {
  readonly id: string;
  readonly longitudeDeg: number;
}

export interface IntraChartAspectDefinition {
  readonly id: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
}

export interface IntraChartAspectFact {
  /** No direction: one unordered pair, ordered as in the original input. */
  readonly pointAId: string;
  readonly pointBId: string;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  /** Actual separation minus configured exact angle; NOT motion phase. */
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}

export function calculateIntraChartAspects(input: {
  readonly points: readonly IntraChartPoint[];
  readonly aspectDefinitions: readonly IntraChartAspectDefinition[];
}): readonly IntraChartAspectFact[];
