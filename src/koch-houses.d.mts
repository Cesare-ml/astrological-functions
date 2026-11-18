import type { PlacidusHouseInput, PlacidusHouseCusps, HistoricalPlacidusHouseInput } from './placidus-houses.mjs';
export type KochHouseInput = PlacidusHouseInput;
export interface KochHouseCusps extends Omit<PlacidusHouseCusps, 'contract' | 'houseSystem'> {
  readonly contract: 'KochHouseCusps';
  readonly houseSystem: 'KOCH';
}
export declare function calculateKochHouseCusps(input: KochHouseInput): Readonly<KochHouseCusps>;
export declare function calculateKochHouseCusps(input: HistoricalPlacidusHouseInput): Readonly<Omit<KochHouseCusps, 'datetimeUtc'> & {epochUt1JulianDay: number}>;
