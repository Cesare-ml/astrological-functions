import type { PlacidusHouseInput, PlacidusHouseCusps } from './placidus-houses.mjs';
export type KochHouseInput = PlacidusHouseInput;
export interface KochHouseCusps extends Omit<PlacidusHouseCusps, 'contract' | 'houseSystem'> {
  readonly contract: 'KochHouseCusps';
  readonly houseSystem: 'KOCH';
}
export declare function calculateKochHouseCusps(input: KochHouseInput): Readonly<KochHouseCusps>;
