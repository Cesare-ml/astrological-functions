import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHouseSet} from 'astrological-functions/house-set';

const input={datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,ut1JulianDay:2461354.5,ttJulianDay:2461354.5008,latitudeDeg:41.9028,longitudeDegEast:12.4964,engineVersion:'fixture',kernelSetId:'fixture',timeModel:'explicit-UT1'};
const provider={calculateHouseAngles(args){return {...args,model:'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',armcDeg:61.66688244516181,ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,trueObliquityDeg:23.437859777570328};}};
test('one provider result composes all five requested systems',()=>{
  const result=calculateHouseSet(input,provider);
  assert.deepEqual(Object.keys(result.houses),['vehlow','porphyry','placidus','regiomontanus','koch']);
  for(const house of Object.values(result.houses)) assert.equal(house.cuspsDeg.length,12);
  assert.equal(result.houses.vehlow.source.corrections,'IAU2006_2000B_APPROXIMATE');
  assert.ok(Object.isFrozen(result.houses));
});
test('rejects unknown birth time or mismatched provider metadata',()=>{
  assert.throws(()=>calculateHouseSet({...input,birthTimeKnown:false},provider),e=>e.code==='BIRTH_TIME_REQUIRED');
  assert.throws(()=>calculateHouseSet(input,{calculateHouseAngles(a){return {...provider.calculateHouseAngles(a),ut1JulianDay:a.ut1JulianDay+1};}}),e=>e.code==='INCOMPATIBLE_ANGLE_SOURCE');
});
