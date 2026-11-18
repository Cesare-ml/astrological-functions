export type RegoloSect = 'DAY' | 'NIGHT';
export type RegoloZodiac = 'TROPICAL' | 'SIDEREAL';
export type RegoloPlanetId = 'SUN' | 'MOON' | 'MERCURY' | 'VENUS' | 'MARS' | 'JUPITER' | 'SATURN';
export type RegoloKlerosId = 'TYCHE' | 'DAIMON' | 'ANANKE' | 'BASIS' | 'EROS' | 'HERMES' | 'TOLMA' | 'NIKE' | 'NEMESI';

export interface RegoloLotInput {
  readonly birthTimeKnown: true;
  readonly sect: RegoloSect;
  readonly zodiac: RegoloZodiac;
  readonly chartContextId: string;
  readonly ascendantLongitudeDeg: number;
  readonly planetsLongitudeDeg: Readonly<Record<RegoloPlanetId, number>>;
}

export interface RegoloLotPosition {
  readonly id: RegoloKlerosId;
  readonly longitudeDeg: number;
  readonly zodiacSignIndex: number;
}

export interface RegoloKleroiResult {
  readonly contract: 'RegoloKleroiResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly method: 'REGOLO_LEGACY_NINE_LOTS_V1';
  readonly sect: RegoloSect;
  readonly zodiac: RegoloZodiac;
  readonly chartContextId: string;
  readonly kleroi: Readonly<Record<RegoloKlerosId, Readonly<RegoloLotPosition>>>;
  readonly warnings: readonly string[];
}

export declare const REGOLO_LOT_SOURCE: Readonly<{
  repository: string; commit: string; file: string; method: 'REGOLO_LEGACY_NINE_LOTS_V1';
}>;
export declare const REGOLO_PLANET_IDS: readonly RegoloPlanetId[];
export declare function readRegoloLotCore(input: RegoloLotInput): Readonly<{
  asc: number;
  planets: Readonly<Record<RegoloPlanetId, number>>;
  sect: RegoloSect;
  zodiac: RegoloZodiac;
  chartContextId: string;
}>;
export declare function calculateRegoloKleroi(input: RegoloLotInput): Readonly<RegoloKleroiResult>;
