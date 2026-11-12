import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNatalBodiesInHouses } from '../src/index.mjs';

const provenance = {engineVersion:'rust-mock',kernelSetId:'synthetic',timeModel:'TDB-mock'};
const chart = {
  datetimeUtc:'2026-11-11T04:00:00Z',latitudeDeg:44,longitudeDegEast:12,
  ephemerisProvenance:provenance,
  bodies:Object.freeze(Object.assign(Object.create(null), {
    Sun:Object.freeze({name:'Sun',longitudeDeg:345}),
    Moon:Object.freeze({name:'Moon',longitudeDeg:15}),
    Mars:Object.freeze({name:'Mars',longitudeDeg:344.9})
  }))
};
const cuspSet = {
  houseSystem:'VEHLOW',calculationProfile:'CANONICAL_V1',
  cusps:[345,15,45,75,105,135,165,195,225,255,285,315],
  metadata:{
    houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL',
    datetimeUtc:chart.datetimeUtc,latitudeDeg:44,longitudeDegEast:12,
    ephemerisProvenance:{...provenance}
  }
};
test('assigns cusp boundaries and wrap-around without modifying chart',()=>{
  const result=placeNatalBodiesInHouses({chart,cuspSet,birthTimeKnown:true});
  assert.equal(result.placements.Sun.house,1);
  assert.equal(result.placements.Moon.house,2);
  assert.equal(result.placements.Mars.house,12);
  assert.equal(Object.getPrototypeOf(result.placements),null);
  assert.equal(Object.isFrozen(result.placements),true);
  assert.equal(chart.houses,undefined);
});
test('birth time must be explicitly known before any placement',()=>{
  for(const flag of [undefined,false,null,1])
    assert.throws(()=>placeNatalBodiesInHouses({chart,cuspSet,birthTimeKnown:flag}),
      e=>e.code==='BIRTH_TIME_REQUIRED');
});
test('mismatched external cusp provenance fails closed',()=>{
  assert.throws(()=>placeNatalBodiesInHouses({chart,birthTimeKnown:true,
    cuspSet:{...cuspSet,metadata:{...cuspSet.metadata,
      ephemerisProvenance:{...provenance,kernelSetId:'different'}}}}),
    e=>e.code==='INCOMPATIBLE_HOUSE_CONTEXT');
});
test('legacy houses_pos is not silently substituted',()=>{
  assert.throws(()=>placeNatalBodiesInHouses({chart,birthTimeKnown:true,
    cuspSet:{...cuspSet,metadata:{...cuspSet.metadata,placementMethod:'LEGACY_HOUSES_POS'}}}),
    e=>e.code==='UNSUPPORTED_HOUSE_PLACEMENT');
});
test('malformed body identifiers are rejected',()=>{
  assert.throws(()=>placeNatalBodiesInHouses({birthTimeKnown:true,cuspSet,
    chart:{...chart,bodies:{Sun:{name:'Moon',longitudeDeg:345}}}}),
    e=>e.code==='INVALID_POINT');
});

test('reserved JavaScript body identifiers remain own placement keys',()=>{
  const bodies=Object.create(null);
  for (const [name, longitudeDeg] of [['__proto__',345],['constructor',15],['toString',344.9]])
    bodies[name]={name,longitudeDeg};
  const result=placeNatalBodiesInHouses({
    chart:{...chart,bodies},cuspSet,birthTimeKnown:true
  });
  assert.deepEqual(Object.keys(result.placements),['__proto__','constructor','toString']);
  assert.equal(Object.getPrototypeOf(result.placements),null);
  assert.equal(result.placements.__proto__.house,1);
  assert.equal(result.placements.constructor.house,2);
  assert.equal(result.placements.toString.house,12);
  assert.equal(Object.isFrozen(result.placements),true);
});
test('nonfinite or nonnumeric body longitude fails with INVALID_POINT',()=>{
  for (const longitudeDeg of [NaN,Infinity,-Infinity,'15']) {
    assert.throws(()=>placeNatalBodiesInHouses({
      chart:{...chart,bodies:{Sun:{name:'Sun',longitudeDeg}}},
      cuspSet,birthTimeKnown:true
    }),e=>e.code==='INVALID_POINT');
  }
});

test('malformed placement options fail with typed INVALID_ARGUMENT',()=>{
  for (const input of [null, false, 0, 'invalid', [], 42]) {
    assert.throws(()=>placeNatalBodiesInHouses(input),
      e=>e.name==='AstrologyError' && e.code==='INVALID_ARGUMENT');
  }
});


test('rejects array chart containers before inspecting body positions',()=>{
  const arrayChart = [];
  arrayChart.bodies = chart.bodies;
  assert.throws(()=>placeNatalBodiesInHouses({chart:arrayChart,cuspSet,birthTimeKnown:true}),
    e=>e.name==='AstrologyError' && e.code==='INVALID_ARGUMENT');
});


test('rejects malformed individual house-placement bodies with typed INVALID_POINT',()=>{
  const invalidBodies = [null, undefined, 1, 'Sun', true, [], Object.assign([], {name:'Sun', longitudeDeg:345})];
  for (const body of invalidBodies) {
    assert.throws(() => placeNatalBodiesInHouses({
      chart:{...chart,bodies:{Sun:body}}, cuspSet, birthTimeKnown:true
    }), error => error instanceof Error && error.name === 'AstrologyError' && error.code === 'INVALID_POINT');
  }
});
