import { calculateVehlowHouseCusps, type VehlowHouseInput, type VehlowHouseCusps } from '../../src/vehlow-houses.mjs';

const input: VehlowHouseInput = {
  profile: 'VEHLOW_ASC_CENTERED_V1',
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T22:30:00Z',
  ascendantDeg: 10,
  source: {
    engineVersion:'synthetic',kernelSetId:'synthetic-kernel',timeModel:'synthetic-time',
    center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',zodiac:'TROPICAL',
    observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  },
};
const output: VehlowHouseCusps = calculateVehlowHouseCusps(input);
void output;
// @ts-expect-error no implicit egizia compatibility profile
calculateVehlowHouseCusps({...input,profile:'egizia'});
// @ts-expect-error unknown birth time forbids houses
calculateVehlowHouseCusps({...input,birthTimeKnown:false});
// @ts-expect-error no sidereal provider accepted without an explicit conversion method
calculateVehlowHouseCusps({...input,source:{...input.source,zodiac:'SIDEREAL'}});
// @ts-expect-error missing source must not be silently defaulted
calculateVehlowHouseCusps({profile:'VEHLOW_ASC_CENTERED_V1',birthTimeKnown:true,datetimeUtc:'2026-11-12T22:30:00Z',ascendantDeg:10});
// @ts-expect-error resulting cusp array is immutable
output.cuspsDeg[0]=5;
