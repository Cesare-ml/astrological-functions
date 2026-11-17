import {
  calculatePullenSinusoidalDeltaHouseCusps,
  calculatePullenSinusoidalRatioHouseCusps,
} from '../../src/pullen-house-cusps.mjs';

const input = {
  birthTimeKnown: true as const,
  datetimeUtc: '2026-11-17T12:34:56Z',
  ascendantDeg: 10,
  midheavenDeg: 285,
  source: {
    engineVersion:'TEST', kernelSetId:'SYNTHETIC', timeModel:'MOCK',
    frame:'ECLIPTIC_OF_DATE' as const, zodiac:'TROPICAL' as const,
    observerType:'TOPOCENTRIC' as const,
    observer:{latitudeDeg:44,longitudeDegEast:11},
  },
};
const sd=calculatePullenSinusoidalDeltaHouseCusps(input);
const sr=calculatePullenSinusoidalRatioHouseCusps(input);
const total: number = sd.cuspsDeg[0]+sr.widthsDeg[0];
void total;
const exact: 'PULLEN_SD' = sd.houseSystem;
void exact;

// @ts-expect-error unknown birth time must not have a valid declaration contract
calculatePullenSinusoidalRatioHouseCusps({...input,birthTimeKnown:false});
// @ts-expect-error unknown coordinate frame cannot be silently accepted
calculatePullenSinusoidalDeltaHouseCusps({...input,source:{...input.source,frame:'J2000'}});
