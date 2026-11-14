/** A caller-asserted coordinate convention; no projection occurs here. */
export type ZodiacCoordinatePolicy =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;

export interface ZodiacDecanInput {
  readonly longitudeDeg: number;
  readonly zodiac: ZodiacCoordinatePolicy;
}

/** Sector facts only, without traditional ruler assignments or interpretations. */
export interface ZodiacDecanFact {
  readonly contract: 'ZodiacDecanFact';
  readonly contractVersion: '1-experimental';
  readonly zodiac: ZodiacCoordinatePolicy;
  readonly normalizedLongitudeDeg: number;
  /** Aries = 0, Pisces = 11 in the supplied zodiac convention. */
  readonly signIndex: number;
  /** One-based decan number within its sign: 1, 2 or 3. */
  readonly decanNumber: number;
  /** Zero-based sector number across the 360-degree zodiac: 0 through 35. */
  readonly globalDecanIndex: number;
  /** Inclusive start longitude of the ten-degree sector. */
  readonly startDeg: number;
  /** Exclusive end longitude, with 360 represented as 0. */
  readonly endDeg: number;
  /** Offset from sector start in [0, 10). */
  readonly distanceFromStartDeg: number;
}

export declare function classifyZodiacDecan(input: ZodiacDecanInput): ZodiacDecanFact;
