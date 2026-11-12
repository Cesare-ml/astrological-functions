/** Astronomy-free geometric facts; all source positions must share one caller-validated zodiac/frame/epoch. */
export interface NatalAspectPoint {
  readonly name: string;
  readonly longitudeDeg: number;
}
export interface NatalAspectDefinition {
  readonly id: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
}
export interface NatalAspectMatch {
  readonly pointA: Readonly<NatalAspectPoint>;
  readonly pointB: Readonly<NatalAspectPoint>;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  /** actualAngleDeg - exactAngleDeg, not an applying/separating indicator. */
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
export interface NatalAspectFacts {
  readonly contract: 'NatalAspectFacts';
  readonly contractVersion: '0.1.0-experimental';
  readonly validationStatus: 'SOURCE_POSITIONS_NOT_INDEPENDENTLY_VERIFIED';
  readonly pairsConsidered: number;
  readonly aspects: readonly NatalAspectMatch[];
}
/**
 * Explicit configured aspects among unique unordered pairs of 1..32 named points.
 * Missing/invalid inputs throw AstrologyError; no interpretation or ephemeris.
 */
export declare function calculateNatalAspects(input: {
  readonly points: readonly NatalAspectPoint[];
  readonly aspectDefinitions: readonly NatalAspectDefinition[];
}): NatalAspectFacts;
