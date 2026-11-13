/** Compile-only consumer fixture; run with strict NodeNext and Bundler settings.
 * No real ephemeris is invoked. VirgoStars: https://github.com/Cesare-ml/VirgoStars-Ephemeris
 */
import { calculateNatalWithProvider, resolveHouseSystem } from 'astrological-functions/ephemeris-provider';
import type {
  EphemerisProvider, EphemerisRequest, ApparentGeocentricState,
  NatalInput, ExperimentalNatalResult, HouseSystemSelection
} from 'astrological-functions/ephemeris-provider';

const request: EphemerisRequest = {
  datetimeUtc: '2026-11-13T12:00:00Z',
  bodyName: 'Sun',
  corrections: 'APPARENT',
  frame: 'ECLIPTIC_OF_DATE'
};
const state: ApparentGeocentricState = {
  longitudeDeg: 15,
  latitudeDeg: 0,
  metadata: {
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    engineVersion: 'synthetic',
    kernelSetId: 'synthetic',
    timeModel: 'synthetic'
  }
};
const provider: EphemerisProvider = {
  async getGeocentricEcliptic(input) {
    const body: string = input.bodyName;
    void body;
    return state;
  }
};
const input: NatalInput = {
  datetimeUtc: request.datetimeUtc,
  latitudeDeg: 45,
  longitudeDegEast: 11,
  bodyNames: ['Sun'] as const,
  provider
};
const chartPromise: Promise<ExperimentalNatalResult> = calculateNatalWithProvider(input);
void chartPromise;
const selection: HouseSystemSelection = { houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1' };
const resolved = resolveHouseSystem(selection);
const system: string = resolved.houseSystem;
void system;

// @ts-expect-error A geometric correction cannot satisfy the apparent provider request.
const wrongCorrections: EphemerisRequest = { ...request, corrections: 'GEOMETRIC' };
void wrongCorrections;
// @ts-expect-error The natal contract requires a provider, not a silent fallback.
const missingProvider: NatalInput = { datetimeUtc: request.datetimeUtc, latitudeDeg: 45, longitudeDegEast: 11, bodyNames: ['Sun'] };
void missingProvider;
// @ts-expect-error Legacy aliases are not accepted in the canonical profile.
const wrongProfile: HouseSystemSelection = { houseSystem: 'egizia', calculationProfile: 'CANONICAL_V1' };
void wrongProfile;
// @ts-expect-error Provider result metadata must identify the Earth center (all other required fields remain valid).
const wrongCenter: ApparentGeocentricState = { ...state, metadata: { ...state.metadata, center: 'SUN' } };
void wrongCenter;
// @ts-expect-error Consumers must not mutate readonly ephemeris requests.
request.bodyName = 'Moon';
// @ts-expect-error The natal input's body list is readonly.
input.bodyNames.push('Moon');

// @ts-expect-error Legacy profile cannot be omitted: the compatibility policy must be explicit.
const missingProfile: HouseSystemSelection = { houseSystem: 'VEHLOW' };
void missingProfile;
// @ts-expect-error Legacy house aliases require the explicitly selected legacy profile.
const legacyAliasInCanonical: HouseSystemSelection = { houseSystem: 'porfirio', calculationProfile: 'CANONICAL_V1' };
void legacyAliasInCanonical;
// @ts-expect-error The Rust/WASM adapter must not accept a geometric frame as apparent-of-date.
const wrongFrame: EphemerisRequest = { ...request, frame: 'MEAN_ECLIPTIC_OF_DATE' };
void wrongFrame;
