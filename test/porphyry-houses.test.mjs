import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePorphyryHouseCusps} from '../src/porphyry-houses.mjs';
import {AstrologyError, locateLongitudeInHouses,normalize360} from '../src/index.mjs';

const source = Object.freeze({
  engineVersion:'SYNTHETIC_PROVIDER',kernelSetId:'SYNTHETIC_KERNEL',timeModel:'SYNTHETIC_UTC',
  frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
  observer:Object.freeze({latitudeDeg:44,longitudeDegEast:11}),
});
const base={datetimeUtc:'2026-11-12T20:30:00Z',ascendantDeg:100,midheavenDeg:10,source};
const build=patch=>calculatePorphyryHouseCusps({...base,...patch});
const rejects=(patch,code)=>assert.throws(()=>build(patch),e=>e instanceof AstrologyError&&e.code===code);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);

test('quadrant trisection on exact 90° quadrants yields 30° cusp sequence',()=>{
  const result=build({});
  assert.equal(result.cuspsDeg.length,12);
  const expected=[100,130,160,190,220,250,280,310,340,10,40,70];
  result.cuspsDeg.forEach((value,i)=>close(value,expected[i]));
  assert.deepEqual(result.quadrantSpansDeg,[90,90,90,90]);
});

test('nonuniform quadrant spans are trisected without equal-house fallback',()=>{
  const result=build({ascendantDeg:10,midheavenDeg:285});
  assert.deepEqual(result.quadrantSpansDeg,[95,85,95,85]);
  const expected=[10,10+95/3,10+2*95/3,105,105+85/3,105+2*85/3,
    190,190+95/3,190+2*95/3,285,285+85/3,285+2*85/3];
  result.cuspsDeg.forEach((v,i)=>close(v,expected[i]));
});

test('house axes obey canonical houses 1/4/7/10 and oppositions',()=>{
  const result=build({ascendantDeg:10,midheavenDeg:285});
  close(result.cuspsDeg[0],result.angles.ascendantDeg);
  close(result.cuspsDeg[3],result.angles.icDeg);
  close(result.cuspsDeg[6],result.angles.descendantDeg);
  close(result.cuspsDeg[9],result.angles.midheavenDeg);
  close(normalize360(result.angles.ascendantDeg+180),result.angles.descendantDeg);
  close(normalize360(result.angles.midheavenDeg+180),result.angles.icDeg);
});

test('wrap near 360 degrees remains forward ordered',()=>{
  const result=build({ascendantDeg:350,midheavenDeg:265});
  assert.equal(result.cuspsDeg[0],350);
  assert.equal(result.cuspsDeg[3],85);
  assert.equal(result.cuspsDeg[6],170);
  assert.equal(result.cuspsDeg[9],265);
  assert.ok(result.cuspsDeg.every(x=>x>=0&&x<360));
  close(result.quadrantSpansDeg.reduce((a,b)=>a+b),360);
});

test('longitudes supplied outside a revolution are normalized consistently',()=>{
  const a=build({ascendantDeg:-10,midheavenDeg:265});
  const b=build({ascendantDeg:350,midheavenDeg:-95});
  assert.deepEqual(a.cuspsDeg,b.cuspsDeg);
});

test('exact cusps belong to the house starting at each cusp',()=>{
  const result=build({ascendantDeg:10,midheavenDeg:285});
  for(let i=0;i<12;i++) {
    const place=locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg);
    assert.equal(place.house,i+1);
  }
});

test('position just before house 1 is house 12 even across 360',()=>{
  const result=build({ascendantDeg:10,midheavenDeg:285});
  assert.equal(locateLongitudeInHouses(9.999,result.cuspsDeg).house,12);
  assert.equal(locateLongitudeInHouses(10,result.cuspsDeg).house,1);
});

test('invalid or missing angles are rejected rather than assumed',()=>{
  for(const ascendantDeg of [undefined,null,NaN,Infinity,'100'])rejects({ascendantDeg},'INVALID_ANGLES');
  for(const midheavenDeg of [undefined,null,NaN,-Infinity,'10'])rejects({midheavenDeg},'INVALID_ANGLES');
});

test('degenerate/inverted axes fail closed instead of fabricating houses',()=>{
  rejects({ascendantDeg:100,midheavenDeg:280},'DEGENERATE_QUADRANTS');
  rejects({ascendantDeg:100,midheavenDeg:100},'DEGENERATE_QUADRANTS');
  rejects({ascendantDeg:100,midheavenDeg:200},'DEGENERATE_QUADRANTS');
});

test('polar observer requires explicit upstream astronomy policy',()=>{
  for(const latitudeDeg of [-90,90]) {
    rejects({source:{...source,observer:{latitudeDeg,longitudeDegEast:11}}},'INCOMPATIBLE_ANGLE_SOURCE');
  }
  assert.equal(build({source:{...source,observer:{latitudeDeg:89.999,longitudeDegEast:11}}}).cuspsDeg.length,12);
});

test('missing versioned provider or unsupported frame/zodiac fails closed',()=>{
  for (const patch of [
    {engineVersion:''},{kernelSetId:' '},{timeModel:null},{frame:'ECLIPTIC_J2000'},
    {zodiac:'SIDEREAL'},{observerType:'GEOCENTRIC'},
    {observer:{latitudeDeg:44,longitudeDegEast:181}},
    {observer:{latitudeDeg:NaN,longitudeDegEast:11}},
  ]) rejects({source:{...source,...patch}},'INCOMPATIBLE_ANGLE_SOURCE');
  rejects({source:null},'INCOMPATIBLE_ANGLE_SOURCE');
});

test('invalid civil instants and timezone offsets are rejected',()=>{
  for (const datetimeUtc of [undefined,'2026-02-29T20:30:00Z','2026-11-12T20:30Z',
    '2026-11-12T20:30:00+00:00','2026-11-12T24:00:00Z',
    '2026-11-12T20:30:00.1234Z'])rejects({datetimeUtc},'INVALID_UTC');
  assert.equal(build({datetimeUtc:'2024-02-29T12:00:00.2Z'}).datetimeUtc,
    '2024-02-29T12:00:00.200Z');
});

test('snapshot and arrays cannot be mutated by the caller',()=>{
  const copied={...source,observer:{latitudeDeg:44,longitudeDegEast:11}};
  const result=build({source:copied});
  copied.observer.latitudeDeg=30;
  assert.equal(result.source.observer.latitudeDeg,44);
  for (const x of [result,result.source,result.source.observer,result.angles,result.cuspsDeg,result.quadrantSpansDeg])
    assert.equal(Object.isFrozen(x),true);
  assert.throws(()=>{result.cuspsDeg[0]=0},TypeError);
});

test('facts-only output disclaims scientific validation and does not assign interpretation',()=>{
  const result=build({});
  assert.equal(result.houseSystem,'PORPHYRY');
  assert.equal(result.contract,'PorphyryHouseCusps');
  assert.equal(result.contractVersion,'0.1.0-experimental');
  assert.equal(result.interpretation,'FACTS_ONLY');
  assert.equal(result.validation,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(Object.hasOwn(result,'planetaryInterpretations'),false);
});

test('invalid outer request fails with typed error',()=>{
  for(const req of [null,undefined,[],{},false]) {
    assert.throws(()=>calculatePorphyryHouseCusps(req),e=>e instanceof AstrologyError);
  }
});
