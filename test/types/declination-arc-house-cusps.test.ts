import {calculateApcHouseCusps,calculateSunshineHouseCusps} from 'astrological-functions/declination-arc-houses';
import type {ApcHouseInput,SunshineHouseInput,DeclinationArcHouseCusps} from 'astrological-functions/declination-arc-houses';

const common:ApcHouseInput={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  angleModel:'TEST_IAU_ANGLES',source:{
    engineVersion:'TEST',kernelSetId:'SYNTHETIC',timeModel:'MOCK',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964},
  },
};
const sunshineInput:SunshineHouseInput={...common,sun:{
  datetimeUtc:common.datetimeUtc,declinationDeg:10,modelId:'TEST_APPARENT_SUN',
  bodyId:'SUN',frame:'EQUATORIAL_OF_DATE',center:'EARTH',
  corrections:'APPARENT',observerType:'GEOCENTRIC',
  source:{engineVersion:'TEST',kernelSetId:'SYNTHETIC',timeModel:'MOCK'},
}};
const a=calculateApcHouseCusps(common);
const s=calculateSunshineHouseCusps(sunshineInput);
const generic:DeclinationArcHouseCusps=a;
const aId:'APC'=a.houseSystem;
const sId:'SUNSHINE'=s.houseSystem;
const sunId:'SUN'=s.sun.bodyId;
const noSun:null=a.sun;
const cusps:readonly number[]=s.cuspsDeg;
void generic;void aId;void sId;void sunId;void noSun;void cusps;

// @ts-expect-error unknown birth time must not be accepted
calculateApcHouseCusps({...common,birthTimeKnown:false});
// @ts-expect-error Sunshine requires a pinned Sun declination
calculateSunshineHouseCusps(common);
// @ts-expect-error source frame must be ecliptic of date
calculateApcHouseCusps({...common,source:{...common.source,frame:'J2000'}});
// @ts-expect-error a geometric Sun longitude cannot replace an apparent Sun declination
calculateSunshineHouseCusps({...sunshineInput,sun:{...sunshineInput.sun,corrections:'GEOMETRIC'}});
