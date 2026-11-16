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

test('rejects invalid UTC, observer site and source identifiers before provider I/O',()=>{
  let calls=0;
  const counting={calculateHouseAngles(args){calls++;return provider.calculateHouseAngles(args);}};
  const invalidCases=[
    [{datetimeUtc:'2026-13-99T00:00:00Z'},'INVALID_UTC'],
    [{datetimeUtc:'2026-02-30T00:00:00Z'},'INVALID_UTC'],
    [{latitudeDeg:95},'INVALID_INPUT'],
    [{latitudeDeg:90},'INVALID_INPUT'],
    [{longitudeDegEast:190},'INVALID_INPUT'],
    [{longitudeDegEast:-181},'INVALID_INPUT'],
    [{engineVersion:''},'INVALID_INPUT'],
    [{kernelSetId:' '},'INVALID_INPUT'],
    [{timeModel:null},'INVALID_INPUT'],
    [{ut1JulianDay:NaN},'INVALID_INPUT'],
  ];
  for(const [patch,code] of invalidCases){
    assert.throws(()=>calculateHouseSet({...input,...patch},counting),e=>e.code===code);
  }
  assert.equal(calls,0);
});

test('valid request calls the angle provider exactly once',()=>{
  let calls=0;
  const counting={calculateHouseAngles(args){calls++;return provider.calculateHouseAngles(args);}};
  const result=calculateHouseSet(input,counting);
  assert.equal(calls,1);
  assert.deepEqual(Object.keys(result.houses),['vehlow','porphyry','placidus','regiomontanus','koch']);
});

