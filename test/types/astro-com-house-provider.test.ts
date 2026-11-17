import {calculateAstroComHouseFromProvider} from 'astrological-functions/astro-com-house-provider';
import type {AstroComHouseAngleProvider, AstroComHouseProviderRequest,
  AstroComProviderHouseResult} from 'astrological-functions/astro-com-house-provider';

const provider: AstroComHouseAngleProvider = {
  async calculateHouseAngles(input) {
    return {...input, engineVersion: 'RUST_TEST', kernelSetId: 'SYNTHETIC',
      timeModel: 'MOCK_UT1_TT', model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
      armcDeg: 60, ascendantDeg: 150, midheavenDeg: 65, trueObliquityDeg: 23.44};
  },
};
const common = {
  datetimeUtc: '2000-01-01T12:00:00Z', birthTimeKnown: true,
  ut1JulianDay: 2451545, ttJulianDay: 2451545.0008,
  latitudeDeg: 40, longitudeDegEast: 12,
  expectedProvider: {engineVersion: 'RUST_TEST', kernelSetId: 'SYNTHETIC',
    timeModel: 'MOCK_UT1_TT'},
} as const;
const ordinary: AstroComHouseProviderRequest = {...common, houseSystem: 'PORPHYRY'};
const sun: AstroComHouseProviderRequest = {...common, houseSystem: 'SUNSHINE',
  sun: {datetimeUtc: common.datetimeUtc, bodyId: 'SUN', declinationDeg: 0,
    modelId: 'MOCK_DECLINATION', frame: 'EQUATORIAL_OF_DATE',
    center: 'EARTH', observerType: 'GEOCENTRIC', corrections: 'APPARENT',
    source: common.expectedProvider}};
const p: Promise<Readonly<AstroComProviderHouseResult>> =
  calculateAstroComHouseFromProvider(ordinary, provider);
const s = calculateAstroComHouseFromProvider(sun, provider);
void [p, s];

async function readResult() {
  const output = await calculateAstroComHouseFromProvider(ordinary, provider);
  const engineVersion: string = output.angleSource.engineVersion;
  const systemId: string = output.result.houseSystem;
  void [engineVersion, systemId];
  if (output.result.houseSystem === 'GAUQUELIN_36') {
    const sectorCount: 36 = output.result.sectorCount;
    void sectorCount;
    // @ts-expect-error sector boundaries are never twelve-house cusps
    output.result.cuspsDeg;
  }
}
void readResult;

// @ts-expect-error Sunshine requires an independently sourced Sun declination
calculateAstroComHouseFromProvider({...common, houseSystem: 'SUNSHINE'}, provider);
// @ts-expect-error other methods do not accept a solar declination object
calculateAstroComHouseFromProvider({...common, houseSystem: 'PORPHYRY', sun: {}}, provider);
// @ts-expect-error the birth time must be known for provider-supplied angles
calculateAstroComHouseFromProvider({...common, birthTimeKnown: false, houseSystem: 'PLACIDUS'}, provider);
// @ts-expect-error no hidden default house method
calculateAstroComHouseFromProvider(common, provider);
const invalidProvider: AstroComHouseAngleProvider = {calculateHouseAngles: input =>
  ({...input, engineVersion: 'TEST', kernelSetId: 'TEST', timeModel: 'TEST',
    // @ts-expect-error no unvalidated mean/J2000 model accepted as true-of-date
    model: 'MEAN_J2000_GEOMETRIC', armcDeg: 0, ascendantDeg: 0,
    midheavenDeg: 0, trueObliquityDeg: 23.4})};
void invalidProvider;
