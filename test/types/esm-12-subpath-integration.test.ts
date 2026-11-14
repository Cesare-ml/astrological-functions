/**
 * Compile from the combined private package, not from relative src/ paths:
 * tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext
 *     --target ES2022 test/types/esm-12-subpath-integration.test.ts
 */
import { calculateDeclinationContacts } from 'astrological-functions/declination-contacts';
import { calculateDeclinationContactsWithProvider } from 'astrological-functions/declination-provider';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';
import { compareHouseMethodPlacements } from 'astrological-functions/house-method-comparison';
import { compareWholeSignEqualWithPinnedSources } from 'astrological-functions/pinned-whole-equal-comparison';
import { calculateSourcedDeclinationContacts } from 'astrological-functions/sourced-declination-contacts';
import { buildSourcedHousePlacementMatrix } from 'astrological-functions/sourced-house-placement-matrix';
import { prepareTransitAspectEventCandidates } from 'astrological-functions/transit-events';
import { calculateTransitFacts } from 'astrological-functions/transits';
import { compareWholeSignAndEqualFromAscendant } from 'astrological-functions/whole-equal-house-comparison';
import { classifyZodiacDecan } from 'astrological-functions/zodiac-decan-facts';

const exportedFunctions: readonly ((...args: never[]) => unknown)[] = [
  calculateDeclinationContacts,
  calculateDeclinationContactsWithProvider,
  calculateDodecatemoriaFacts,
  calculateNatalWithProvider,
  compareHouseMethodPlacements,
  compareWholeSignEqualWithPinnedSources,
  calculateSourcedDeclinationContacts,
  buildSourcedHousePlacementMatrix,
  prepareTransitAspectEventCandidates,
  calculateTransitFacts,
  compareWholeSignAndEqualFromAscendant,
  classifyZodiacDecan,
];
void exportedFunctions;

const typedCancellation: AbortSignal = new AbortController().signal;
const invalidDirection = 'REVERSE_UNKNOWN' as const;
// @ts-expect-error unsupported declination contact direction
calculateDeclinationContacts({direction: invalidDirection, sourcePoints: [],
  targetPoints: [], contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }]});
// @ts-expect-error unlisted internal implementation path cannot be imported
import { calculateTransitFacts as privateTransit } from 'astrological-functions/src/transit-facts.mjs';
void privateTransit;
void typedCancellation;
