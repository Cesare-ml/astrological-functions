import {
  calculateCampanusHouseCusps,
  calculateAlcabitiusHouseCusps,
  calculatePolichPageHouseCusps,
} from 'astrological-functions/diurnal-houses';
import type {DiurnalHouseInput, DiurnalHouseCusps} from 'astrological-functions/diurnal-houses';

const fixture:DiurnalHouseInput={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'IAU_TEST_1',
  source:{
    engineVersion:'TEST',kernelSetId:'SYNTHETIC',timeModel:'MOCK',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964},
  },
};
const campanus=calculateCampanusHouseCusps(fixture);
const alcabitius=calculateAlcabitiusHouseCusps(fixture);
const polichPage=calculatePolichPageHouseCusps(fixture);
const any:DiurnalHouseCusps=campanus;
const c:'CAMPANUS'=campanus.houseSystem;
const a:'ALCABITIUS'=alcabitius.houseSystem;
const p:'POLICH_PAGE'=polichPage.houseSystem;
const longitudes:readonly number[]=polichPage.cuspsDeg;
void any;void c;void a;void p;void longitudes;

// @ts-expect-error unknown birth time is not supported
calculateCampanusHouseCusps({...fixture,birthTimeKnown:false});
// @ts-expect-error an ephemeris location is required
calculateAlcabitiusHouseCusps({...fixture,source:undefined});
// @ts-expect-error cannot treat J2000 as the injected of-date frame
calculatePolichPageHouseCusps({...fixture,source:{...fixture.source,frame:'J2000'}});
// @ts-expect-error ARMC cannot be omitted
calculateCampanusHouseCusps({datetimeUtc:fixture.datetimeUtc,source:fixture.source});
