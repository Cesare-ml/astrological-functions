import type { PlacidusHouseInput, PlacidusHouseCusps, HistoricalPlacidusHouseInput } from './placidus-houses.mjs';
export type RegiomontanusHouseInput = PlacidusHouseInput;
export interface RegiomontanusHouseCusps extends Omit<PlacidusHouseCusps, 'contract' | 'houseSystem'> {
  readonly contract: 'RegiomontanusHouseCusps';
  readonly houseSystem: 'REGIOMONTANUS';
}
export declare function calculateRegiomontanusHouseCusps(input: RegiomontanusHouseInput): Readonly<RegiomontanusHouseCusps>;
export declare function calculateRegiomontanusHouseCusps(input: HistoricalPlacidusHouseInput): Readonly<Omit<RegiomontanusHouseCusps, 'datetimeUtc'> & {epochUt1JulianDay: number}>;
