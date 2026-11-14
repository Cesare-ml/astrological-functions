export type DodecatemoriaMethod = 'PAULUS_13_V1' | 'TWELVE_EQUAL_PARTS_V1';
export type DodecatemoriaZodiac = 'TROPICAL' | 'SIDEREAL';

export interface DodecatemoriaInput {
  /** Already projected into the explicitly selected zodiac; no ayanamsa is calculated. */
  readonly longitudeDeg: number;
  readonly zodiac: DodecatemoriaZodiac;
  /** Required; historical conventions must not be silently conflated. */
  readonly method: DodecatemoriaMethod;
}

export interface DodecatemoriaFacts {
  readonly contract: 'DodecatemoriaFacts';
  readonly contractVersion: '1';
  readonly zodiac: DodecatemoriaZodiac;
  readonly method: DodecatemoriaMethod;
  readonly sourceLongitudeDeg: number;
  /** Zero-based Aries=0 ... Pisces=11, within the supplied zodiac. */
  readonly sourceSignIndex: number;
  readonly sourceDegreesInSign: number;
  readonly projectedLongitudeDeg: number;
  readonly projectedSignIndex: number;
  /** Zero-based 2.5-degree segment; null for the 13-fold method. */
  readonly partIndex: number | null;
}

export declare function calculateDodecatemoriaFacts(input: DodecatemoriaInput): Readonly<DodecatemoriaFacts>;
