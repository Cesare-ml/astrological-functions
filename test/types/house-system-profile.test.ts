import type { HouseSystemSelection } from '../../src/ephemeris-provider.js';
import { resolveHouseSystem } from '../../src/ephemeris-provider.js';

// Identifier compatibility is a type-level guard only; it does not compute cusps.
const canonical: HouseSystemSelection = { houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1' };
const legacy: HouseSystemSelection = { houseSystem: 'egizia', calculationProfile: 'VIRGOSTARS_LEGACY_V1' };
resolveHouseSystem(canonical);
resolveHouseSystem(legacy);
resolveHouseSystem({ houseSystem: 'PLACIDUS', calculationProfile: 'VIRGOSTARS_LEGACY_V1' });

// @ts-expect-error Legacy aliases require explicit legacy profile.
const invalid: HouseSystemSelection = { houseSystem: 'egizia', calculationProfile: 'CANONICAL_V1' };
void invalid;
// @ts-expect-error Direct calls must also reject canonical/legacy mismatch.
resolveHouseSystem({ houseSystem: 'placido', calculationProfile: 'CANONICAL_V1' });
