export type SolstitialCoordinateContext = Readonly<{
  zodiac: 'TROPICAL';
  center: 'EARTH';
  frame: 'ECLIPTIC_OF_DATE';
  corrections: 'APPARENT';
}>;

export type SolstitialMirrorFacts = Readonly<{
  contract: 'SolstitialMirrorFacts';
  contractVersion: '0.1.0-experimental';
  longitudeDeg: number;
  antisciaLongitudeDeg: number;
  contraAntisciaLongitudeDeg: number;
  coordinateContext: SolstitialCoordinateContext;
  coordinateContextStatus: 'CALLER_ASSERTED_NOT_VERIFIED';
}>;

export declare function calculateSolstitialMirrors(input: Readonly<{
  longitudeDeg: number;
  context: SolstitialCoordinateContext;
}>): SolstitialMirrorFacts;
