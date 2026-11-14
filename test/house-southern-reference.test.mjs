import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePlacidusHouseCusps} from 'astrological-functions/placidus-houses';
import {calculateRegiomontanusHouseCusps} from 'astrological-functions/regiomontanus-houses';
import {calculateKochHouseCusps} from 'astrological-functions/koch-houses';

test('southern hemisphere and wrapped cusps match recorded Swiss outputs',()=>{
  const input={datetimeUtc:'2000-01-01T12:00:00Z',birthTimeKnown:true,ascendantDeg:190.45080395494955,midheavenDeg:95.00922013119327,armcDeg:95.45707243802599,trueObliquityDeg:23.43767671605485,source:{engineVersion:'fixture',kernelSetId:'fixture',timeModel:'fixture',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',observer:{latitudeDeg:-45,longitudeDegEast:175}}};
  const cases=[
    [calculatePlacidusHouseCusps,[190.45080395494955,230.42258227281832,254.93602256227965,275.0092201311933,295.9589819082523,323.82034586580403,10.45080395494955,50.42258227281832,74.93602256227962,95.00922013119327,115.95898190825234,143.82034586580403]],
    [calculateRegiomontanusHouseCusps,[190.45080395494955,235.21953662403655,258.6720233483982,275.0092201311933,292.25688479474707,319.7197295155648,10.45080395494955,55.21953662403655,78.67202334839823,95.00922013119327,112.25688479474707,139.71972951556478]],
    [calculateKochHouseCusps,[190.45080395494955,227.1489665198299,254.22877645188007,275.0092201311933,298.4735466095455,330.3127963985839,10.45080395494955,47.14896651982991,74.2287764518801,95.00922013119327,118.4735466095455,150.31279639858388]],
  ];
  for(const [fn,expected] of cases){const actual=fn(input).cuspsDeg;for(let i=0;i<12;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-6,`${fn.name} cusp ${i+1}`);}
});
