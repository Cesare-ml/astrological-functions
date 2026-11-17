import {
  calculateMeridianHouseCusps,
  calculateMorinusHouseCusps,
  calculateCarterPoliEquatorialHouseCusps,
} from 'astrological-functions/axial-houses';
import type {MeridianHouseInput, MorinusHouseInput, CarterPoliEquatorialHouseInput} from 'astrological-functions/axial-houses';

const shared={
  datetimeUtc:'2026-11-17T12:34:56Z', birthTimeKnown:true as const,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'SYNTHETIC_1',
  source:{
    engineVersion:'TEST',kernelSetId:'SYNTHETIC',timeModel:'MOCK',
    frame:'ECLIPTIC_OF_DATE' as const,zodiac:'TROPICAL' as const,
    observerType:'TOPOCENTRIC' as const,
    observer:{latitudeDeg:44,longitudeDegEast:11},
  },
};
const meridianInput:MeridianHouseInput={...shared,midheavenDeg:63.6782674613323};
const morinusInput:MorinusHouseInput=shared;
const carterInput:CarterPoliEquatorialHouseInput={...shared,ascendantDeg:157.82641479007887};
const meridian=calculateMeridianHouseCusps(meridianInput);
const morinus=calculateMorinusHouseCusps(morinusInput);
const carter=calculateCarterPoliEquatorialHouseCusps(carterInput);
const values:readonly number[]=meridian.cuspsDeg;
const exactM:'MERIDIAN'=meridian.houseSystem;
const exactC:'CARTER_POLI_EQUATORIAL'=carter.houseSystem;
const exactO:'MORINUS'=morinus.houseSystem;
void values;void exactM;void exactC;void exactO;

// @ts-expect-error an absent MC is not a valid Meridian input
calculateMeridianHouseCusps(shared);
// @ts-expect-error an absent ASC is not a valid Carter input
calculateCarterPoliEquatorialHouseCusps(shared);
// @ts-expect-error unknown birth time is not supported
calculateMorinusHouseCusps({...shared,birthTimeKnown:false});
// @ts-expect-error wrong coordinate frame cannot pass as a pinned provider
calculateMeridianHouseCusps({...shared,midheavenDeg:63,source:{...shared.source,frame:'J2000'}});
// @ts-expect-error numeric status cannot replace an angle model identifier
calculateMorinusHouseCusps({...shared,angleModel:42});
