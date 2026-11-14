/** Pure astrological trisection of provider-asserted tropical axes. */
export interface PorphyryAngleSource {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly zodiac: 'TROPICAL';
  readonly observerType: 'TOPOCENTRIC';
  readonly observer: Readonly<{latitudeDeg: number; longitudeDegEast: number}>;
}
export interface PorphyryHouseInput {
  readonly datetimeUtc: string;
  /** Caller-provided ecliptic longitude in degrees. */
  readonly ascendantDeg: number;
  readonly midheavenDeg: number;
  readonly source: PorphyryAngleSource;
}
export interface PorphyryHouseCusps {
  readonly contract: 'PorphyryHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'PORPHYRY';
  readonly datetimeUtc: string;
  readonly angles: Readonly<{
    ascendantDeg: number;
    icDeg: number;
    descendantDeg: number;
    midheavenDeg: number;
  }>;
  /** One 12-long array, indexed house number - 1. */
  readonly cuspsDeg: readonly number[];
  /** Four forward zodiac spans: ASC→IC, IC→DSC, DSC→MC, MC→ASC. */
  readonly quadrantSpansDeg: readonly number[];
  readonly source: Readonly<PorphyryAngleSource>;
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculatePorphyryHouseCusps(input: PorphyryHouseInput): Readonly<PorphyryHouseCusps>;
