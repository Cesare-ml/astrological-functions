import test from 'node:test';
import assert from 'node:assert/strict';
import {locateLongitudeInHouses} from '../src/index.mjs';
import {calculatePorphyryHouseCusps} from '../src/porphyry-houses.mjs';
import {
  calculatePullenSinusoidalDeltaHouseCusps as delta,
  calculatePullenSinusoidalRatioHouseCusps as ratio,
} from '../src/pullen-house-cusps.mjs';

const source = {
  engineVersion:'TEST', kernelSetId:'SYNTHETIC', timeModel:'MOCK',
  frame:'ECLIPTIC_OF_DATE', zodiac:'TROPICAL', observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:44,longitudeDegEast:11},
};
const request = {
  datetimeUtc:'2026-11-17T12:34:56Z', birthTimeKnown:true,
  ascendantDeg:10, midheavenDeg:285, source,
};
const isCode = expected => e => e?.name === 'AstrologyError' && e.code === expected;
const close = (actual, expected, tolerance=1e-9) =>
  assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} !== ${expected}`);

test('90 degree quadrants give precisely the Porphyry 30 degree cusps', () => {
  const input={...request,ascendantDeg:100,midheavenDeg:10};
  const expected=calculatePorphyryHouseCusps(input).cuspsDeg;
  for (const method of [delta,ratio]) {
    const result=method(input);
    assert.deepEqual(result.cuspsDeg,expected);
    assert.deepEqual(result.widthsDeg,Array(12).fill(30));
    assert.equal(result.placementPolicy,'STANDARD_HALF_OPEN_CUSPS');
  }
});

test('sinusoidal delta allocates half the quadrant deviation to its middle house', () => {
  const result=delta(request);
  assert.deepEqual(result.quadrantSpansDeg,[95,85,95,85]);
  assert.deepEqual(result.widthsDeg,[
    31.25,32.5,31.25,28.75,27.5,28.75,
    31.25,32.5,31.25,28.75,27.5,28.75,
  ]);
  assert.equal(result.cuspsDeg[0],10);
  assert.equal(result.cuspsDeg[3],105);
  assert.equal(result.cuspsDeg[6],190);
  assert.equal(result.cuspsDeg[9],285);
});

test('sinusoidal delta explicitly represents zero-width middle houses below 30 degree quadrants', () => {
  const result=delta({...request,ascendantDeg:10,midheavenDeg:200});
  assert.deepEqual(result.quadrantSpansDeg,[10,170,10,170]);
  assert.deepEqual(result.widthsDeg,[5,0,5,50,70,50,5,0,5,50,70,50]);
  assert.deepEqual(result.cuspsDeg,[10,15,15,20,70,140,190,195,195,200,250,320]);
  assert.deepEqual(result.zeroWidthHouseNumbers,[2,8]);
  assert.equal(result.placementPolicy,'ZERO_WIDTH_REQUIRES_EXPLICIT_METHOD');
  // The ordinary 12-interval locator correctly refuses repeated cusps.
  assert.throws(()=>locateLongitudeInHouses(10,result.cuspsDeg),isCode('INVALID_CUSPS'));
});

test('sinusoidal ratio solves Pullen r=2 width proportions on 5:32 quadrant sizes', () => {
  const x=180/37;
  const small=5*x;
  const result=ratio({...request,ascendantDeg:0,midheavenDeg:180+small});
  assert.deepEqual(result.zeroWidthHouseNumbers,[]);
  const expected=[2*x,x,2*x,8*x,16*x,8*x,2*x,x,2*x,8*x,16*x,8*x];
  result.widthsDeg.forEach((width,i)=>close(width,expected[i],1e-9));
  assert.equal(result.placementPolicy,'STANDARD_HALF_OPEN_CUSPS');
});

test('sinusoidal ratio keeps all widths positive, including sharply compressed quadrants', () => {
  const result=ratio({...request,ascendantDeg:10,midheavenDeg:200});
  assert.equal(result.zeroWidthHouseNumbers.length,0);
  assert.ok(result.widthsDeg.every(width=>width>0));
  assert.ok(result.widthsDeg[1]<result.widthsDeg[0]);
  assert.ok(result.widthsDeg[4]>result.widthsDeg[3]);
  for(let i=0;i<12;i++)
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
});

test('both methods conserve each quadrant and one full zodiac revolution', () => {
  for(const input of [request,{...request,ascendantDeg:10,midheavenDeg:200},
    {...request,ascendantDeg:350,midheavenDeg:265}]) {
    for(const method of [delta,ratio]) {
      const result=method(input);
      close(result.widthsDeg.reduce((a,b)=>a+b,0),360);
      for(let q=0;q<4;q++)
        close(result.widthsDeg.slice(q*3,q*3+3).reduce((a,b)=>a+b,0),result.quadrantSpansDeg[q]);
      assert.equal(result.cuspsDeg.length,12);
      assert.ok(result.cuspsDeg.every(cusp=>cusp>=0&&cusp<360));
    }
  }
});

test('deterministic 1200-quadrant sweep never creates negative ratio widths or loses total arc', () => {
  let seed=0x12345678;
  const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/0x100000000; };
  for(let n=0;n<1200;n++) {
    const q=0.01+random()*179.98;
    const input={...request,ascendantDeg:10,midheavenDeg:q-170};
    for(const method of [delta,ratio]) {
      const result=method(input);
      close(result.widthsDeg.reduce((a,b)=>a+b,0),360,1e-8);
      for(let i=0;i<4;i++)
        close(result.widthsDeg.slice(i*3,i*3+3).reduce((a,b)=>a+b,0),result.quadrantSpansDeg[i],1e-8);
      assert.ok(result.widthsDeg.every(w=>Number.isFinite(w)&&w>=0));
      if(method===ratio) {
        assert.ok(result.widthsDeg.every(w=>w>0));
        assert.equal(result.zeroWidthHouseNumbers.length,0);
      }
    }
  }
});

test('invalid birth time, provider provenance and degenerate axes fail closed', () => {
  for(const method of [delta,ratio]) {
    assert.throws(()=>method({...request,birthTimeKnown:false}),isCode('BIRTH_TIME_UNKNOWN'));
    assert.throws(()=>method({...request,birthTimeKnown:undefined}),isCode('INVALID_PULLEN_INPUT'));
    assert.throws(()=>method({...request,source:{...source,frame:'J2000'}}),isCode('INCOMPATIBLE_ANGLE_SOURCE'));
    assert.throws(()=>method({...request,source:{...source,observer:{latitudeDeg:90,longitudeDegEast:11}}}),isCode('INCOMPATIBLE_ANGLE_SOURCE'));
    assert.throws(()=>method({...request,midheavenDeg:190,ascendantDeg:10}),isCode('DEGENERATE_QUADRANTS'));
    assert.throws(()=>method({...request,datetimeUtc:'2026-02-30T00:00:00Z'}),isCode('INVALID_UTC'));
    assert.throws(()=>method({...request,houseSystem:'PLACIDUS'}),isCode('INVALID_PULLEN_INPUT'));
  }
});

test('all results are facts only, immutable and detached from caller source', () => {
  const mutableSource={...source,observer:{...source.observer}};
  for(const method of [delta,ratio]) {
    const result=method({...request,source:mutableSource});
    assert.equal(result.contract,'PullenHouseCusps');
    assert.equal(result.contractVersion,'0.1.0-experimental');
    assert.equal(result.interpretation,'FACTS_ONLY');
    for(const item of [result,result.cuspsDeg,result.widthsDeg,result.quadrantSpansDeg,
      result.zeroWidthHouseNumbers,result.source,result.source.observer])
      assert.equal(Object.isFrozen(item),true);
    assert.equal(Object.hasOwn(result,'scientificallyValidated'),false);
  }
  mutableSource.observer.latitudeDeg=40;
  assert.equal(delta(request).source.observer.latitudeDeg,44);
});
