/** Type contract for the experimental ESM .mjs synastry facts composer. */
import type { BidirectionalHouseOverlayInput, DirectionalHouseOverlayResult } from './directional-house-overlays.js';

export interface SynastryAspectDefinition {
  readonly id: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
}
export interface SynastryPoint {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly type: string;
}
export interface SynastryAspectFact {
  readonly direction: 'A_TO_B' | 'B_TO_A';
  readonly source: Readonly<SynastryPoint>;
  readonly target: Readonly<SynastryPoint>;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
export type SynastryFactsInput = Readonly<BidirectionalHouseOverlayInput & {
  aspectDefinitions: readonly SynastryAspectDefinition[];
}>;
export interface SynastryFactsResult {
  readonly contract: 'SynastryFactsResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly houseMode: 'FULL_HOUSES';
  readonly aspectDefinitions: readonly Readonly<SynastryAspectDefinition>[];
  readonly aToB: Readonly<{
    direction: 'A_TO_B';
    houseOverlays: Readonly<DirectionalHouseOverlayResult & {direction: 'A_TO_B'; sourceChart: 'A'; targetChart: 'B'}>;
    aspects: readonly Readonly<SynastryAspectFact & {direction: 'A_TO_B'}>[];
  }>;
  readonly bToA: Readonly<{
    direction: 'B_TO_A';
    houseOverlays: Readonly<DirectionalHouseOverlayResult & {direction: 'B_TO_A'; sourceChart: 'B'; targetChart: 'A'}>;
    aspects: readonly Readonly<SynastryAspectFact & {direction: 'B_TO_A'}>[];
  }>;
}
export declare function calculateSynastryFacts(input: SynastryFactsInput): Readonly<SynastryFactsResult>;
