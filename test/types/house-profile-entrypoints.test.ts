import type { HouseCuspSetInput } from '../../src/ephemeris-provider.js';
import { resolveHousePlacementPolicy, locateLongitudeWithHousePolicy, validateHouseCuspSet } from '../../src/ephemeris-provider.js';

// House labels and calculation profiles must agree at every typed entry point.
resolveHousePlacementPolicy({ houseSystem: 'egizia', calculationProfile: 'VIRGOSTARS_LEGACY_V1', placementMethod: 'CUSP_INTERVAL' });
resolveHousePlacementPolicy({ houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', placementMethod: 'CUSP_INTERVAL' });
// @ts-expect-error Canonical profile cannot use a legacy label.
resolveHousePlacementPolicy({ houseSystem: 'egizia', calculationProfile: 'CANONICAL_V1', placementMethod: 'CUSP_INTERVAL' });

const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
locateLongitudeWithHousePolicy({ longitudeDeg: 45, cusps, houseSystem: 'placido', calculationProfile: 'VIRGOSTARS_LEGACY_V1', placementMethod: 'CUSP_INTERVAL' });
// @ts-expect-error Legacy label requires legacy profile for placement.
locateLongitudeWithHousePolicy({ longitudeDeg: 45, cusps, houseSystem: 'placido', calculationProfile: 'CANONICAL_V1', placementMethod: 'CUSP_INTERVAL' });

const canonical: HouseCuspSetInput = {
  houseSystem: 'PLACIDUS', calculationProfile: 'CANONICAL_V1', cusps,
  metadata: { houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL' },
};
validateHouseCuspSet(canonical);
const legacy: HouseCuspSetInput = {
  houseSystem: 'placido', calculationProfile: 'VIRGOSTARS_LEGACY_V1', cusps,
  metadata: { houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL' },
};
validateHouseCuspSet(legacy);
// @ts-expect-error Canonical profile cannot carry a legacy label in cusp input.
const invalid: HouseCuspSetInput = {
  houseSystem: 'placido', calculationProfile: 'CANONICAL_V1', cusps,
  metadata: { houseSystem: 'PLACIDUS', placementMethod: 'CUSP_INTERVAL' },
};
void invalid;
