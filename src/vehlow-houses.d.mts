/** Strict experimental Vehlow-like 30-degree house geometry, not legacy parity. */
export interface VehlowAngleSource {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
  readonly center: 'EARTH';
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly corrections: 'APPARENT' | 'IAU2006_2000B_APPROXIMATE';
  readonly zodiac: 'TROPICAL';
  readonly observerType: 'TOPOCENTRIC';
  readonly observer: Readonly<{ latitudeDeg: number; longitudeDegEast: number }>;
}
export interface VehlowHouseInput {
  readonly profile: 'VEHLOW_ASC_CENTERED_V1';
  readonly birthTimeKnown: true;
  readonly datetimeUtc: string;
  readonly ascendantDeg: number;
  readonly source: VehlowAngleSource;
}
export interface VehlowHouseCusps {
  readonly contract: 'VehlowHouseCusps';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseSystem: 'VEHLOW';
  readonly profile: 'VEHLOW_ASC_CENTERED_V1';
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly ascendantDeg: number;
  readonly cusp1Deg: number;
  readonly cuspsDeg: readonly number[];
  readonly source: Readonly<VehlowAngleSource>;
  readonly interpretation: 'FACTS_ONLY';
  readonly validation: 'CALLER_ASSERTED_ASCENDANT_NOT_INDEPENDENTLY_VERIFIED';
  readonly legacyCompatibility: 'NOT_ESTABLISHED';
}
export declare function calculateVehlowHouseCusps(input: VehlowHouseInput): Readonly<VehlowHouseCusps>;
