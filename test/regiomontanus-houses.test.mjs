import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRegiomontanusHouseCusps as calculate} from 'astrological-functions/regiomontanus-houses';
import {locateLongitudeInHouses} from '../src/index.mjs';

const input = {
  datetimeUtc:'2026-11-10T00:00:00Z', birthTimeKnown:true,
  ascendantDeg:157.82641479007887, midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181, trueObliquityDeg:23.437859777570328,
  source:{engineVersion:'fixture',kernelSetId:'fixture',timeModel:'fixture',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}},
};
test('Rome Regiomontanus cusps match recorded Swiss angles', () => {
  const expected=[157.82641479007887,181.35893637792677,208.68853961547603,243.6782674613323,281.5980511853633,312.89499892642857,337.82641479007884,1.3589363779267387,28.68853961547603,63.6782674613323,101.5980511853633,132.89499892642857];
  const result=calculate(input);
  for(let i=0;i<12;i++) {
    assert.ok(Math.abs(result.cuspsDeg[i]-expected[i])<1e-8, `cusp ${i+1}`);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
  }
  assert.ok(Object.isFrozen(result.cuspsDeg));
});
test('rejects missing time, inconsistent inputs, and invalid obliquity',()=>{
  assert.throws(()=>calculate({...input,birthTimeKnown:false}),e=>e.code==='BIRTH_TIME_REQUIRED');
  assert.throws(()=>calculate({...input,armcDeg:input.armcDeg+1}),e=>e.code==='INCONSISTENT_ANGLES');
  assert.throws(()=>calculate({...input,trueObliquityDeg:NaN}),e=>e.code==='INVALID_ANGLES');
});
