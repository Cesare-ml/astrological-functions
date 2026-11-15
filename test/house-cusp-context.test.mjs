import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspContext } from '../src/index.mjs';
const p={engineVersion:'rust-test',kernelSetId:'kernel-test',timeModel:'TDB-test'};
const chart={datetimeUtc:'2026-11-11T04:00:00Z',latitudeDeg:44,longitudeDegEast:12,ephemerisProvenance:p};
const cuspSet={houseSystem:'VEHLOW',calculationProfile:'CANONICAL_V1',
  cusps:[345,15,45,75,105,135,165,195,225,255,285,315],
  metadata:{houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL',
    datetimeUtc:chart.datetimeUtc,latitudeDeg:44,longitudeDegEast:12,ephemerisProvenance:{...p}}};
test('matching context returns immutable defensive snapshot',()=>{
  const result=validateHouseCuspContext({chart,cuspSet});
  assert.equal(result.cusps[0],345);
  assert.equal(Object.isFrozen(result.cusps),true);
  assert.equal(Object.isFrozen(result.metadata.ephemerisProvenance),true);
  assert.notStrictEqual(result.metadata.ephemerisProvenance,cuspSet.metadata.ephemerisProvenance);
});
test('date, location and provenance mismatches fail closed',()=>{
  for(const metadata of [
    {...cuspSet.metadata,datetimeUtc:'2026-11-11T05:00:00Z'},
    {...cuspSet.metadata,latitudeDeg:45},
    {...cuspSet.metadata,longitudeDegEast:13},
    {...cuspSet.metadata,ephemerisProvenance:{...p,kernelSetId:'other'}}
  ]) assert.throws(()=>validateHouseCuspContext({chart,cuspSet:{...cuspSet,metadata}}),
    e=>e.code==='INCOMPATIBLE_HOUSE_CONTEXT');
});
test('missing provenance and unsupported methods fail closed',()=>{
  assert.throws(()=>validateHouseCuspContext({chart:{...chart,ephemerisProvenance:{...p,timeModel:null}},cuspSet}),
    e=>e.code==='INVALID_HOUSE_METADATA');
  assert.throws(()=>validateHouseCuspContext({chart,cuspSet:{...cuspSet,metadata:{...cuspSet.metadata,placementMethod:'LEGACY_HOUSES_POS'}}}),
    e=>e.code==='UNSUPPORTED_HOUSE_PLACEMENT');
});
