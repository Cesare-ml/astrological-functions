import { calculateRegoloLotsFromVirgoStarsRiseSet } from
  'astrological-functions/regolo-lots-rise-set-bridge';
import type { RegoloLotsRiseSetBridgeInput } from
  'astrological-functions/regolo-lots-rise-set-bridge';

declare const input: RegoloLotsRiseSetBridgeInput;
const result = calculateRegoloLotsFromVirgoStarsRiseSet(input);
const sect: 'DAY' | 'NIGHT' = result.sect;
const moon: string = result.precedingNewMoon.availability;
const evid: 'INJECTED_EPHEMERIS_ENGINE_NOT_AUTHENTICATED' = result.scientificEvidence;
void [sect, moon, evid];
