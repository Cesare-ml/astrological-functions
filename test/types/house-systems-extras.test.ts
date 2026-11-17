import {
  calculateEqualMidheavenHouseCusps,
  calculateWholeAriesHouseCusps,
  calculateSripatiHouseCusps,
} from '../../src/house-systems-extras.mjs';

const mc = calculateEqualMidheavenHouseCusps({
  midheavenLongitudeDeg: 100,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-17T12:00:00Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: {type: 'TROPICAL'},
});
const aries = calculateWholeAriesHouseCusps({
  datetimeUtc: '2026-11-17T12:00:00Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: {type: 'SIDEREAL', ayanamsaId: 'TEST'},
});
const sripati = calculateSripatiHouseCusps({
  datetimeUtc: '2026-11-17T12:00:00Z',
  ascendantDeg: 100,
  midheavenDeg: 10,
  source: {
    engineVersion: 'TEST', kernelSetId: 'TEST', timeModel: 'TEST',
    frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
    observer: {latitudeDeg: 44, longitudeDegEast: 11},
  },
});
const cusp: number = mc.cuspsDeg[9] + aries.cuspsDeg[0] + sripati.cuspsDeg[0];
void cusp;

// @ts-expect-error equal-MC houses cannot be requested with unknown birth time
calculateEqualMidheavenHouseCusps({midheavenLongitudeDeg: 100, birthTimeKnown: false, datetimeUtc:'2026-11-17T12:00:00Z', frame:'ECLIPTIC_OF_DATE', longitudeBasis:{type:'TROPICAL'}});
// @ts-expect-error unknown zodiac is not a supported basis
calculateWholeAriesHouseCusps({datetimeUtc:'2026-11-17T12:00:00Z', frame:'ECLIPTIC_OF_DATE', longitudeBasis:{type:'UNDEFINED'}});
