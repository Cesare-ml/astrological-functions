import {calculatePorphyryHouseCusps} from 'astrological-functions/porphyry-houses';
import {calculatePlacidusHouseCusps} from 'astrological-functions/placidus-houses';
import {calculateKochHouseCusps} from 'astrological-functions/koch-houses';
import {calculateRegiomontanusHouseCusps} from 'astrological-functions/regiomontanus-houses';

const input = {epochUt1JulianDay: 1_721_060, birthTimeKnown: true as const,
  ascendantDeg: 157, midheavenDeg: 63, armcDeg: 61, trueObliquityDeg: 23.4,
  source: {engineVersion: 'test', kernelSetId: 'test', timeModel: 'test',
    frame: 'ECLIPTIC_OF_DATE' as const, zodiac: 'TROPICAL' as const,
    observerType: 'TOPOCENTRIC' as const, observer: {latitudeDeg: 41, longitudeDegEast: 12}}};
for (const result of [calculatePorphyryHouseCusps(input), calculatePlacidusHouseCusps(input),
  calculateKochHouseCusps(input), calculateRegiomontanusHouseCusps(input)]) {
  const epoch: number = result.epochUt1JulianDay;
  // @ts-expect-error historical results must not claim a UTC datetime
  result.datetimeUtc;
  void epoch;
}
// @ts-expect-error UT1 and UTC cannot both describe the same request
calculatePlacidusHouseCusps({...input, datetimeUtc: '2000-01-01T12:00:00Z'});
