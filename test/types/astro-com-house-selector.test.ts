import { ASTRO_COM_HOUSE_METHODS, ASTRO_COM_HOUSE_SYSTEM_IDS,
  calculateAstroComHouseMethod } from 'astrological-functions/astro-com-house-selector';
import type { AstroComHouseMethodRequest, AstroComHouseMethodResult,
  AstroComHouseSystemId, AstroComHouseMethodDescriptor } from 'astrological-functions/astro-com-house-selector';
import type { PorphyryHouseInput } from 'astrological-functions/porphyry-houses';
import type { SunshineHouseInput } from 'astrological-functions/declination-arc-houses';
import type { GauquelinCommonInput } from 'astrological-functions/gauquelin-sectors';

const input: PorphyryHouseInput = {
  datetimeUtc: '2000-01-01T12:00:00Z',
  ascendantDeg: 155,
  midheavenDeg: 60,
  source: { engineVersion: 'TEST', kernelSetId: 'SYNTHETIC', timeModel: 'TEST',
    frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
    observer: { latitudeDeg: 40, longitudeDegEast: 12 } },
};
const sunInput: SunshineHouseInput = {
  ...input, birthTimeKnown: true, armcDeg: 60, trueObliquityDeg: 23.4,
  angleModel: 'SYNTHETIC', sun: { datetimeUtc: input.datetimeUtc, bodyId: 'SUN',
    declinationDeg: 0, modelId: 'TEST', frame: 'EQUATORIAL_OF_DATE',
    center: 'EARTH', corrections: 'APPARENT', observerType: 'GEOCENTRIC',
    source: { engineVersion: 'TEST', kernelSetId: 'SYNTHETIC', timeModel: 'TEST' } },
};
const gauquelinInput: GauquelinCommonInput = {
  ...input, birthTimeKnown: true, armcDeg: 60, trueObliquityDeg: 23.4,
  angleModel: 'SYNTHETIC',
};

const p: AstroComHouseMethodRequest = { houseSystem: 'PORPHYRY', input };
const s: AstroComHouseMethodRequest = { houseSystem: 'SUNSHINE', input: sunInput };
const g: AstroComHouseMethodRequest = { houseSystem: 'GAUQUELIN_36', input: gauquelinInput };
const output: AstroComHouseMethodResult = calculateAstroComHouseMethod(p);
const sunOutput = calculateAstroComHouseMethod(s);
const sectorOutput = calculateAstroComHouseMethod(g);

if (sectorOutput.houseSystem === 'GAUQUELIN_36') {
  const boundaries: readonly number[] = sectorOutput.sectorBoundariesDeg;
  const sectors: 36 = sectorOutput.sectorCount;
  void [boundaries, sectors];
  // @ts-expect-error Gauquelin does not provide conventional twelve cusps
  sectorOutput.cuspsDeg;
}
if (sunOutput.houseSystem === 'SUNSHINE') {
  const solarId: 'SUN' = sunOutput.sun.bodyId;
  void solarId;
}
const ids: readonly AstroComHouseSystemId[] = ASTRO_COM_HOUSE_SYSTEM_IDS;
const descriptors: readonly AstroComHouseMethodDescriptor[] = ASTRO_COM_HOUSE_METHODS;
void [output, ids, descriptors];

// @ts-expect-error Default (Placidus) is a UI alias, never a canonical ID
calculateAstroComHouseMethod({ houseSystem: 'Default (Placidus)', input });
// @ts-expect-error Sunshine must have an externally pinned Sun declination
calculateAstroComHouseMethod({ houseSystem: 'SUNSHINE', input });
// @ts-expect-error Gauquelin requires ARMC, obliquity, angle model and known birth time
calculateAstroComHouseMethod({ houseSystem: 'GAUQUELIN_36', input });
// @ts-expect-error Porphyry needs ASC/MC, not an invented longitude basis
calculateAstroComHouseMethod({ houseSystem: 'PORPHYRY', input: { datetimeUtc: input.datetimeUtc } });
// @ts-expect-error Every request must explicitly name the method
calculateAstroComHouseMethod({ input });
// @ts-expect-error no mutating the exported immutable list
ASTRO_COM_HOUSE_SYSTEM_IDS.push('PLACIDUS');
