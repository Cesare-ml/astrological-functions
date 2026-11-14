import { calculatePlacidusHouseCusps, type PlacidusHouseInput } from 'astrological-functions/placidus-houses';
import { calculateKochHouseCusps } from 'astrological-functions/koch-houses';
import { calculateRegiomontanusHouseCusps } from 'astrological-functions/regiomontanus-houses';
const input: PlacidusHouseInput = {
  datetimeUtc:'2026-11-10T00:00:00Z', birthTimeKnown:true,
  ascendantDeg:157, midheavenDeg:63, armcDeg:61, trueObliquityDeg:23.4,
  source:{engineVersion:'test',kernelSetId:'test',timeModel:'test',frame:'ECLIPTIC_OF_DATE',
    zodiac:'TROPICAL',observerType:'TOPOCENTRIC',observer:{latitudeDeg:41,longitudeDegEast:12}},
};
const result = calculatePlacidusHouseCusps(input);
const koch: 'KOCH' = calculateKochHouseCusps(input).houseSystem;
const regio: 'REGIOMONTANUS' = calculateRegiomontanusHouseCusps(input).houseSystem;
void [koch, regio];
// @ts-expect-error cusp array is readonly
result.cuspsDeg[0] = 1;
// @ts-expect-error unknown birth time does not permit house calculation
calculatePlacidusHouseCusps({...input, birthTimeKnown:false});
// @ts-expect-error sidereal conversion needs its own explicit model
calculatePlacidusHouseCusps({...input, source:{...input.source,zodiac:'SIDEREAL'}});
