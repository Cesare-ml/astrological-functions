import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {calculateHouseSet} from 'astrological-functions/house-set';

// Uses the VirgoStars-Ephemeris Node binding as the house-angle provider
// (ARMC, true obliquity, Ascendant and Midheaven from the Rust core), with the
// fixtures already recorded in house-de441-integration.test.mjs. The binding is
// loaded only when VIRGOSTARS_EPHEMERIS_NODE_BINDING names its index.js; the
// binding itself needs no ephemeris file for this (sidereal time and obliquity
// are computed analytically). UTC=UT1 is a test approximation, not a default.
// TT-UT1 of 69.2 s is a test value for 2026.
const fixtures=[
  {datetimeUtc:'2026-11-10T00:00:00Z',ut1JulianDay:2461354.5,latitudeDeg:41.9028,longitudeDegEast:12.4964,
   expected:{vehlow:[142.8264147901,172.8264147901,202.8264147901,232.8264147901,262.8264147901,292.8264147901,322.8264147901,352.8264147901,22.8264147901,52.8264147901,82.8264147901,112.8264147901],
     porphyry:[157.8264147901,186.4436990138,215.0609832376,243.6782674613,275.0609832376,306.4436990138,337.8264147901,6.4436990138,35.0609832376,63.6782674613,95.0609832376,126.4436990138],
     placidus:[157.8264147901,181.4426149268,210.2425544546,243.6782674613,278.4472921396,310.2873937920,337.8264147901,1.4426149268,30.2425544546,63.6782674613,98.4472921396,130.2873937920],
     regiomontanus:[157.8264147901,181.3589363779,208.6885396155,243.6782674613,281.5980511854,312.8949989264,337.8264147901,1.3589363779,28.6885396155,63.6782674613,101.5980511854,132.8949989264],
     koch:[157.8264147901,186.5437676119,215.1239847459,243.6782674613,279.9128619529,309.4022174201,337.8264147901,6.5437676119,35.1239847459,63.6782674613,99.9128619529,129.4022174201]}},
  {datetimeUtc:'2026-07-15T00:00:00Z',ut1JulianDay:2461236.5,latitudeDeg:-33.8688,longitudeDegEast:151.2093,
   expected:{vehlow:[155.9140906510,185.9140906510,215.9140906510,245.9140906510,275.9140906510,305.9140906510,335.9140906510,5.9140906510,35.9140906510,65.9140906510,95.9140906510,125.9140906510],
     porphyry:[170.9140906510,202.1292649247,233.3444391985,264.5596134722,293.3444391985,322.1292649247,350.9140906510,22.1292649247,53.3444391985,84.5596134722,113.3444391985,142.1292649247],
     placidus:[170.9140906510,211.7425691199,241.0195915489,264.5596134722,287.2917447493,313.8832055321,350.9140906510,31.7425691199,61.0195915489,84.5596134722,107.2917447493,133.8832055321],
     regiomontanus:[170.9140906510,213.9239017736,243.4370326620,264.5596134722,284.7731005291,311.0950224567,350.9140906510,33.9239017736,63.4370326620,84.5596134722,104.7731005291,131.0950224567],
     koch:[170.9140906510,207.7007242463,239.1926931076,264.5596134722,287.8638171195,316.1255925627,350.9140906510,27.7007242463,59.1926931076,84.5596134722,107.8638171195,136.1255925627]}},
];
const bindingPath=process.env.VIRGOSTARS_EPHEMERIS_NODE_BINDING;
test('Rust house-angle provider reproduces all recorded cusps to 1e-5 degree',{skip:bindingPath?false:'VIRGOSTARS_EPHEMERIS_NODE_BINDING is not set'},()=>{
  const require=createRequire(import.meta.url);
  const {createHouseAngleProvider}=require(bindingPath);
  const provider=createHouseAngleProvider();
  for(const {expected,...fixture} of fixtures){
    const ttJulianDay=fixture.ut1JulianDay+69.2/86400;
    const result=calculateHouseSet({...fixture,birthTimeKnown:true,ttJulianDay,engineVersion:'node-binding-experimental',kernelSetId:'not-applicable-sidereal-time-only',timeModel:'UT1_EQUALS_UTC_TEST_ASSUMPTION'},provider);
    for(const [system,reference] of Object.entries(expected)){
      const cusps=result.houses[system].cuspsDeg;
      assert.equal(cusps.length,12);
      for(let i=0;i<12;i++){
        const delta=Math.abs(((cusps[i]-reference[i]+540)%360)-180);
        assert.ok(delta<0.00001,`${fixture.datetimeUtc} ${system} cusp ${i+1}: ${delta} deg`);
      }
    }
  }
});

test('the provider is frozen, fails closed at the poles and keeps UT1/TT explicit',{skip:bindingPath?false:'VIRGOSTARS_EPHEMERIS_NODE_BINDING is not set'},()=>{
  const require=createRequire(import.meta.url);
  const provider=require(bindingPath).createHouseAngleProvider();
  assert.ok(Object.isFrozen(provider));
  const angles=provider.calculateHouseAngles({ut1JulianDay:2461354.5,ttJulianDay:2461354.5008,latitudeDeg:41.9028,longitudeDegEast:12.4964});
  assert.equal(angles.model,'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME');
  assert.equal(angles.ut1JulianDay,2461354.5);
  assert.equal(angles.ttJulianDay,2461354.5008);
  assert.ok(angles.armcDeg>=0&&angles.armcDeg<360);
  for(const latitudeDeg of [90,-90,Number.NaN]) assert.throws(()=>provider.calculateHouseAngles({ut1JulianDay:2461354.5,ttJulianDay:2461354.5008,latitudeDeg,longitudeDegEast:0}),error=>error.code==='E_RANGE');
  assert.throws(()=>provider.calculateHouseAngles({ut1JulianDay:2300000,ttJulianDay:2300000,latitudeDeg:10,longitudeDegEast:10}),error=>error.code==='E_RANGE');
});
