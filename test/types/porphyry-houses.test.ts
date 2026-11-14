import {calculatePorphyryHouseCusps, type PorphyryHouseInput, type PorphyryHouseCusps} from '../../src/porphyry-houses.mjs';
const input: PorphyryHouseInput = {
  datetimeUtc:'2026-11-12T20:30:00Z',ascendantDeg:10,midheavenDeg:285,
  source: {engineVersion:'synthetic',kernelSetId:'test',timeModel:'synthetic',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:44,longitudeDegEast:11}},
};
const result: PorphyryHouseCusps = calculatePorphyryHouseCusps(input);
void result;
// @ts-expect-error sidereal version requires a separate documented projection
calculatePorphyryHouseCusps({...input,source:{...input.source,zodiac:'SIDEREAL'}});
// @ts-expect-error no ephemeris source is not a valid call
calculatePorphyryHouseCusps({datetimeUtc:'2026-11-12T20:30:00Z',ascendantDeg:10,midheavenDeg:285});
// @ts-expect-error output house array is immutable
result.cuspsDeg[0]=10;
// @ts-expect-error frame is a pinned literal
result.source.frame='J2000';
