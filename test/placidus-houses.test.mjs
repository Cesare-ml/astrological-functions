import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePlacidusHouseCusps as calculate} from 'astrological-functions/placidus-houses';
import {locateLongitudeInHouses} from '../src/index.mjs';

const input = {
  datetimeUtc:'2026-11-10T00:00:00Z', birthTimeKnown:true,
  ascendantDeg:157.82641479007887, midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181, trueObliquityDeg:23.437859777570328,
  source:{engineVersion:'fixture',kernelSetId:'fixture',timeModel:'fixture',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}},
};

test('Rome cusps match a recorded Swiss 0.5.17 reference for the same angles', () => {
  const expected = [157.82641479007887,181.44261492684427,210.24255445458292,243.6782674613323,278.4472921395664,310.2873937919507,337.82641479007884,1.4426149268442714,30.242554454582887,63.6782674613323,98.4472921395664,130.2873937919507];
  const result=calculate(input);
  for (let i=0;i<12;i++) {
    assert.ok(Math.abs(result.cuspsDeg[i]-expected[i]) < 1e-6, `cusp ${i+1}`);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i], result.cuspsDeg).house, i+1);
  }
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.equal(result.validation,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
});

test('invalid birth times, incompatible angles and polar cases fail explicitly', () => {
  assert.throws(()=>calculate({...input,birthTimeKnown:false}), e=>e.code==='BIRTH_TIME_REQUIRED');
  assert.throws(()=>calculate({...input,armcDeg:input.armcDeg+1}), e=>e.code==='INCONSISTENT_ANGLES');
  assert.throws(()=>calculate({...input,source:{...input.source,observer:{latitudeDeg:70,longitudeDegEast:12.4964}}}), e=>e.code==='POLAR_HOUSES_UNAVAILABLE');
  assert.throws(()=>calculate({...input,trueObliquityDeg:NaN}), e=>e.code==='INVALID_ANGLES');
});
