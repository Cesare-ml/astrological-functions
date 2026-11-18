export interface HistoricalHouseAngleRequest {
  ut1JulianDay: number; ttJulianDay: number; latitudeDeg: number; longitudeDegEast: number;
}
export interface HistoricalHouseAngles extends HistoricalHouseAngleRequest {
  model: 'EXPERIMENTAL_LONG_TERM_SIDEREAL_TIME'; armcDeg: number;
  trueObliquityDeg: number; ascendantDeg: number; midheavenDeg: number;
}
export declare function calculateHistoricalHouse(
  request: HistoricalHouseAngleRequest & {houseSystem: 'PORPHYRY' | 'PLACIDUS' | 'REGIOMONTANUS' | 'KOCH'; engineVersion: string; birthTimeKnown: true},
  provider: {calculateHouseAngles(input: HistoricalHouseAngleRequest): HistoricalHouseAngles | Promise<HistoricalHouseAngles>},
): Promise<Readonly<{contract: 'ExperimentalHistoricalHouse'; houseSystem: string; ut1JulianDay: number;
  ttJulianDay: number; angleModel: string; engineVersion: string;
  result: Readonly<{cuspsDeg: readonly number[]; epochUt1JulianDay: number}>; validation: string}>>;
