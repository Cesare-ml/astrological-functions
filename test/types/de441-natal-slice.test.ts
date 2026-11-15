import {calculateExperimentalNatalSlice, type ExperimentalNatalSliceInput, type ExperimentalDe441Provider} from 'astrological-functions/de441-natal-slice';
declare const provider:ExperimentalDe441Provider;
const input:ExperimentalNatalSliceInput={datetimeUtc:'2026-11-10T00:00:00Z',ut1JulianDay:2461354.5,latitudeDeg:41.9,longitudeDegEast:12.5,birthTimeKnown:true,zodiac:'TROPICAL',requestedTargets:['Sun','MarsBarycenter'],engineVersion:'example',kernelSetId:'example',timeModel:'explicit'};
const house:number=calculateExperimentalNatalSlice(input,provider).bodies[0].placidusPosition.house;
void house;
// @ts-expect-error Chiron is not in the DE441 batch
calculateExperimentalNatalSlice({...input,requestedTargets:['Chiron']},provider);
