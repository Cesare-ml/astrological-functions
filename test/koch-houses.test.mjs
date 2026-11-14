import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateKochHouseCusps as calculate} from 'astrological-functions/koch-houses';
import {locateLongitudeInHouses} from '../src/index.mjs';

const input={datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,source:{engineVersion:'fixture',kernelSetId:'fixture',timeModel:'fixture',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}}};
test('Rome Koch cusps match recorded Swiss angles',()=>{
  const expected=[157.82641479007887,186.54376761189948,215.123984745939,243.6782674613323,279.9128619529185,309.4022174200898,337.82641479007884,6.543767611899511,35.12398474593897,63.6782674613323,99.91286195291849,129.4022174200898];
  const result=calculate(input);
  for(let i=0;i<12;i++){
    assert.ok(Math.abs(result.cuspsDeg[i]-expected[i])<1e-8, `cusp ${i+1}`);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
  }
  assert.ok(Object.isFrozen(result.cuspsDeg));
});
test('rejects missing birth time and inconsistent angles',()=>{
  assert.throws(()=>calculate({...input,birthTimeKnown:false}),e=>e.code==='BIRTH_TIME_REQUIRED');
  assert.throws(()=>calculate({...input,armcDeg:input.armcDeg+1}),e=>e.code==='INCONSISTENT_ANGLES');
});
