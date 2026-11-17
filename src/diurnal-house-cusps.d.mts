import type {PorphyryAngleSource} from './porphyry-houses.mjs';

export interface DiurnalHouseInput {
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly ascendantDeg: number;
  readonly midheavenDeg: number;
  readonly armcDeg: number;
  readonly trueObliquityDeg: number;
  readonly angleModel: string;
  readonly source: PorphyryAngleSource;
}
export interface DiurnalHouseCusps {
  readonly contract: 'DiurnalHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'CAMPANUS' | 'ALCABITIUS' | 'POLICH_PAGE';
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly armcDeg: number;
  readonly trueObliquityDeg: number;
  readonly angleModel: string;
  readonly angles: Readonly<{
    readonly ascendantDeg: number;
    readonly icDeg: number;
    readonly descendantDeg: number;
    readonly midheavenDeg: number;
  }>;
  readonly source: PorphyryAngleSource;
  readonly cuspsDeg: readonly number[];
  readonly geometry: 'PRIME_VERTICAL_TRISECTION' |
    'ASCENDANT_SEMIARCS_TRISECTED_IN_RIGHT_ASCENSION' | 'TOPOCENTRIC_POLAR_HEIGHT_THIRDS';
  readonly ascendantSemidiurnalArcDeg: number | null;
  readonly polarHeightsDeg: readonly number[] | null;
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED';
}
export declare function calculateCampanusHouseCusps(
  input: DiurnalHouseInput,
): Readonly<DiurnalHouseCusps & {readonly houseSystem: 'CAMPANUS'}>;
export declare function calculateAlcabitiusHouseCusps(
  input: DiurnalHouseInput,
): Readonly<DiurnalHouseCusps & {readonly houseSystem: 'ALCABITIUS'}>;
export declare function calculatePolichPageHouseCusps(
  input: DiurnalHouseInput,
): Readonly<DiurnalHouseCusps & {readonly houseSystem: 'POLICH_PAGE'}>;
