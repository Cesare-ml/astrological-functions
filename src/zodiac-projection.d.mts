/** Caller-provided geometry and ayanamsa; no astronomical calculations. */
export interface DatedAyanamsa {
  readonly id: string;
  readonly version: string;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly offsetDeg: number;
}
interface ApparentLongitudeInput {
  readonly longitudeDeg: number;
  readonly datetimeUtc: string;
  readonly center: 'EARTH';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly corrections: 'APPARENT';
}
export type ZodiacProjectionInput = ApparentLongitudeInput & (
  { readonly zodiac: 'TROPICAL'; readonly ayanamsa?: never } |
  { readonly zodiac: 'SIDEREAL'; readonly ayanamsa: DatedAyanamsa }
);
export interface ZodiacProjectionFact {
  readonly contract: 'ZodiacProjectionFact';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly reference: Readonly<{ center: 'EARTH'; frame: 'ECLIPTIC_OF_DATE'; corrections: 'APPARENT' }>;
  readonly zodiac: 'TROPICAL' | 'SIDEREAL';
  readonly tropicalLongitudeDeg: number;
  readonly zodiacLongitudeDeg: number;
  readonly zodiacSignIndex: number;
  readonly ayanamsa: Readonly<DatedAyanamsa> | null;
  readonly validation: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED';
  readonly interpretation: 'FACTS_ONLY';
}
export declare function projectZodiacLongitude(input: ZodiacProjectionInput): Readonly<ZodiacProjectionFact>;
