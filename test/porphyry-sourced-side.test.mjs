import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPorphyryToPinnedComparison} from '../src/porphyry-sourced-side.mjs';

const datetimeUtc='2026-11-12T22:15:00Z';
const source={engineVersion:'RUST_TEST',kernelSetId:'SYNTHETIC',timeModel:'TEST_UTC',
  frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:44,longitudeDegEast:11}};
const declaredSource={datetimeUtc,frame:'ECLIPTIC_OF_DATE',
  longitudeBasis:{type:'TROPICAL'},observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:44,longitudeDegEast:11},engineVersion:'RUST_TEST',
  kernelSetId:'SYNTHETIC',timeModel:'TEST_UTC',corrections:'APPARENT',
  calculationProfileId:'CANONICAL_V1'};
const produced={contract:'PorphyryHouseCusps',contractVersion:'0.1.0-experimental',
  houseSystem:'PORPHYRY',datetimeUtc,
  angles:{ascendantDeg:10,icDeg:105,descendantDeg:190,midheavenDeg:285},
  cuspsDeg:[10,41.666666666666664,73.33333333333333,105,
    133.33333333333334,161.66666666666666,190,221.66666666666666,
    253.33333333333331,285,313.3333333333333,341.6666666666667],
  source,interpretation:'FACTS_ONLY',quadrantSpansDeg:[95,85,95,85],
  validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED'};
const input={birthTimeKnown:true,produced,declaredSource};
const adapt=patch=>adaptPorphyryToPinnedComparison({...input,...patch});
const err=code=>e=>e?.name==='AstrologyError'&&e.code===code;

test('adapted Porphyry side exactly matches pinned comparator side shape',()=>{
  const side=adapt();
  assert.deepEqual(Object.keys(side).sort(),['snapshot','source']);
  assert.equal(side.snapshot.houseSystem,'PORPHYRY');
  assert.equal(side.snapshot.provenanceStatus,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(side.snapshot.longitudeBasis.type,'TROPICAL');
  assert.equal(side.snapshot.birthTimeKnown,true);
  assert.equal(side.source.corrections,'APPARENT');
  assert.equal(side.source.calculationProfileId,'CANONICAL_V1');
  assert.equal(side.snapshot.cuspsDeg[0],10);
});

test('does not invent missing correction or calculation profile',()=>{
  for(const key of ['corrections','calculationProfileId']) {
    const raw={...declaredSource};delete raw[key];
    assert.throws(()=>adapt({declaredSource:raw}),err('INVALID_SOURCE_CONTEXT'));
  }
});

test('source mismatches fail, rather than overwriting producer facts',()=>{
  for(const [key,value] of [['engineVersion','WRONG'],['kernelSetId','OTHER'],
    ['timeModel','UT1'],['datetimeUtc','2026-11-12T22:15:01Z']]) {
    assert.throws(()=>adapt({declaredSource:{...declaredSource,[key]:value}}),
      err('INCOMPATIBLE_SOURCE_CONTEXT'));
  }
});

test('observer mismatches and invalid observer positions are rejected',()=>{
  assert.throws(()=>adapt({declaredSource:{...declaredSource,
    observer:{latitudeDeg:45,longitudeDegEast:11}}}),err('INCOMPATIBLE_SOURCE_CONTEXT'));
  for(const observer of [{latitudeDeg:90,longitudeDegEast:11},
    {latitudeDeg:NaN,longitudeDegEast:11},{latitudeDeg:44,longitudeDegEast:181}]) {
    assert.throws(()=>adapt({declaredSource:{...declaredSource,observer}}),err('INVALID_SOURCE_CONTEXT'));
  }
});

test('sidereal and geometric contexts cannot be relabeled as tropical apparent',()=>{
  for(const change of [{corrections:'GEOMETRIC'},
    {longitudeBasis:{type:'SIDEREAL',ayanamsaId:'NAMED'}},
    {frame:'J2000'}, {observerType:'GEOCENTRIC'}]) {
    assert.throws(()=>adapt({declaredSource:{...declaredSource,...change}}),err('INVALID_SOURCE_CONTEXT'));
  }
  assert.throws(()=>adapt({produced:{...produced,source:{...source,zodiac:'SIDEREAL'}}}),
    err('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('unsupported producers and unvalidated statuses fail closed',()=>{
  for(const data of [{...produced,houseSystem:'VEHLOW'},
    {...produced,contractVersion:'999'},
    {...produced,validation:'SCIENTIFICALLY_VERIFIED'}]) {
    assert.throws(()=>adapt({produced:data}),err('INVALID_PORPHYRY_PRODUCER'));
  }
});

test('birth time must be explicitly known',()=>{
  for(const birthTimeKnown of [undefined,false,null]) {
    assert.throws(()=>adapt({birthTimeKnown}),err('BIRTH_TIME_UNKNOWN'));
  }
});

test('missing UTC or unreal calendar dates fail, even when both declarations match',()=>{
  for(const date of ['2026-02-29T22:15:00Z','2026-11-31T22:15:00Z',
    '2026-11-12T22:15:00+00:00']) {
    assert.throws(()=>adapt({declaredSource:{...declaredSource,datetimeUtc:date},
      produced:{...produced,datetimeUtc:date}}),err('INVALID_UTC'));
  }
});

test('missing/duplicate/sparse cusps fail, including when no planet is supplied',()=>{
  for(const cuspsDeg of [[10],Array(12).fill(10),[...produced.cuspsDeg.slice(0,11),NaN],
    [...produced.cuspsDeg.slice(0,11),,]]) {
    assert.throws(()=>adapt({produced:{...produced,cuspsDeg}}),
      e=>e?.name==='AstrologyError'&&e.code==='INVALID_CUSPS');
  }
});

test('inconsistent quadrant anchors or swapped axes fail closed',()=>{
  assert.throws(()=>adapt({produced:{...produced,
    angles:{...produced.angles,icDeg:100}}}),err('INVALID_PORPHYRY_ANGLES'));
  assert.throws(()=>adapt({produced:{...produced,
    cuspsDeg:[...produced.cuspsDeg.slice(0,3),106,...produced.cuspsDeg.slice(4)]}}),
    err('INVALID_PORPHYRY_ANGLES'));
});

test('output deeply snapshots source and cusp values without mutation',()=>{
  const local=structuredClone(produced);
  const context=structuredClone(declaredSource);
  const side=adapt({produced:local,declaredSource:context});
  local.cuspsDeg[0]=99;
  context.observer.latitudeDeg=10;
  assert.equal(side.snapshot.cuspsDeg[0],10);
  assert.equal(side.source.observer.latitudeDeg,44);
  for(const item of [side,side.snapshot,side.snapshot.cuspsDeg,side.source,
    side.source.observer,side.source.longitudeBasis]) assert.ok(Object.isFrozen(item));
  assert.throws(()=>{side.source.engineVersion='MODIFIED'},TypeError);
});

test('rejects malformed outer arguments and unexpected fields',()=>{
  for(const value of [null,undefined,[],{...input,legacy:'egizia'}]) {
    assert.throws(()=>adaptPorphyryToPinnedComparison(value),err('INVALID_PORPHYRY_ADAPTER'));
  }
  assert.throws(()=>adapt({produced:null}),err('INVALID_PORPHYRY_PRODUCER'));
  assert.throws(()=>adapt({declaredSource:{...declaredSource,unknown:42}}),err('INVALID_SOURCE_CONTEXT'));
});

test('unknown producer metadata cannot silently override declared apparent context',()=>{
  assert.throws(()=>adapt({produced:{...produced,source:{...source,corrections:'GEOMETRIC'}}}),
    err('INVALID_PORPHYRY_PRODUCER'));
  assert.throws(()=>adapt({produced:{...produced,interpretation:'PREDICTIONS'}}),
    err('INVALID_PORPHYRY_PRODUCER'));
  assert.throws(()=>adapt({produced:{...produced,privateUserId:'not-allowed'}}),
    err('INVALID_PORPHYRY_PRODUCER'));
});

test('upstream quadrant spans, axes and normalized longitudes cannot be fabricated',()=>{
  assert.throws(()=>adapt({produced:{...produced,quadrantSpansDeg:[90,90,90,90]}}),
    err('INVALID_PORPHYRY_ANGLES'));
  assert.throws(()=>adapt({produced:{...produced,angles:{...produced.angles,ascendantDeg:370}}}),
    err('INVALID_PORPHYRY_ANGLES'));
  assert.throws(()=>adapt({produced:{...produced,cuspsDeg:[370,...produced.cuspsDeg.slice(1)]}}),
    err('INVALID_CUSPS'));
});
