import {calculatePlacidusHousePosition, type PlacidusPositionInput} from 'astrological-functions/placidus-position';
const input:PlacidusPositionInput={armcDeg:0,latitudeDeg:0,trueObliquityDeg:23.4,eclipticLongitudeDeg:0,eclipticLatitudeDeg:0,frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',birthTimeKnown:true};
const house:number=calculatePlacidusHousePosition(input).house;
void house;
// @ts-expect-error a birth time must be known
calculatePlacidusHousePosition({...input,birthTimeKnown:false});
// @ts-expect-error coordinates must use the specified frame
calculatePlacidusHousePosition({...input,frame:'J2000'});
