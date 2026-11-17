import {calculateAlbategniusHouseCusps} from '../../src/albategnius-house-cusps.mjs';
import type {AlbategniusHouseInput} from '../../src/albategnius-house-cusps.mjs';

const input:AlbategniusHouseInput={
  datetimeUtc:'2000-01-01T12:00:00Z',birthTimeKnown:true,
  armcDeg:0,trueObliquityDeg:23.4,ascendantDeg:100,midheavenDeg:0,
  angleModel:'TEST_V1',source:{engineVersion:'TEST_V1',kernelSetId:'K1',timeModel:'T1',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:40,longitudeDegEast:12}},
};
const result=calculateAlbategniusHouseCusps(input);
const n:number|undefined=result.cuspsDeg[0];
const p:number|undefined=result.primeVerticalDivisionAnglesDeg[1];
const id:'ALBATEGNIUS'=result.houseSystem;
void [n,p,id];
// @ts-expect-error - birth time must be known
calculateAlbategniusHouseCusps({...input,birthTimeKnown:false});
// @ts-expect-error - physical obliquity is numeric
calculateAlbategniusHouseCusps({...input,trueObliquityDeg:'23'});
// @ts-expect-error - result cannot be mutated
result.cuspsDeg[0]=10;
