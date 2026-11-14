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


/** House placement is a separate opt-in step; the natal result never invents houses. */
import { placeNatalBodiesInHouses } from 'astrological-functions/ephemeris-provider';
import type { HouseCuspContextInput } from 'astrological-functions/ephemeris-provider';
declare const externallyValidatedCusps: HouseCuspContextInput['cuspSet'];
declare const experimentalChart: ExperimentalNatalResult;
const housePlacementRequest: Parameters<typeof placeNatalBodiesInHouses>[0] = {
  chart: experimentalChart,
  cuspSet: externallyValidatedCusps,
  birthTimeKnown: true
};
void housePlacementRequest;
// @ts-expect-error Unknown birth time cannot authorize precise natal house placement.
const unknownBirthTimePlacement: Parameters<typeof placeNatalBodiesInHouses>[0] = { ...housePlacementRequest, birthTimeKnown: false };
void unknownBirthTimePlacement;
// @ts-expect-error House placement requires a context-matched external cusp payload.
const missingCuspSet: Parameters<typeof placeNatalBodiesInHouses>[0] = {
  chart: experimentalChart,
  birthTimeKnown: true
};
void missingCuspSet;

// Public result objects are immutable to consumers, including nested provenance.
// @ts-expect-error A chart's declared UTC instant cannot be reassigned.
experimentalChart.datetimeUtc = '2026-11-15T00:00:00Z';
// @ts-expect-error The provider provenance snapshot is readonly.
experimentalChart.ephemerisProvenance.kernelSetId = 'other-kernel';
// @ts-expect-error A body longitude cannot be overwritten by chart consumers.
experimentalChart.bodies.Sun.longitudeDeg = 99;
declare const birthTimeKnownAtRuntime: boolean;
// @ts-expect-error House placements cannot be authorized with an unknown-time boolean.
const unverifiedBirthTimePlacement: Parameters<typeof placeNatalBodiesInHouses>[0] = { ...housePlacementRequest, birthTimeKnown: birthTimeKnownAtRuntime };
void unverifiedBirthTimePlacement;
