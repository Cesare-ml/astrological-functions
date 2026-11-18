import { calculateRegoloLotsFromAstronomicalFacts } from 'astrological-functions/regolo-lots-astronomy-bridge';
import type {
  RegoloLotsAstronomyBridgeInput, RegoloSunHorizonSnapshot,
  RegoloPrecedingNewMoon, RegoloLotsAstronomyBridgeResult,
} from 'astrological-functions/regolo-lots-astronomy-bridge';

declare const input: RegoloLotsAstronomyBridgeInput;
declare const horizon: RegoloSunHorizonSnapshot;
declare const lunation: RegoloPrecedingNewMoon;
const result: Readonly<RegoloLotsAstronomyBridgeResult> =
  calculateRegoloLotsFromAstronomicalFacts(input);
const sect: 'DAY' | 'NIGHT' = result.sect;
const longitude: number = result.kleroi.kleroi.TYCHE.longitudeDeg;
const count: number = result.arabicParts.availableCount;
void [horizon, lunation, sect, longitude, count];

// @ts-expect-error The bridge does not accept an application-guessed sect.
calculateRegoloLotsFromAstronomicalFacts({ ...input, natal: {...input.natal, sect: 'NIGHT'} });
// @ts-expect-error Astronomy pin must belong to the VirgoStars engine family.
calculateRegoloLotsFromAstronomicalFacts({...input, expectedEphemeris: {...input.expectedEphemeris, engineId: 'SWISS'}});
// @ts-expect-error The injected new-Moon availability must be discriminated.
calculateRegoloLotsFromAstronomicalFacts({...input, precedingNewMoon: {availability: 'AVAILABLE', longitudeDeg: 0}});
