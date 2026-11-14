/** Compile-only public ESM consumer of the experimental provider→house boundary.
 * The values are synthetic, not astronomical ephemeris results.
 */
import {
  calculateNatalWithProvider,
  placeNatalBodiesInHouses,
  validateHouseCuspContext,
} from 'astrological-functions/ephemeris-provider';
import type {
  ApparentGeocentricState,
  EphemerisProvider,
  ExperimentalNatalResult,
  HouseCuspContextInput,
} from 'astrological-functions/ephemeris-provider';

const instant = '2026-11-14T00:00:00Z';
const provenance = {
  engineVersion: 'mock-engine-v1',
  kernelSetId: 'mock-kernel-v1',
  timeModel: 'mock-time-v1',
} as const;
const state: ApparentGeocentricState = {
  longitudeDeg: 15,
  latitudeDeg: 0,
  metadata: {
    center: 'EARTH',
    frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT',
    ...provenance,
  },
};
const provider: EphemerisProvider = {
  async getGeocentricEcliptic(request) {
    const body: string = request.bodyName;
    void body;
    return state;
  },
};

async function consumer() {
  const chart: ExperimentalNatalResult = await calculateNatalWithProvider({
    datetimeUtc: instant,
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames: ['Sun', 'Moon'] as const,
    provider,
  });
  const cuspSet: HouseCuspContextInput['cuspSet'] = {
    houseSystem: 'PLACIDUS',
    calculationProfile: 'CANONICAL_V1',
    cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const,
    metadata: {
      houseSystem: 'PLACIDUS',
      placementMethod: 'CUSP_INTERVAL',
      datetimeUtc: instant,
      latitudeDeg: 45,
      longitudeDegEast: 11,
      ephemerisProvenance: provenance,
    },
  };
  // The explicitly selected legacy profile may use historical Italian labels.
  const legacyCuspSet: HouseCuspContextInput['cuspSet'] = {
    ...cuspSet, houseSystem: 'egizia', calculationProfile: 'VIRGOSTARS_LEGACY_V1',
  };
  void legacyCuspSet;
  const checked = validateHouseCuspContext({chart, cuspSet});
  const checkedSystem: string = checked.houseSystem;
  void checkedSystem;

  const hasBirthTime: true = true;
  const placed = placeNatalBodiesInHouses({chart, cuspSet, birthTimeKnown: hasBirthTime});
  const house: number = placed.placements.Sun.house;
  const readonlyMethod: 'CUSP_INTERVAL' = placed.placementMethod;
  const unchangedNatalHouses: null = chart.houses;
  void house;
  void readonlyMethod;
  void unchangedNatalHouses;

  // @ts-expect-error Birth time must be explicitly confirmed, not inferred.
  placeNatalBodiesInHouses({chart, cuspSet});
  // @ts-expect-error A false flag cannot authorize exact house placement.
  placeNatalBodiesInHouses({chart, cuspSet, birthTimeKnown: false});
  const birthTimeFromForm: boolean = Math.random() > 0.5;
  // @ts-expect-error An unresolved boolean must be narrowed first.
  placeNatalBodiesInHouses({chart, cuspSet, birthTimeKnown: birthTimeFromForm});
  if (birthTimeFromForm === true) {
    placeNatalBodiesInHouses({chart, cuspSet, birthTimeKnown: birthTimeFromForm});
  }
  // @ts-expect-error A typed cusp context cannot be omitted.
  placeNatalBodiesInHouses({chart, birthTimeKnown: true});
  // @ts-expect-error A number is not an explicit UTC string.
  const badUtc: HouseCuspContextInput['cuspSet'] = {...cuspSet, metadata: {...cuspSet.metadata, datetimeUtc: 12345}};
  void badUtc;
  // @ts-expect-error Cusp provenance must include all three engine/kernel/time keys.
  const missingKernel: HouseCuspContextInput['cuspSet'] = {...cuspSet, metadata: {...cuspSet.metadata, ephemerisProvenance: {engineVersion: 'm', timeModel: 't'}}};
  void missingKernel;
  // @ts-expect-error The canonical profile cannot use an ambiguous legacy label.
  const badHouseSystem = {...cuspSet, calculationProfile: 'CANONICAL_V1' as const, houseSystem: 'egizia' as const} satisfies HouseCuspContextInput['cuspSet'];
  void badHouseSystem;
  // @ts-expect-error The natal result is readonly.
  chart.ephemerisProvenance.kernelSetId = 'other';
  // @ts-expect-error Placement output is readonly.
  placed.placements.Sun.house = 4;
  // @ts-expect-error The provider output is readonly.
  state.metadata.kernelSetId = 'other';
}
void consumer;
