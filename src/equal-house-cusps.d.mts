/** Experimental geometry only; no ascendant, ayanamsa or ephemeris calculation. */
export type LongitudeBasis =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;

export interface EqualHouseCuspsInput {
  /** Caller-provided ascendant in the SAME zodiac basis as future chart points. */
  readonly ascendantLongitudeDeg: number;
  /** Actual UTC instant associated with the supplied ascendant; no timezone offset. */
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
}

export interface EqualHouseCuspsResult {
  readonly contract: 'EqualHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'EQUAL_ASCENDANT';
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly ascendantLongitudeDeg: number;
  /** Exactly 12 forward ordered start cusps, with house 1 at ascendant. */
  readonly cuspsDeg: readonly number[];
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}

export declare function calculateEqualHouseCusps(
  input: EqualHouseCuspsInput,
): Readonly<EqualHouseCuspsResult>;
