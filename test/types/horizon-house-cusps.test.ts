import {
  calculateKrusinskiPisaGoelzerHouseCusps,
  calculateAzimuthHouseCusps,
} from 'astrological-functions/horizon-houses';
import type {HorizonHouseInput,HorizonHouseCusps} from 'astrological-functions/horizon-houses';

const input:HorizonHouseInput={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'TEST_IAU_ANGLES',source:{
    engineVersion:'TEST',kernelSetId:'SYNTHETIC',timeModel:'MOCK',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964},
  },
};
const k=calculateKrusinskiPisaGoelzerHouseCusps(input);
const az=calculateAzimuthHouseCusps(input);
const any:HorizonHouseCusps=k;
const methodK:'KRUSINSKI_PISA_GOELZER'=k.houseSystem;
const methodA:'AZIMUTH'=az.houseSystem;
const ascAnchor:'ASCENDANT'=k.cusp1Anchor;
const eastAnchor:'ANTIVERTEX_EAST_DIRECTION'=az.cusp1Anchor;
const cusps:readonly number[]=az.cuspsDeg;
void any;void methodK;void methodA;void ascAnchor;void eastAnchor;void cusps;

// @ts-expect-error unknown birth time is not supported
calculateKrusinskiPisaGoelzerHouseCusps({...input,birthTimeKnown:false});
// @ts-expect-error the source cannot be omitted
calculateAzimuthHouseCusps({...input,source:undefined});
// @ts-expect-error cannot accept geometric J2000 as ecliptic-of-date
calculateKrusinskiPisaGoelzerHouseCusps({...input,source:{...input.source,frame:'J2000'}});
// @ts-expect-error the ARMC must be supplied by the upstream angle provider
calculateAzimuthHouseCusps({datetimeUtc:input.datetimeUtc,source:input.source});
