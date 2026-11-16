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

test('rejects invalid UTC, site and source metadata before provider invocation',()=>{
  const invalidCases=[
    [{datetimeUtc:'2026-02-30T00:00:00Z'},'INVALID_UTC'],
    [{datetimeUtc:'0000-01-01T00:00:00Z'},'INVALID_UTC'],
    [{latitudeDeg:90},'INVALID_COORDINATES'],
    [{latitudeDeg:-90},'INVALID_COORDINATES'],
    [{latitudeDeg:95},'INVALID_COORDINATES'],
    [{longitudeDegEast:180.01},'INVALID_COORDINATES'],
    [{longitudeDegEast:-180.01},'INVALID_COORDINATES'],
    [{engineVersion:''},'INVALID_HOUSE_METADATA'],
    [{kernelSetId:' '},'INVALID_HOUSE_METADATA'],
    [{timeModel:undefined},'INVALID_HOUSE_METADATA'],
    [{ut1JulianDay:Infinity},'INVALID_INPUT'],
    [{ttJulianDay:NaN},'INVALID_INPUT'],
  ];
  for(const [patch,code] of invalidCases){
    let calls=0;
    const counting={calculateHouseAngles(args){calls++;return provider.calculateHouseAngles(args);}};
    assert.throws(()=>calculateHouseSet({...input,...patch},counting),e=>e.code===code);
    assert.equal(calls,0,JSON.stringify(patch)+' must fail before provider I/O');
  }
});

test('rejects accessor-backed input and provider methods before executing them',()=>{
  let inputGetterCalls=0,providerGetterCalls=0,providerCalls=0;
  const accessorInput={...input};
  Object.defineProperty(accessorInput,'latitudeDeg',{enumerable:true,get(){inputGetterCalls++;return input.latitudeDeg;}});
  assert.throws(()=>calculateHouseSet(accessorInput,{calculateHouseAngles(){providerCalls++;return provider.calculateHouseAngles(arguments[0]);}}),
    e=>e.code==='INVALID_INPUT');
  const accessorProvider={};
  Object.defineProperty(accessorProvider,'calculateHouseAngles',{get(){providerGetterCalls++;return provider.calculateHouseAngles;}});
  assert.throws(()=>calculateHouseSet(input,accessorProvider),e=>e.code==='INVALID_INPUT');
  assert.equal(inputGetterCalls,0);
  assert.equal(providerGetterCalls,0);
  assert.equal(providerCalls,0);
});

test('valid requests still invoke the pinned provider exactly once',()=>{
  let calls=0;
  const counting={calculateHouseAngles(args){calls++;return provider.calculateHouseAngles(args);}};
  const result=calculateHouseSet(input,counting);
  assert.equal(calls,1);
  assert.equal(result.contract,'ExperimentalHouseSet');
});

test('rejects accessor-backed provider angle results without invoking their getters',()=>{
  let getterCalls=0,providerCalls=0;
  const accessorResult={...provider.calculateHouseAngles({
    ut1JulianDay:input.ut1JulianDay,ttJulianDay:input.ttJulianDay,
    latitudeDeg:input.latitudeDeg,longitudeDegEast:input.longitudeDegEast,
  })};
  Object.defineProperty(accessorResult,'ascendantDeg',{
    enumerable:true,get(){getterCalls++;return 157.82641479007887;},
  });
  const counting={calculateHouseAngles(args){providerCalls++;return accessorResult;}};
  assert.throws(()=>calculateHouseSet(input,counting),e=>e.code==='INVALID_ANGLE_SOURCE');
  assert.equal(providerCalls,1);
  assert.equal(getterCalls,0);
});
