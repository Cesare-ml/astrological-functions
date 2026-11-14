import type { PlacidusHouseInput, PlacidusHouseCusps } from './placidus-houses.mjs';
export type RegiomontanusHouseInput = PlacidusHouseInput;
export interface RegiomontanusHouseCusps extends Omit<PlacidusHouseCusps, 'contract' | 'houseSystem'> {
  readonly contract: 'RegiomontanusHouseCusps';
  readonly houseSystem: 'REGIOMONTANUS';
}
export declare function calculateRegiomontanusHouseCusps(input: RegiomontanusHouseInput): Readonly<RegiomontanusHouseCusps>;
