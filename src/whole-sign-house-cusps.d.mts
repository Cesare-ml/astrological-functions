/** Experimental whole-sign cusp geometry; ascendant supplied by a separate provider. */
export type LongitudeBasis =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;

export interface WholeSignHouseCuspsInput {
  readonly ascendantLongitudeDeg: number;
  /** This slice refuses to invent houses if a birth time is unavailable. */
  readonly birthTimeKnown: true;
  /** UTC ISO-8601 calendar instant ending Z, with 0..3 fractional second digits. */
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  /** Already-projected zodiac basis of the supplied ascendant and all chart points. */
  readonly longitudeBasis: LongitudeBasis;
}

export interface WholeSignHouseCuspsResult {
  readonly contract: 'WholeSignHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'WHOLE_SIGN';
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly birthTimeKnown: true;
  readonly ascendantLongitudeDeg: number;
  /** Aries = 0, Pisces = 11, in the specified zodiac basis. */
  readonly ascendantSignIndex: number;
  /** The beginning of each zodiac sign from the ascendant sign, in house order. */
  readonly cuspsDeg: readonly number[];
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}

export declare function calculateWholeSignHouseCusps(
  input: WholeSignHouseCuspsInput,
): Readonly<WholeSignHouseCuspsResult>;
