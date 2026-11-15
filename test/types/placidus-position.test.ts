import {calculatePlacidusHousePosition, type PlacidusPositionInput} from 'astrological-functions/placidus-position';
const input:PlacidusPositionInput={armcDeg:0,latitudeDeg:0,trueObliquityDeg:23.4,eclipticLongitudeDeg:0,eclipticLatitudeDeg:0,frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',birthTimeKnown:true,datetimeUtc:'2026-11-10T00:00:00Z',source:{engineVersion:'example',kernelSetId:'example',timeModel:'explicit',corrections:'example',center:'EARTH',observerLongitudeDegEast:0}};
const house:number=calculatePlacidusHousePosition(input).house;
void house;
// @ts-expect-error a birth time must be known
calculatePlacidusHousePosition({...input,birthTimeKnown:false});
// @ts-expect-error coordinates must use the specified frame
calculatePlacidusHousePosition({...input,frame:'J2000'});
