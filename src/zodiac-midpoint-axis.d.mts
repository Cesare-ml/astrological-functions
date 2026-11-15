/** Pure geometry of two precomputed ecliptic longitudes; no ephemeris. */
export interface ZodiacMidpointAxisInput {
  readonly firstLongitudeDeg: number;
  readonly secondLongitudeDeg: number;
}

export interface ZodiacMidpointAxisFacts {
  readonly contract: 'ZodiacMidpointAxis';
  readonly contractVersion: '0.1.0-experimental';
  readonly inputs: Readonly<ZodiacMidpointAxisInput>;
  readonly separationDeg: number;
  /** Both antipodal bisectors, sorted in ascending [0, 360) order. */
  readonly axisLongitudesDeg: readonly [number, number];
  /** False only for exact 180° opposition. */
  readonly hasUniqueShortArcMidpoint: boolean;
  /** Null for exact opposition: never choose one side implicitly. */
  readonly shortArcMidpointDeg: number | null;
  /** Null for exact opposition; otherwise opposite the unique short-arc midpoint. */
  readonly opposingMidpointDeg: number | null;
  readonly calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY';
  readonly interpretation: 'FACTS_ONLY';
}

export declare function calculateZodiacMidpointAxis(
  input: ZodiacMidpointAxisInput,
): Readonly<ZodiacMidpointAxisFacts>;
