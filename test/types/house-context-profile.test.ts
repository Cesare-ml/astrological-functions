import type { HouseCuspContextInput, ExperimentalNatalResult } from '../../src/ephemeris-provider.js';
import { validateHouseCuspContext, placeNatalBodiesInHouses } from '../../src/ephemeris-provider.js';

// Context-bound house cusps must retain the same legacy/canonical distinction.
declare const chart: ExperimentalNatalResult;
const provenance = { engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic' };
const metadata = {
  houseSystem: 'VEHLOW' as const,
  placementMethod: 'CUSP_INTERVAL' as const,
  datetimeUtc: '2026-01-01T00:00:00Z',
  latitudeDeg: 0,
  longitudeDegEast: 0,
  ephemerisProvenance: provenance,
};
const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
const canonical: HouseCuspContextInput = {
  chart,
  cuspSet: { houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps, metadata },
};
validateHouseCuspContext(canonical);
placeNatalBodiesInHouses({ chart, cuspSet: canonical.cuspSet, birthTimeKnown: true });

const legacy: HouseCuspContextInput = {
  chart,
  cuspSet: { houseSystem: 'egizia', calculationProfile: 'VIRGOSTARS_LEGACY_V1', cusps, metadata },
};
validateHouseCuspContext(legacy);
placeNatalBodiesInHouses({ chart, cuspSet: legacy.cuspSet, birthTimeKnown: true });

const invalid: HouseCuspContextInput = {
  chart,
  // @ts-expect-error Canonical profile must reject the historical egizia alias.
  cuspSet: { houseSystem: 'egizia', calculationProfile: 'CANONICAL_V1', cusps, metadata },
};
void invalid;
