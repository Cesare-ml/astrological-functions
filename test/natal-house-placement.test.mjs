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
