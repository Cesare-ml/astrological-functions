/** Experimental, caller-asserted whole-sign house geometry; no astronomy. */
export type WholeSignLongitudeBasis =
  | Readonly<{ type: 'TROPICAL'; ayanamsaId?: never }>
  | Readonly<{ type: 'SIDEREAL'; ayanamsaId: string }>;
export interface WholeSignHouseCuspsInput {
  readonly ascendantLongitudeDeg: number;
  readonly birthTimeKnown: true;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: WholeSignLongitudeBasis;
}
export interface WholeSignHouseCuspsResult {
  readonly contract: 'WholeSignHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'WHOLE_SIGN';
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: WholeSignLongitudeBasis;
  readonly ascendantLongitudeDeg: number;
  readonly ascendantSignIndex: number;
  readonly cuspsDeg: readonly number[];
  readonly provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculateWholeSignHouseCusps(
  input: WholeSignHouseCuspsInput,
): Readonly<WholeSignHouseCuspsResult>;
