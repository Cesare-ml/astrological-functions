import { calculateSolstitialMirrors } from '../../src/solstitial-mirrors.mjs';
import type { SolstitialCoordinateContext, SolstitialMirrorFacts } from '../../src/solstitial-mirrors.mjs';

const context: SolstitialCoordinateContext = {
  zodiac: 'TROPICAL', center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
};
const result: SolstitialMirrorFacts = calculateSolstitialMirrors({ longitudeDeg: 40, context });
const antiscia: number = result.antisciaLongitudeDeg;
void antiscia;

// @ts-expect-error sidereal longitudes cannot be passed as tropical mirror context
calculateSolstitialMirrors({ longitudeDeg: 40, context: { ...context, zodiac: 'SIDEREAL' } });
// @ts-expect-error a longitude must be a number
calculateSolstitialMirrors({ longitudeDeg: '40', context });
// @ts-expect-error required correction metadata must be present
calculateSolstitialMirrors({ longitudeDeg: 40, context: { zodiac: 'TROPICAL' } });
